"""
datamart.py - Gold layer datamarts (relational, PostgreSQL)

Reads /silver/orders_enriched (or the Hive table silver_orders_enriched) and
materializes 4 business datamarts into a PostgreSQL database accessed via the
Spark JDBC connector:

  1) dm_seller_performance         : KPI seller (CA, AOV, score moyen, rank)
  2) dm_customer_satisfaction      : satisfaction score / retention par etat
  3) dm_product_category_revenue   : CA et volume par categorie traduite
  4) dm_monthly_sales_trends       : evolution mensuelle CA/orders/AOV

Toutes les ecritures sont faites en mode "overwrite" (idempotent).

Usage example:
  /spark/bin/spark-submit \\
    --master spark://spark-master:7077 \\
    --deploy-mode client \\
    --jars /opt/jars/postgresql-42.7.3.jar \\
    /opt/pipeline/datamart.py \\
      --silver-table default.silver_orders_enriched \\
      --jdbc-url jdbc:postgresql://postgres-datamart:5432/olist_dm \\
      --jdbc-user olist --jdbc-password olist \\
      --log-file /opt/pipeline/logs/datamart.txt

Authors: Adam Beloucif, Emilien Morice (M1 DE&IA - EFREI - 2026)
"""

from __future__ import annotations

import argparse
import logging
import os
import sys

from pyspark.sql import SparkSession, DataFrame, Window, functions as F


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Olist gold datamarts")
    p.add_argument("--silver-table",  default="default.silver_orders_enriched",
                   help="Hive table to read (alternative to --silver-path)")
    p.add_argument("--silver-path",   default=None,
                   help="HDFS parquet path (used if --silver-table missing)")
    p.add_argument("--jdbc-url",      required=True,
                   help="jdbc:postgresql://host:5432/db")
    p.add_argument("--jdbc-user",     required=True)
    p.add_argument("--jdbc-password", required=True)
    p.add_argument("--jdbc-driver",   default="org.postgresql.Driver")
    p.add_argument("--log-file",      required=True)
    return p.parse_args()


def configure_logger(log_file: str) -> logging.Logger:
    os.makedirs(os.path.dirname(log_file) or ".", exist_ok=True)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s :: %(message)s")
    log = logging.getLogger("datamart")
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
        .appName("olist-datamart")
        .enableHiveSupport()
        .config("spark.sql.shuffle.partitions", "16")
        .getOrCreate()
    )


def write_jdbc(df: DataFrame, table: str, args: argparse.Namespace,
               log: logging.Logger) -> None:
    log.info(f"[JDBC] writing {df.count()} rows to {table} on {args.jdbc_url}")
    (
        df.write
        .format("jdbc")
        .option("url",       args.jdbc_url)
        .option("dbtable",   table)
        .option("user",      args.jdbc_user)
        .option("password",  args.jdbc_password)
        .option("driver",    args.jdbc_driver)
        .option("truncate",  "true")
        .mode("overwrite")
        .save()
    )
    log.info(f"[JDBC] {table} write OK")


def dm_seller_performance(silver: DataFrame) -> DataFrame:
    """One row per seller + monthly KPIs + rank vs same-state sellers."""
    base = silver.groupBy("seller_id", "seller_state", "seller_city").agg(
        F.countDistinct("order_id").alias("n_orders"),
        F.count("*").alias("n_items_sold"),
        F.round(F.sum("price"),   2).alias("revenue_total"),
        F.round(F.avg("price"),   2).alias("avg_item_price"),
        F.round(F.avg("review_score"), 2).alias("avg_review_score"),
        F.round(F.avg("delivery_delay_days"), 2).alias("avg_delivery_delay"),
        F.round(F.sum("freight_value"), 2).alias("freight_total"),
    )
    w = Window.partitionBy("seller_state").orderBy(F.col("revenue_total").desc())
    return base.withColumn("rank_in_state", F.dense_rank().over(w))


