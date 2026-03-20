#!/usr/bin/env bash
# Run the gold datamart job. Requires postgresql JDBC jar in ./jars
# (download once into ./jars before running):
#   wget -P ./jars https://jdbc.postgresql.org/download/postgresql-42.7.3.jar
set -euo pipefail

docker exec spark-master /spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --deploy-mode client \
  --conf spark.sql.warehouse.dir=hdfs://namenode:9000/user/hive/warehouse \
  --conf spark.hadoop.hive.metastore.uris=thrift://hive-metastore:9083 \
  --jars /opt/jars/postgresql-42.7.3.jar \
  /opt/pipeline/datamart.py \
    --silver-table  default.silver_orders_enriched \
    --jdbc-url      jdbc:postgresql://postgres-datamart:5432/olist_dm \
    --jdbc-user     olist \
    --jdbc-password olist \
    --log-file      /opt/pipeline/logs/datamart.txt
