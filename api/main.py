"""
Olist datamarts REST API
========================

FastAPI service exposing the 4 PostgreSQL datamarts produced by datamart.py.

Endpoints:
  POST /token                          login -> JWT access token
  GET  /datamarts                      list datamart names (auth)
  GET  /datamarts/{name}?page=&size=   paginated rows from a datamart (auth)
  GET  /healthz                        liveness probe (no auth)

Authentication: OAuth2 password flow + JWT (HS256). Demo users live in a small
in-memory store (see USERS dict). In a real deployment they would come from
a users table or an SSO provider.

Pagination: classic offset/limit pattern (page-1 + size). The response wraps
results into:
    {
      "page": int, "size": int, "total": int, "pages": int,
      "items": [...]
    }

Authors: Adam Beloucif, Emilien Morice (M1 DE&IA - EFREI - 2026)
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
JWT_SECRET    = os.getenv("OLIST_JWT_SECRET",    "change-me-in-prod")
JWT_ALGO      = os.getenv("OLIST_JWT_ALGO",      "HS256")
JWT_EXP_MIN   = int(os.getenv("OLIST_JWT_EXP_MINUTES", "60"))
DATABASE_URL  = os.getenv(
    "OLIST_DATABASE_URL",
    "postgresql+psycopg2://olist:olist@localhost:5433/olist_dm",
)

ALLOWED_DATAMARTS: dict[str, str] = {
    "dm_seller_performance":       "seller_id",
    "dm_customer_satisfaction":    "customer_state",
    "dm_product_category_revenue": "category_en",
    "dm_monthly_sales_trends":     "order_year",
}

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

USERS: dict[str, dict[str, Any]] = {
    # password = "olist2026" for both demo accounts.
    "adam":    {"username": "adam",
                "hashed":  pwd_ctx.hash("olist2026"),
                "scopes":  ["read"]},
    "emilien": {"username": "emilien",
                "hashed":  pwd_ctx.hash("olist2026"),
                "scopes":  ["read"]},
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
engine: Engine = create_engine(DATABASE_URL, pool_pre_ping=True)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    expires_in:   int


class Page(BaseModel):
    page:  int
    size:  int
    total: int
    pages: int
    items: list[dict[str, Any]]


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def authenticate(username: str, password: str) -> dict[str, Any] | None:
    user = USERS.get(username)
    if not user:
        return None
    if not pwd_ctx.verify(password, user["hashed"]):
        return None
    return user


def create_access_token(sub: str, scopes: list[str]) -> tuple[str, int]:
    expire = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXP_MIN)
    payload = {"sub": sub, "scopes": scopes, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO), JWT_EXP_MIN * 60


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict[str, Any]:
    creds_err = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        username = payload.get("sub")
        if not username or username not in USERS:
            raise creds_err
    except JWTError:
        raise creds_err
    return USERS[username]


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Olist Datamarts API",
    version="1.0.0",
    description=(
        "Exposes the 4 gold datamarts (seller performance, customer "
        "satisfaction, product category revenue, monthly trends) built by "
        "the Spark medallion pipeline. Secured via JWT, all list endpoints "
        "are paginated."
    ),
    contact={"name": "Adam Beloucif & Emilien Morice",
             "email": "adam.beloucif@efrei.net"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", tags=["meta"])
def healthz() -> dict[str, str]:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "ok"}
    except Exception as exc:
        return {"status": "ok", "db": f"down ({exc.__class__.__name__})"}


@app.post("/token", response_model=Token, tags=["auth"])
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    user = authenticate(form.username, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token, exp = create_access_token(user["username"], user["scopes"])
    return Token(access_token=token, expires_in=exp)


@app.get("/datamarts", tags=["datamarts"])
def list_datamarts(
    _: Annotated[dict, Depends(get_current_user)],
) -> dict[str, list[str]]:
    return {"datamarts": sorted(ALLOWED_DATAMARTS)}


@app.get("/datamarts/{name}", response_model=Page, tags=["datamarts"])
def get_datamart(
    name: str,
    _: Annotated[dict, Depends(get_current_user)],
    page:  int = Query(1,  ge=1,  description="Page number, 1-based"),
    size:  int = Query(50, ge=1,  le=500,
                       description="Page size (rows), max 500"),
    order_by: str | None = Query(
        None,
        description="Optional column to order by (whitelisted per datamart)"),
    direction: str = Query(
        "asc", pattern="^(asc|desc)$",
        description="Sort direction (asc or desc)"),
) -> Page:
    if name not in ALLOWED_DATAMARTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown datamart '{name}'. "
                   f"Allowed: {sorted(ALLOWED_DATAMARTS)}",
        )

    order_col = order_by or ALLOWED_DATAMARTS[name]
    # Identifier safety: must be a plain column name (alnum + underscore).
    if not order_col.replace("_", "").isalnum():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid order_by column name",
        )

    offset = (page - 1) * size
    with engine.connect() as conn:
        total = conn.execute(
            text(f'SELECT COUNT(*) FROM "{name}"')
        ).scalar_one()

        rows = conn.execute(
            text(
                f'SELECT * FROM "{name}" '
                f'ORDER BY "{order_col}" {direction.upper()} '
                f'LIMIT :limit OFFSET :offset'
            ),
            {"limit": size, "offset": offset},
        ).mappings().all()

    pages = (total + size - 1) // size if total else 0
    return Page(
        page=page, size=size, total=total, pages=pages,
        items=[dict(r) for r in rows],
    )