def dm_customer_satisfaction(silver: DataFrame) -> DataFrame:
    """Customer-state level KPIs about satisfaction and retention."""
    return (
        silver.groupBy("customer_state").agg(
            F.countDistinct("customer_unique_id").alias("n_customers"),
            F.countDistinct("order_id").alias("n_orders"),
            F.round(F.sum("price"),         2).alias("revenue_total"),
            F.round(F.avg("review_score"),  2).alias("avg_review_score"),
            F.round(
                F.sum(F.col("is_repeat_customer"))
                / F.countDistinct("order_id"), 4)
              .alias("repeat_order_ratio"),
            F.round(F.avg("delivery_delay_days"), 2).alias("avg_delivery_delay"),
        )
        .orderBy(F.col("revenue_total").desc())
    )


def dm_product_category_revenue(silver: DataFrame) -> DataFrame:
    """Revenue per (translated) product category, with rank."""
    base = (
        silver
        .filter(F.col("category_en").isNotNull())
        .groupBy("category_en")
        .agg(
            F.countDistinct("product_id").alias("n_distinct_products"),
            F.count("*").alias("n_items_sold"),
            F.round(F.sum("price"),   2).alias("revenue_total"),
            F.round(F.avg("price"),   2).alias("avg_item_price"),
            F.round(F.avg("review_score"), 2).alias("avg_review_score"),
        )
    )
    w = Window.orderBy(F.col("revenue_total").desc())
    return base.withColumn("rank_global", F.row_number().over(w))


def dm_monthly_sales_trends(silver: DataFrame) -> DataFrame:
    """Monthly time-series with revenue, AOV, MoM growth (window function)."""
    monthly = (
        silver
        .filter(F.col("order_year").isNotNull())
        .groupBy("order_year", "order_month").agg(
            F.countDistinct("order_id").alias("n_orders"),
            F.round(F.sum("price"), 2).alias("revenue_total"),
            F.round(F.avg("price"), 2).alias("avg_order_value"),
            F.round(F.avg("review_score"), 2).alias("avg_review_score"),
        )
    )
    w = Window.orderBy("order_year", "order_month")
    return (
        monthly
        .withColumn("revenue_prev_month",
                    F.lag("revenue_total").over(w))
        .withColumn(
            "mom_growth_pct",
            F.round(
                F.when(F.col("revenue_prev_month").isNotNull()
                       & (F.col("revenue_prev_month") > 0),
                       (F.col("revenue_total") - F.col("revenue_prev_month"))
                       / F.col("revenue_prev_month") * 100)
                 .otherwise(F.lit(None)), 2))
        .orderBy("order_year", "order_month")
    )


def main() -> None:
    args = parse_args()
    log = configure_logger(args.log_file)

    log.info("=" * 70)
    log.info("Olist DATAMART (gold layer) - starting")
    for k, v in vars(args).items():
        if "password" in k:
            log.info(f"  arg {k:<15} = ***")
        else:
            log.info(f"  arg {k:<15} = {v}")
    log.info("=" * 70)

    spark = build_spark()
    log.info(f"Spark application id = {spark.sparkContext.applicationId}")
    log.info(f"Spark UI url         = {spark.sparkContext.uiWebUrl}")

    try:
        if args.silver_path:
            log.info(f"Reading silver from parquet path {args.silver_path}")
            silver = spark.read.parquet(args.silver_path)
        else:
            log.info(f"Reading silver from Hive table {args.silver_table}")
            silver = spark.table(args.silver_table)

        # cache silver: 4 datamarts will hit it back to back, avoid 4 reads
        silver = silver.cache()
        n_silver = silver.count()
        log.info(f"[CACHE] silver cached, {n_silver} rows")

        for name, builder in [
            ("dm_seller_performance",       dm_seller_performance),
            ("dm_customer_satisfaction",    dm_customer_satisfaction),
            ("dm_product_category_revenue", dm_product_category_revenue),
            ("dm_monthly_sales_trends",     dm_monthly_sales_trends),
        ]:
            log.info(f"--- Building datamart '{name}' ---")
            dm = builder(silver)
            log.info(f"[{name}] schema = {dm.schema.simpleString()}")
            write_jdbc(dm, name, args, log)

        silver.unpersist()
        log.info("=" * 70)
        log.info("Datamart layer built successfully.")
        log.info("=" * 70)

    except Exception as exc:
        log.error(f"Datamart FAILED: {exc}", exc_info=True)
        spark.stop()
        sys.exit(1)
    spark.stop()


if __name__ == "__main__":
    main()
