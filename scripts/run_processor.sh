#!/usr/bin/env bash
# Run the silver processor against the partition emitted by run_feeder.sh.
set -euo pipefail

INGESTION_DATE="${1:-2026-03-22}"

docker exec spark-master /spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --deploy-mode client \
  --conf spark.sql.warehouse.dir=hdfs://namenode:9000/user/hive/warehouse \
  --conf spark.hadoop.hive.metastore.uris=thrift://hive-metastore:9083 \
  --executor-cores 2 --total-executor-cores 4 \
  /opt/pipeline/processor.py \
    --raw-base       hdfs://namenode:9000/data/raw/olist \
    --silver-base    hdfs://namenode:9000/data/silver/olist \
    --hive-db        default \
    --hive-table     silver_orders_enriched \
    --ingestion-date "${INGESTION_DATE}" \
    --log-file       /opt/pipeline/logs/processor.txt \
    --repartition    8
