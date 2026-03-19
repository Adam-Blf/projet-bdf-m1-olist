"""
feeder.py - Bronze ingestion layer

Reads Olist Brazilian E-Commerce CSVs from a local source directory and writes
them to the HDFS /raw layer as parquet partitioned by ingestion date
(year=YYYY/month=MM/day=DD). All paths are passed via spark-submit arguments,
nothing is hardcoded. Logs are emitted both to stdout and to a .txt file.

Usage example (run from spark-master container):
  /spark/bin/spark-submit \\
    --master spark://spark-master:7077 \\
    --deploy-mode client \\
    --executor-cores 2 --total-executor-cores 4 \\
    /opt/pipeline/feeder.py \\
      --source-dir file:///source/olist \\
      --raw-base hdfs://namenode:9000/data/raw/olist \\
      --log-file /opt/pipeline/logs/feeder.txt \\
      --ingestion-date 2026-03-22

Authors: Adam Beloucif, Emilien Morice (M1 DE&IA - EFREI - 2026)
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, date
from typing import Dict

from pyspark.sql import SparkSession, DataFrame, functions as F


OLIST_TABLES: Dict[str, str] = {
    "customers":            "olist_customers_dataset.csv",
    "geolocation":          "olist_geolocation_dataset.csv",
    "order_items":          "olist_order_items_dataset.csv",
    "order_payments":       "olist_order_payments_dataset.csv",
    "order_reviews":        "olist_order_reviews_dataset.csv",
    "orders":               "olist_orders_dataset.csv",
    "products":             "olist_products_dataset.csv",
    "sellers":              "olist_sellers_dataset.csv",
    "category_translation": "product_category_name_translation.csv",
}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Olist bronze feeder")
    p.add_argument("--source-dir",     required=True,
                   help="Source directory holding the Olist CSV files (file:/// or hdfs://)")
    p.add_argument("--raw-base",       required=True,
                   help="Destination base path for the /raw layer (e.g. hdfs://namenode:9000/data/raw/olist)")
    p.add_argument("--log-file",       required=True,
                   help="Path to the .txt log file written by the driver")
    p.add_argument("--ingestion-date", default=date.today().isoformat(),
                   help="Logical ingestion date YYYY-MM-DD (default: today)")
    p.add_argument("--repartition",    type=int, default=4,
                   help="Number of output parquet partitions per table (default: 4)")
    p.add_argument("--tables",         default="ALL",
                   help="Comma separated list of tables to ingest, or ALL (default: ALL)")
    return p.parse_args()


def configure_logger(log_file: str) -> logging.Logger:
    os.makedirs(os.path.dirname(log_file) or ".", exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s :: %(message)s")
    log = logging.getLogger("feeder")
    log.setLevel(logging.INFO)
    log.handlers.clear()

    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setFormatter(fmt)
    log.addHandler(fh)

    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    log.addHandler(sh)
    return log


def build_spark() -> SparkSession:
    return (
        SparkSession.builder
        .appName("olist-feeder")
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.sql.parquet.compression.codec", "snappy")
        .getOrCreate()
    )


def read_csv(spark: SparkSession, path: str) -> DataFrame:
    return (
        spark.read
        .option("header", "true")
        .option("inferSchema", "true")
        .option("multiLine", "true")
        .option("escape", '"')
        .option("encoding", "UTF-8")
        .csv(path)
    )


def ingest_table(spark: SparkSession, log: logging.Logger,
                 table: str, source_path: str, raw_base: str,
                 ingest_dt: date, repartition: int) -> int:
    log.info(f"--- Ingesting table '{table}' from {source_path} ---")
    df = read_csv(spark, source_path)

    df_dated = (
        df.withColumn("year",  F.lit(ingest_dt.year))
          .withColumn("month", F.lit(ingest_dt.month))
          .withColumn("day",   F.lit(ingest_dt.day))
          .withColumn("_ingestion_ts", F.current_timestamp())
    )

    # cache() before count + write to avoid re-scanning the CSV (visible in Spark UI)
    df_dated.cache()
    n = df_dated.count()
    log.info(f"Table '{table}': {n} rows read, columns = {df_dated.columns}")

    out_path = f"{raw_base.rstrip('/')}/{table}"
    log.info(f"Writing parquet to {out_path} partitioned by year/month/day "
             f"with repartition({repartition})")

    (
        df_dated.repartition(repartition)
        .write
        .mode("append")
        .partitionBy("year", "month", "day")
        .parquet(out_path)
    )
    df_dated.unpersist()
    log.info(f"Table '{table}' ingestion OK ({n} rows)")
    return n


def main() -> None:
    args = parse_args()
    log = configure_logger(args.log_file)

    log.info("=" * 70)
    log.info("Olist FEEDER (bronze layer) - starting")
    log.info(f"source_dir     = {args.source_dir}")
    log.info(f"raw_base       = {args.raw_base}")
    log.info(f"ingestion_date = {args.ingestion_date}")
    log.info(f"repartition    = {args.repartition}")
    log.info(f"tables         = {args.tables}")
    log.info("=" * 70)

    try:
        ingest_dt = datetime.strptime(args.ingestion_date, "%Y-%m-%d").date()
    except ValueError as e:
        log.error(f"Bad --ingestion-date '{args.ingestion_date}': {e}")
        sys.exit(2)

    if args.tables.upper() == "ALL":
        targets = OLIST_TABLES
    else:
        wanted = {t.strip() for t in args.tables.split(",") if t.strip()}
        unknown = wanted - set(OLIST_TABLES)
        if unknown:
            log.error(f"Unknown tables requested: {unknown}. Known: {list(OLIST_TABLES)}")
            sys.exit(2)
        targets = {k: v for k, v in OLIST_TABLES.items() if k in wanted}

    spark = build_spark()
    log.info(f"Spark application id = {spark.sparkContext.applicationId}")
    log.info(f"Spark UI url         = {spark.sparkContext.uiWebUrl}")

    grand_total = 0
    failures = []
    for table, fname in targets.items():
        src = f"{args.source_dir.rstrip('/')}/{fname}"
        try:
            grand_total += ingest_table(
                spark, log, table, src, args.raw_base, ingest_dt, args.repartition,
            )
        except Exception as exc:
            log.error(f"Table '{table}' ingestion FAILED: {exc}", exc_info=True)
            failures.append(table)

    log.info("=" * 70)
    log.info(f"Feeder finished. Total rows ingested = {grand_total}")
    if failures:
        log.error(f"FAILED tables: {failures}")
        spark.stop()
        sys.exit(1)
    log.info("All tables ingested successfully.")
    log.info("=" * 70)
    spark.stop()


if __name__ == "__main__":
    main()
