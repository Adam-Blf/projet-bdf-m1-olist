"""
processor.py - Silver layer processing

Reads bronze parquet from /raw/olist/{table}/year=YYYY/month=MM/day=DD/, applies
five validation rules, performs joins between orders / customers / items /
products / sellers / payments / reviews, computes window-function-based KPIs
(order rank by customer, monthly seller revenue rank by state, etc.) and
writes the result back to:

  - HDFS /silver/olist/orders_enriched/year=YYYY/month=MM/day=DD/  (parquet)
  - Hive table  default.silver_orders_enriched

cache() / persist() are used on the joined dataframe so that the downstream
window operations and the final write don't re-scan the parquet bronze.

Usage example:
  /spark/bin/spark-submit \\
    --master spark://spark-master:7077 \\
    --deploy-mode client \\
    --conf spark.sql.warehouse.dir=hdfs://namenode:9000/user/hive/warehouse \\
    --conf spark.hadoop.hive.metastore.uris=thrift://hive-metastore:9083 \\
    --executor-cores 2 --total-executor-cores 4 \\
    /opt/pipeline/processor.py \\
      --raw-base hdfs://namenode:9000/data/raw/olist \\
      --silver-base hdfs://namenode:9000/data/silver/olist \\
      --hive-db default \\
      --hive-table silver_orders_enriched \\
      --ingestion-date 2026-03-22 \\
      --log-file /opt/pipeline/logs/processor.txt

Authors: Adam Beloucif, Emilien Morice (M1 DE&IA - EFREI - 2026)
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, date

from pyspark.sql import SparkSession, DataFrame, Window, functions as F
from pyspark.storagelevel import StorageLevel


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Olist silver processor")
    p.add_argument("--raw-base",       required=True)
    p.add_argument("--silver-base",    required=True)
    p.add_argument("--hive-db",        default="default")
    p.add_argument("--hive-table",     default="silver_orders_enriched")
    p.add_argument("--ingestion-date", default=date.today().isoformat())
    p.add_argument("--log-file",       required=True)
    p.add_argument("--repartition",    type=int, default=8)
    return p.parse_args()


def configure_logger(log_file: str) -> logging.Logger:
    os.makedirs(os.path.dirname(log_file) or ".", exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s :: %(message)s")
    log = logging.getLogger("processor")
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
        .appName("olist-processor")
        .enableHiveSupport()
        .config("spark.sql.shuffle.partitions", "16")
        .config("spark.sql.parquet.compression.codec", "snappy")
        .config("spark.sql.legacy.timeParserPolicy", "LEGACY")
        .getOrCreate()
    )


def read_raw(spark: SparkSession, raw_base: str, table: str,
             ingest_dt: date) -> DataFrame:
    """Read a bronze table for a single ingestion partition."""
    path = (f"{raw_base.rstrip('/')}/{table}"
            f"/year={ingest_dt.year}/month={ingest_dt.month}/day={ingest_dt.day}")
    return spark.read.parquet(path)


def apply_validations(log: logging.Logger, df: DataFrame) -> DataFrame:
    """Five business validation rules applied on the joined dataset.

    Rule 1: order_id must not be null.
    Rule 2: order_status must belong to the canonical Olist status set.
    Rule 3: price and freight_value must be > 0.
    Rule 4: review_score, when present, must be between 1 and 5.
    Rule 5: order_purchase_timestamp <= order_delivered_customer_date
            (when delivery date exists).
    """
    n_in = df.count()
    log.info(f"[VALIDATION] input rows = {n_in}")

    canonical_status = [
        "delivered", "shipped", "canceled", "unavailable",
        "invoiced", "processing", "created", "approved",
    ]

    cond_ok = (
        F.col("order_id").isNotNull()
        & F.col("order_status").isin(canonical_status)
        & (F.col("price") > 0)
        & (F.col("freight_value") >= 0)
        & (F.col("review_score").isNull()
           | F.col("review_score").between(1, 5))
        & (F.col("order_delivered_customer_date").isNull()
           | (F.col("order_purchase_timestamp")
              <= F.col("order_delivered_customer_date")))
    )

    rejected = df.filter(~cond_ok)
    n_rejected = rejected.count()
    log.info(f"[VALIDATION] rejected rows = {n_rejected}")
    if n_rejected > 0 and n_rejected < 50:
        log.info("[VALIDATION] sample rejected:")
        for r in rejected.limit(5).collect():
            log.info(f"  - {r.asDict()}")

    cleaned = df.filter(cond_ok)
    log.info(f"[VALIDATION] surviving rows = {n_in - n_rejected}")
    return cleaned


def main() -> None:
    args = parse_args()
    log = configure_logger(args.log_file)

    log.info("=" * 70)
    log.info("Olist PROCESSOR (silver layer) - starting")
    for k, v in vars(args).items():
        log.info(f"  arg {k:<15} = {v}")
    log.info("=" * 70)

    try:
        ingest_dt = datetime.strptime(args.ingestion_date, "%Y-%m-%d").date()
    except ValueError as e:
        log.error(f"Bad --ingestion-date: {e}")
        sys.exit(2)

    spark = build_spark()
    log.info(f"Spark application id = {spark.sparkContext.applicationId}")
    log.info(f"Spark UI url         = {spark.sparkContext.uiWebUrl}")

    try:
        log.info("Reading bronze tables ...")
        orders     = read_raw(spark, args.raw_base, "orders",         ingest_dt)
        customers  = read_raw(spark, args.raw_base, "customers",      ingest_dt)
        items      = read_raw(spark, args.raw_base, "order_items",    ingest_dt)
        products   = read_raw(spark, args.raw_base, "products",       ingest_dt)
        sellers    = read_raw(spark, args.raw_base, "sellers",        ingest_dt)
        payments   = read_raw(spark, args.raw_base, "order_payments", ingest_dt)
        reviews    = read_raw(spark, args.raw_base, "order_reviews",  ingest_dt)
        translation = read_raw(spark, args.raw_base, "category_translation", ingest_dt)

        # --- payments aggregation per order (one row per order) -----------------
        payments_agg = (
            payments.groupBy("order_id").agg(
                F.sum("payment_value").alias("payment_total"),
                F.max("payment_installments").alias("payment_installments_max"),
                F.first("payment_type").alias("payment_type_main"),
            )
        )

        # --- reviews aggregation per order (avg score if multiple reviews) ------
        reviews_agg = (
            reviews.groupBy("order_id").agg(
                F.avg("review_score").alias("review_score"),
                F.first("review_id").alias("review_id"),
            )
        )

        # --- products enriched with english category -----------------------------
        products_en = (
            products.join(translation, "product_category_name", "left")
                    .withColumnRenamed(
                        "product_category_name_english", "category_en")
                    .select(
                        "product_id", "product_category_name", "category_en",
                        "product_weight_g", "product_length_cm",
                        "product_height_cm", "product_width_cm",
                    )
        )

        # --- main join -----------------------------------------------------------
        log.info("Joining orders + items + products + sellers + customers + "
                 "payments + reviews ...")

        joined = (
            items
            .join(orders.drop("year", "month", "day", "_ingestion_ts"),
                  "order_id", "inner")
            .join(customers.drop("year", "month", "day", "_ingestion_ts"),
                  "customer_id", "left")
            .join(products_en, "product_id", "left")
            .join(sellers.drop("year", "month", "day", "_ingestion_ts"),
                  "seller_id", "left")
            .join(payments_agg, "order_id", "left")
            .join(reviews_agg,  "order_id", "left")
        )

        joined_validated = apply_validations(log, joined)

        # persist : the next two stages (window + write) reuse this dataframe ----
        joined_validated = joined_validated.persist(StorageLevel.MEMORY_AND_DISK)
        log.info("[CACHE] joined_validated persisted (MEMORY_AND_DISK)")

        # --- window functions ---------------------------------------------------
        log.info("Applying window functions ...")

        w_customer = (
            Window.partitionBy("customer_unique_id")
                  .orderBy(F.col("order_purchase_timestamp").asc())
        )
        w_seller_month = (
            Window.partitionBy(
                "seller_state",
                F.year("order_purchase_timestamp"),
                F.month("order_purchase_timestamp"),
            ).orderBy(F.col("price").desc())
        )

        enriched = (
            joined_validated
            .withColumn(
                "customer_order_seq",
                F.row_number().over(w_customer))
            .withColumn(
                "is_repeat_customer",
                F.when(F.col("customer_order_seq") > 1, F.lit(1))
                 .otherwise(F.lit(0)))
            .withColumn(
                "seller_state_month_rank",
                F.dense_rank().over(w_seller_month))
            .withColumn(
                "delivery_delay_days",
                F.datediff(
                    F.col("order_delivered_customer_date"),
                    F.col("order_purchase_timestamp")))
            .withColumn(
                "delivery_vs_estimate_days",
                F.datediff(
                    F.col("order_estimated_delivery_date"),
                    F.col("order_delivered_customer_date")))
            .withColumn(
                "order_year",  F.year("order_purchase_timestamp"))
            .withColumn(
                "order_month", F.month("order_purchase_timestamp"))
        )

        # --- aggregation just for logs (sanity check) ---------------------------
        agg = enriched.groupBy("order_status").agg(
            F.count("*").alias("n"),
            F.round(F.avg("review_score"), 2).alias("avg_review"),
            F.round(F.sum("price"),         2).alias("total_revenue"),
        )
        log.info("[AGG] orders by status:")
        for row in agg.collect():
            log.info(f"  - status={row['order_status']:<12} "
                     f"n={row['n']:<7} avg_review={row['avg_review']} "
                     f"total_revenue={row['total_revenue']}")

        # --- partitioning -------------------------------------------------------
        # silver is partitioned by ingestion year/month/day to mirror the bronze
        # contract from the spec (partitionBy year=/month=/day=).
        enriched_dated = (
            enriched
            .withColumn("year",  F.lit(ingest_dt.year))
            .withColumn("month", F.lit(ingest_dt.month))
            .withColumn("day",   F.lit(ingest_dt.day))
        )

        n_out = enriched_dated.count()
        log.info(f"[OUTPUT] silver row count = {n_out}")

        # --- write parquet to HDFS ---------------------------------------------
        out_path = f"{args.silver_base.rstrip('/')}/orders_enriched"
        log.info(f"Writing silver parquet to {out_path}")
        (
            enriched_dated.repartition(args.repartition)
            .write
            .mode("append")
            .partitionBy("year", "month", "day")
            .parquet(out_path)
        )

        # --- write Hive external table -----------------------------------------
        log.info(f"Registering Hive table {args.hive_db}.{args.hive_table}")
        spark.sql(f"CREATE DATABASE IF NOT EXISTS {args.hive_db}")
        (
            enriched_dated.write
            .mode("overwrite")
            .format("parquet")
            .partitionBy("year", "month", "day")
            .saveAsTable(f"{args.hive_db}.{args.hive_table}")
        )

        joined_validated.unpersist()
        log.info("=" * 70)
        log.info(f"Processor finished OK. {n_out} silver rows produced.")
        log.info("=" * 70)

    except Exception as exc:
        log.error(f"Processor FAILED: {exc}", exc_info=True)
        spark.stop()
        sys.exit(1)
    spark.stop()


if __name__ == "__main__":
    main()
