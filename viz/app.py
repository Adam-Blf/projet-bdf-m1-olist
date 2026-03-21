"""
Olist datamarts dashboard (Streamlit)
=====================================

Reads the 4 datamarts produced by the gold layer and renders 5 charts:

  1. Top 15 sellers by revenue (bar)
  2. Monthly revenue + month-over-month growth (line + bars)
  3. Top 15 product categories by revenue (horizontal bar)
  4. Customer satisfaction by state (avg review score, choropleth-style bar)
  5. Heatmap n_orders by state x category (computed from the API datamarts)

Runs against either:
  - the PostgreSQL datamart DB directly (default), or
  - the FastAPI service (set OLIST_USE_API=1 + OLIST_API_BASE/USER/PASSWORD).

Authors: Adam Beloucif, Emilien Morice (M1 DE&IA - EFREI - 2026)
"""

from __future__ import annotations

import os

import altair as alt
import pandas as pd
import requests
import streamlit as st
from sqlalchemy import create_engine

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATABASE_URL = os.getenv(
    "OLIST_DATABASE_URL",
    "postgresql+psycopg2://olist:olist@localhost:5433/olist_dm",
)
USE_API   = os.getenv("OLIST_USE_API", "0") == "1"
API_BASE  = os.getenv("OLIST_API_BASE",      "http://localhost:8000")
API_USER  = os.getenv("OLIST_API_USER",      "adam")
API_PWD   = os.getenv("OLIST_API_PASSWORD",  "olist2026")

st.set_page_config(
    page_title="Olist Datamarts | M1 DE&IA",
    page_icon="📦",
    layout="wide",
)

