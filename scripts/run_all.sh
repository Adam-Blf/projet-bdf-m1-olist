#!/usr/bin/env bash
# End-to-end run of the medallion pipeline + apps.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
INGESTION_DATE="${1:-2026-03-22}"

echo ">>> [1/5] Bringing up the cluster"
docker compose up -d

echo ">>> [2/5] Downloading PostgreSQL JDBC driver (one-shot)"
mkdir -p "$HERE/../jars"
[ -f "$HERE/../jars/postgresql-42.7.3.jar" ] || \
  curl -L -o "$HERE/../jars/postgresql-42.7.3.jar" \
    https://jdbc.postgresql.org/download/postgresql-42.7.3.jar

echo ">>> [3/5] Running feeder for ${INGESTION_DATE}"
bash "$HERE/run_feeder.sh" "$INGESTION_DATE"

echo ">>> [4/5] Running silver processor for ${INGESTION_DATE}"
bash "$HERE/run_processor.sh" "$INGESTION_DATE"

echo ">>> [5/5] Building datamarts"
bash "$HERE/run_datamart.sh"

echo
echo "Pipeline complete. UIs available at:"
echo "  - HDFS NameNode  http://localhost:9870"
echo "  - YARN RM        http://localhost:8088"
echo "  - Spark Master   http://localhost:8080"
echo "  - Spark App UI   http://localhost:4040"
echo "  - Hive Server    thrift://localhost:10000"
echo "  - API Swagger    http://localhost:8000/docs"
echo "  - Streamlit viz  http://localhost:8501"
