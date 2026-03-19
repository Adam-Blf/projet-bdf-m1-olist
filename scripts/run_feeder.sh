#!/usr/bin/env bash
# Run the bronze feeder from the spark-master container.
# All paths and dates are passed as arguments (no hardcoding in feeder.py).
set -euo pipefail

INGESTION_DATE="${1:-2026-03-22}"

docker exec spark-master /spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --deploy-mode client \
  --executor-cores 2 --total-executor-cores 4 \
  --conf spark.driver.memory=1g \
  --conf spark.executor.memory=1g \
  /opt/pipeline/feeder.py \
    --source-dir     file:///source/olist \
    --raw-base       hdfs://namenode:9000/data/raw/olist \
    --log-file       /opt/pipeline/logs/feeder.txt \
    --ingestion-date "${INGESTION_DATE}" \
    --repartition    4 \
    --tables         ALL