st.markdown("""
<style>
  .main .block-container { padding-top: 1.5rem; }
  h1, h2, h3 { font-family: 'Plus Jakarta Sans', sans-serif; }
  .stMetric { background: #f7f8fa; padding: 1rem; border-radius: 14px; }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Data access
# ---------------------------------------------------------------------------
@st.cache_resource
def get_engine():
    return create_engine(DATABASE_URL, pool_pre_ping=True)


@st.cache_data(ttl=300)
def load_via_db(table: str) -> pd.DataFrame:
    eng = get_engine()
    return pd.read_sql_query(f'SELECT * FROM "{table}"', eng)


@st.cache_data(ttl=300)
def load_via_api(table: str) -> pd.DataFrame:
    tok = requests.post(
        f"{API_BASE}/token",
        data={"username": API_USER, "password": API_PWD},
        timeout=15,
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {tok}"}
    rows: list[dict] = []
    page = 1
    while True:
        r = requests.get(
            f"{API_BASE}/datamarts/{table}",
            params={"page": page, "size": 500},
            headers=headers, timeout=30,
        ).json()
        rows.extend(r["items"])
        if page >= r["pages"]:
            break
        page += 1
    return pd.DataFrame(rows)


def load(table: str) -> pd.DataFrame:
    return load_via_api(table) if USE_API else load_via_db(table)


# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
st.title("📦 Olist Datamarts Dashboard")
st.caption(
    "M1 Data Engineering & IA · EFREI · projet final Big Data Frameworks · "
    "Adam Beloucif & Emilien Morice"
)

with st.sidebar:
    st.markdown("### Source")
    st.write("API" if USE_API else "PostgreSQL direct")
    st.markdown("### Datamarts disponibles")
    st.write([
        "dm_seller_performance",
        "dm_customer_satisfaction",
        "dm_product_category_revenue",
        "dm_monthly_sales_trends",
    ])
    if st.button("🔄 Refresh cache"):
        st.cache_data.clear()


# ---------------------------------------------------------------------------
# Load
# ---------------------------------------------------------------------------
try:
    sellers   = load("dm_seller_performance")
    customers = load("dm_customer_satisfaction")
    catdm     = load("dm_product_category_revenue")
    monthly   = load("dm_monthly_sales_trends")
except Exception as exc:
    st.error(f"Impossible de charger les datamarts : {exc}")
    st.stop()


# ---------------------------------------------------------------------------
# KPI band
# ---------------------------------------------------------------------------
total_revenue = float(sellers["revenue_total"].sum())
total_sellers = int(sellers["seller_id"].nunique())
total_customers = int(customers["n_customers"].sum())
avg_review = float(customers["avg_review_score"].mean())

c1, c2, c3, c4 = st.columns(4)
c1.metric("Revenue total (BRL)",  f"{total_revenue:,.0f}".replace(",", " "))
c2.metric("Vendeurs actifs",      f"{total_sellers:,}".replace(",", " "))
c3.metric("Clients uniques",      f"{total_customers:,}".replace(",", " "))
c4.metric("Avg review score",     f"{avg_review:.2f} / 5")


# ---------------------------------------------------------------------------
# 1. Top 15 sellers by revenue
# ---------------------------------------------------------------------------
st.markdown("### 1. Top 15 vendeurs (CA)")
top_sellers = sellers.nlargest(15, "revenue_total").copy()
top_sellers["seller_id_short"] = top_sellers["seller_id"].str.slice(0, 8)
chart1 = (
    alt.Chart(top_sellers)
    .mark_bar(color="#000091")
    .encode(
        x=alt.X("revenue_total:Q", title="Revenue total (BRL)"),
        y=alt.Y("seller_id_short:N", sort="-x", title="Seller (id court)"),
        color=alt.Color("seller_state:N", title="État vendeur"),
        tooltip=["seller_id", "seller_state", "n_orders",
                 "revenue_total", "avg_review_score"],
    )
    .properties(height=420)
)
st.altair_chart(chart1, use_container_width=True)


# ---------------------------------------------------------------------------
# 2. Monthly trend
# ---------------------------------------------------------------------------
st.markdown("### 2. Tendance mensuelle (CA + croissance MoM)")
monthly = monthly.sort_values(["order_year", "order_month"]).copy()
monthly["period"] = (
    monthly["order_year"].astype(int).astype(str) + "-"
    + monthly["order_month"].astype(int).astype(str).str.zfill(2)
)

base = alt.Chart(monthly).encode(x=alt.X("period:N", title="Mois", sort=None))
line = base.mark_line(color="#00897B", point=True).encode(
    y=alt.Y("revenue_total:Q", title="Revenue (BRL)"),
    tooltip=["period", "revenue_total", "n_orders",
             "avg_order_value", "mom_growth_pct"],
)
bars = base.mark_bar(opacity=0.45, color="#00897B").encode(
    y=alt.Y("mom_growth_pct:Q", title="Growth MoM (%)"),
)
st.altair_chart(
    alt.layer(bars, line).resolve_scale(y="independent").properties(height=380),
    use_container_width=True,
)


# ---------------------------------------------------------------------------
# 3. Categories
# ---------------------------------------------------------------------------
st.markdown("### 3. Top 15 catégories produits par CA")
top_cats = catdm.nlargest(15, "revenue_total")
chart3 = (
    alt.Chart(top_cats)
    .mark_bar()
    .encode(
        x=alt.X("revenue_total:Q", title="Revenue (BRL)"),
        y=alt.Y("category_en:N", sort="-x", title="Catégorie"),
        color=alt.Color("avg_review_score:Q",
                        scale=alt.Scale(scheme="redyellowgreen", domain=[1, 5]),
                        title="Avg review"),
        tooltip=["category_en", "n_items_sold", "revenue_total",
                 "avg_item_price", "avg_review_score"],
    )
    .properties(height=420)
)
st.altair_chart(chart3, use_container_width=True)


# ---------------------------------------------------------------------------
# 4. Satisfaction by state
# ---------------------------------------------------------------------------
st.markdown("### 4. Satisfaction client par état brésilien")
chart4 = (
    alt.Chart(customers.sort_values("avg_review_score", ascending=False))
    .mark_bar()
    .encode(
        x=alt.X("customer_state:N", sort="-y", title="État (UF)"),
        y=alt.Y("avg_review_score:Q",
                scale=alt.Scale(domain=[3, 5]),
                title="Avg review score"),
        color=alt.Color("avg_review_score:Q",
                        scale=alt.Scale(scheme="redyellowgreen", domain=[3, 5])),
        tooltip=["customer_state", "n_customers", "n_orders",
                 "revenue_total", "avg_review_score",
                 "repeat_order_ratio", "avg_delivery_delay"],
    )
    .properties(height=380)
)
st.altair_chart(chart4, use_container_width=True)


# ---------------------------------------------------------------------------
# 5. State x rank distribution
# ---------------------------------------------------------------------------
st.markdown("### 5. Répartition vendeurs top 5 par état (rank_in_state)")
heat = sellers.copy()
heat["bucket"] = pd.cut(
    heat["rank_in_state"], bins=[0, 1, 5, 20, 100, 100000],
    labels=["#1", "Top5", "Top20", "Top100", "Other"],
)
heat_g = (
    heat.groupby(["seller_state", "bucket"], observed=True)
        .agg(n=("seller_id", "count"))
        .reset_index()
)
chart5 = (
    alt.Chart(heat_g)
    .mark_rect()
    .encode(
        x=alt.X("seller_state:N", title="État vendeur"),
        y=alt.Y("bucket:N", title="Tranche de rank"),
        color=alt.Color("n:Q", scale=alt.Scale(scheme="blues"),
                        title="# vendeurs"),
        tooltip=["seller_state", "bucket", "n"],
    )
    .properties(height=260)
)
st.altair_chart(chart5, use_container_width=True)

st.caption(
    "Données : Olist Brazilian E-Commerce (2016-2018, ~99k commandes, "
    "~112k items). Pipeline : feeder → /raw HDFS → processor → /silver "
    "+ Hive → datamart → PostgreSQL → API JWT → Streamlit."
)
