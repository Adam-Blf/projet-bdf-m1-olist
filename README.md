# Olist Data Platform - Big Data Frameworks (M1 DE&IA, EFREI)

[![EFREI Paris](https://img.shields.io/badge/EFREI-Paris-005CA9?style=flat-square&labelColor=000000)](https://www.efrei.fr/)

[![Spark](https://img.shields.io/badge/Spark-3.0.0-E25A1C?logo=apachespark&logoColor=white)](https://spark.apache.org)
[![Hadoop](https://img.shields.io/badge/Hadoop-3.2.1-66CCFF?logo=apachehadoop&logoColor=black)](https://hadoop.apache.org)
[![Hive](https://img.shields.io/badge/Hive-2.3.2-FDEE21?logo=apachehive&logoColor=black)](https://hive.apache.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Streamlit](https://img.shields.io/badge/Streamlit-1.39-FF4B4B?logo=streamlit&logoColor=white)](https://streamlit.io)
[![PostgreSQL](https://img.shields.io/badge/Postgres-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-academic-lightgrey)]()
[![version](https://img.shields.io/badge/version-1.0.0-blue)]()

Plateforme data **médaillon (bronze / silver / gold)** complète construite sur
le dataset open data **Olist Brazilian E-Commerce** (~1,5 M lignes au total),
livrée comme projet final du module **Big Data Frameworks** du M1 DE&IA EFREI.

> Auteurs · **Adam Beloucif** · **Emilien Morice** · 22 mars 2026
> Encadrant · Steve Elanga · M1-XDE709-M1-DE2-2025-2026-A

---

## 1. Problématique business

Olist, marketplace e-commerce brésilien (équivalent local d'Amazon-Mercado),
veut comprendre **pourquoi sa satisfaction client varie** entre régions et
catégories produits, et **comment ses meilleurs vendeurs se classent**.
Notre data platform répond à 4 questions concrètes :

1. **Qui sont les top vendeurs et quel est leur classement à l'intérieur de
   leur état brésilien ?** (window function `dense_rank() over (partition by
   seller_state)`)
2. **La satisfaction client (review score) varie-t-elle selon l'état
   brésilien ?** (jointure customers ↔ orders ↔ reviews + agrégation)
3. **Quelles catégories produits génèrent le plus de revenue, et avec quel
   niveau de satisfaction ?** (jointure produits ↔ traduction catégorie)
4. **Quelle est l'évolution mensuelle du chiffre d'affaires et son taux de
   croissance MoM ?** (window `lag()` sur la time-series)

## 2. Architecture

```
                            ┌──────────────────────┐
                            │   /source/olist/*.csv │  9 fichiers, 1 556 425 lignes
                            └──────────┬───────────┘
                                       │
                            spark-submit feeder.py
                                       ▼
        ┌────────────────────────────────────────────────────┐
        │  HDFS  /data/raw/olist/{table}/year=/month=/day=   │   bronze (parquet)
        └─────────────────────┬──────────────────────────────┘
                              │
                  spark-submit processor.py
                  (5 règles validation, joins, windows, cache)
                              ▼
        ┌────────────────────────────────────────────────────┐
        │  HDFS /data/silver/olist/orders_enriched/year=...  │   silver (parquet)
        │  Hive table  default.silver_orders_enriched        │
        └─────────────────────┬──────────────────────────────┘
                              │
                   spark-submit datamart.py
                   (4 datamarts, JDBC overwrite)
                              ▼
        ┌────────────────────────────────────────────────────┐
        │  PostgreSQL "olist_dm"                             │   gold (relational)
        │   ├── dm_seller_performance                        │
        │   ├── dm_customer_satisfaction                     │
        │   ├── dm_product_category_revenue                  │
        │   └── dm_monthly_sales_trends                      │
        └────────────┬───────────────────────────┬───────────┘
                     │                           │
              FastAPI REST + JWT          Streamlit dashboard
              (paginated)                 (5 charts)
```

## 3. Dataset

[Olist Brazilian E-Commerce](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce)
- License : CC BY-NC-SA 4.0
- 9 fichiers CSV liés (relations 1-N entre orders, items, customers, sellers,
  payments, reviews, products + dimension geolocation et translation)

| Table                         | Lignes      | Rôle                                   |
|-------------------------------|------------:|----------------------------------------|
| olist_customers_dataset.csv   | 99 441      | Clients                                |
| olist_geolocation_dataset.csv | 1 000 163   | Geo. zip code (dim. geo)               |
| olist_order_items_dataset.csv | 112 650     | **Fait** : ligne de commande           |
| olist_order_payments_dataset  | 103 886     | Paiements (1-N par commande)           |
| olist_order_reviews_dataset   | 104 719     | Notes / commentaires                   |
| olist_orders_dataset.csv      | 99 441      | Commandes                              |
| olist_products_dataset.csv    | 32 951      | Produits                               |
| olist_sellers_dataset.csv     | 3 095       | Vendeurs                               |
| product_category_translation  | 71          | Traduction catégorie PT→EN             |
| **TOTAL**                     | **1 556 425** | bien au-dessus du seuil 200 000      |

> Pour reproduire : télécharger l'archive Kaggle et l'extraire dans
> `source/olist/`. Les fichiers ne sont pas commit (.gitignore).

## 4. Stack

| Couche       | Techno                                                                 |
|--------------|------------------------------------------------------------------------|
| Storage      | HDFS 3.2.1 (1 namenode + 1 datanode)                                   |
| Compute      | Spark 3.0.0 Standalone (1 master + 2 workers, 4 cores total)           |
| Catalog      | Hive 2.3.2 + metastore PostgreSQL                                      |
| YARN         | Resource Manager + NodeManager + HistoryServer (bonus barème)          |
| Datamart DB  | PostgreSQL 16 (Spark JDBC overwrite)                                   |
| API          | FastAPI 0.115 + JWT (HS256) + pagination offset/limit                  |
| Visualisation| Streamlit 1.39 + Altair (5 charts)                                     |
| Vidéo        | Remotion 4 (TS/React) → MP4 1080p                                      |
| Orchestration| docker-compose (15 conteneurs)                                         |

## 5. Quickstart

```bash
# 1. Télécharger le dataset Kaggle dans source/olist/ (9 CSV)
ls source/olist/
# olist_customers_dataset.csv  ...  product_category_name_translation.csv

# 2. Lancer la stack complète
docker compose up -d

# 3. Pipeline end-to-end (feeder → processor → datamart)
bash scripts/run_all.sh 2026-03-22

# 4. UIs
open http://localhost:9870     # HDFS NameNode
open http://localhost:8088     # YARN Resource Manager
open http://localhost:8080     # Spark Master UI
open http://localhost:4040     # Spark App UI (job en cours)
open http://localhost:8000/docs # FastAPI Swagger
open http://localhost:8501     # Streamlit dashboard
```

## 6. spark-submit (paramétrable, aucun chemin codé en dur)

### Bronze - feeder.py

```bash
/spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --deploy-mode client \
  --executor-cores 2 --total-executor-cores 4 \
  /opt/pipeline/feeder.py \
    --source-dir     file:///source/olist \
    --raw-base       hdfs://namenode:9000/data/raw/olist \
    --log-file       /opt/pipeline/logs/feeder.txt \
    --ingestion-date 2026-03-22 \
    --repartition    4 \
    --tables         ALL
```

### Silver - processor.py

```bash
/spark/bin/spark-submit \
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
    --ingestion-date 2026-03-22 \
    --log-file       /opt/pipeline/logs/processor.txt
```

### Gold - datamart.py

```bash
/spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --deploy-mode client \
  --jars /opt/jars/postgresql-42.7.3.jar \
  /opt/pipeline/datamart.py \
    --silver-table  default.silver_orders_enriched \
    --jdbc-url      jdbc:postgresql://postgres-datamart:5432/olist_dm \
    --jdbc-user     olist \
    --jdbc-password olist \
    --log-file      /opt/pipeline/logs/datamart.txt
```

## 7. Couche Silver - 5 règles de validation

| # | Règle                                                                |
|---|----------------------------------------------------------------------|
| 1 | `order_id` non null                                                  |
| 2 | `order_status` ∈ {delivered, shipped, canceled, ...} (8 valeurs)     |
| 3 | `price > 0` ET `freight_value >= 0`                                  |
| 4 | `review_score` null OU compris entre 1 et 5                          |
| 5 | `order_purchase_timestamp <= order_delivered_customer_date` (si non null) |

Sur la couche silver les **window functions** suivantes sont appliquées :
- `row_number() over (partition by customer_unique_id order by order_purchase_timestamp)` → `customer_order_seq`
- `dense_rank() over (partition by seller_state, year, month order by price desc)` → `seller_state_month_rank`
- `lag(revenue_total) over (order by order_year, order_month)` (datamart) → `mom_growth_pct`

## 8. Datamarts (gold)

| Datamart                       | Granularité            | Lignes |
|--------------------------------|------------------------|-------:|
| `dm_seller_performance`        | 1 ligne / vendeur      | 3 095  |
| `dm_customer_satisfaction`     | 1 ligne / état (UF)    | 27     |
| `dm_product_category_revenue`  | 1 ligne / catégorie EN | 71     |
| `dm_monthly_sales_trends`      | 1 ligne / mois         | 25     |

Schémas détaillés dans `docs/rapport.md` §6.

## 9. API REST sécurisée (JWT) + pagination

### Login

```bash
curl -X POST http://localhost:8000/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=adam&password=olist2026"
# {"access_token":"...","token_type":"bearer","expires_in":3600}
```

### Liste paginée d'un datamart

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/token \
  -d "username=adam&password=olist2026" | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/datamarts/dm_seller_performance?page=1&size=20&order_by=revenue_total&direction=desc"
# { "page": 1, "size": 20, "total": 3095, "pages": 155, "items": [...] }
```

Documentation Swagger : http://localhost:8000/docs

## 10. Visualisation - Streamlit (5 graphiques)

1. Top 15 vendeurs par CA (bar chart, couleur = état)
2. Tendance mensuelle CA + croissance MoM (combo line + bar)
3. Top 15 catégories produits par CA (bar horizontal, couleur = avg_review)
4. Satisfaction client par état brésilien (bar chart heatmap-style)
5. Heatmap répartition des vendeurs (rank bucket × état)

## 11. Optimisation Spark

- `cache()` sur les CSV bronze pendant le feeder pour éviter la double lecture
  count + write
- `persist(MEMORY_AND_DISK)` sur le DataFrame joint dans le processor avant
  les window functions et l'écriture parquet
- `cache()` sur la table silver dans datamart.py (4 datamarts construits dos
  à dos sur la même source)
- `repartition(4)` côté bronze pour limiter le nombre de fichiers parquet
- `repartition(8)` côté silver pour limiter le shuffle des window functions
- Compression `snappy` partout

Visible dans la **Spark UI** (Storage tab + DAG → cyan boxes).

## 12. Logs

Tous les jobs écrivent à la fois sur stdout et dans `pipeline/logs/*.txt` :

- `logs/feeder.txt`     - 32 lignes, 1 556 417 rows ingérées
- `logs/processor.txt`  - 35 lignes, 111 263 rows silver, 1 387 rejetées
- `logs/datamart.txt`   - 30 lignes, 4 datamarts buildés

## 13. Livrables

| Livrable                        | Chemin                              |
|---------------------------------|-------------------------------------|
| Lien GitHub                     | https://github.com/Adam-Blf/projet-bdf-m1-olist |
| Document projet (rapport)       | `docs/rapport.md` / `docs/rapport.pdf` |
| Scripts Python                  | `pipeline/{feeder,processor,datamart}.py` |
| API REST + JWT                  | `api/main.py`                       |
| Visualisation Streamlit         | `viz/app.py`                        |
| Logs `.txt`                     | `logs/`                             |
| Vidéo de démonstration          | `video/olist-bdf-demo.mp4`          |
| README                          | ce fichier                          |

## 14. Barème (auto-évaluation)

| Critère                              | Pts | Couvert ? |
|--------------------------------------|----:|-----------|
| Ingestion raw                        | 2.0 | ✓ feeder.py paramétrable, partitionné year/month/day, parquet snappy |
| Traitement silver                    | 4.0 | ✓ 5 règles, 6 joins, 3 window functions, persist MEMORY_AND_DISK |
| Logs                                 | 1.0 | ✓ 3 fichiers `.txt` détaillés                                          |
| Pertinence problématique business    | 1.0 | ✓ 4 questions e-commerce concrètes                                     |
| Analyse business                     | 1.5 | ✓ rapport §7 conclusions chiffrées                                     |
| Datamarts                            | 4.0 | ✓ 4 datamarts relationnels Postgres avec rank/MoM                      |
| API                                  | 2.0 | ✓ FastAPI + JWT HS256 + pagination + Swagger                           |
| Visualisation                        | 1.5 | ✓ 5 graphiques Streamlit (>= 3 requis)                                 |
| Architecture modulaire               | 1.0 | ✓ feeder/processor/datamart isolés, paramètres via spark-submit        |
| Vidéo                                | 2.0 | ✓ vidéo Remotion 6 min, screen capture des UIs                         |
| **Total**                            |**20.0**| **20.0**                                                            |

## 15. Auteurs

- **Adam Beloucif** - data engineering, Hadoop/Spark, datamarts, API, vidéo
- **Emilien Morice** - architecture médaillon, validation rules, dashboard,
  rapport
