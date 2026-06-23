"""
Morningstar Direct FastAPI service.

Reads MD_AUTH_TOKEN from environment on each request (allows hot-swap without restart).
Exposes portfolio data as JSON for the Next.js frontend.

Start: uvicorn main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import calendar
import os
import time
from datetime import date
from typing import Literal, Optional

import morningstar_data as md
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Morningstar Portfolio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Hardcoded category mappings ───────────────────────────────────────────────

ASSET_CODES: dict[str, str] = {
    "HS11B": "Kassa",
    "HS11C": "Aktier",
    "HS11F": "Räntor",
    "HS11I": "Övrigt",
}

STYLEBOX_CODES: dict[str, str] = {
    "HS076": "Large Value",
    "HS077": "Large Core",
    "HS078": "Large Growth",
    "HS079": "Mid Value",
    "HS07A": "Mid Core",
    "HS07B": "Mid Growth",
    "HS07C": "Small Value",
    "HS07D": "Small Core",
    "HS07E": "Small Growth",
}

# dataset IDs differ between equity and bond portfolios
DATASET_IDS: dict[str, dict[str, str]] = {
    "equity": {"region": "15", "sector": "17"},
    "bond":   {"region": "29", "sector": "31"},
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _set_auth() -> None:
    """Re-read token from env on each request so a token update takes effect immediately."""
    token = os.getenv("MD_AUTH_TOKEN", "")
    if not token:
        raise HTTPException(status_code=503, detail="MD_AUTH_TOKEN not configured")
    os.environ["MD_AUTH_TOKEN"] = token


def _current_period() -> tuple[str, str]:
    today = date.today()
    start = today.replace(day=1).strftime("%Y-%m-%d")
    last_day = calendar.monthrange(today.year, today.month)[1]
    end = today.replace(day=min(today.day, last_day)).strftime("%Y-%m-%d")
    return start, end


def _extract_values(portfolio_data: pd.DataFrame, ids: list[str]) -> list[dict]:
    """
    Extract one value per data point from the Morningstar DataFrame.

    The DataFrame has 2 metadata columns + `freq` columns per data point.
    The original script picks every freq-th column starting at freq+1,
    which is the last (value) column in each group.
    """
    n_cols = portfolio_data.shape[1]
    n_ids = len(ids)
    if n_ids == 0 or n_cols <= 2:
        return []
    freq = int((n_cols - 2) / n_ids)
    if freq == 0:
        return []

    results = []
    positions = list(range(freq + 1, n_cols, freq))
    for i, pos in enumerate(positions):
        col = portfolio_data.columns[pos]
        raw = portfolio_data[col].iloc[0]
        try:
            value = float(raw)
        except (TypeError, ValueError):
            value = 0.0
        results.append({
            "_col": col,
            "_id": ids[i] if i < len(ids) else "",
            "value": value,
        })
    return results


def _clean_col_name(col: str) -> str:
    for suffix in [" % (Long Rescaled)", " % (Long)", " % (Net)", " %"]:
        col = col.replace(suffix, "")
    return col.strip()


# ── Data fetchers ─────────────────────────────────────────────────────────────

def _fetch_asset_allocation(portfolio_id: str, start_date: str, end_date: str) -> list[dict]:
    ids = list(ASSET_CODES.keys())
    settings = md.direct.get_data_point_settings(data_point_ids=ids)
    data = md.direct.portfolio.get_data(
        portfolio_id=portfolio_id,
        data_point_settings=settings,
        start_date=start_date,
        end_date=end_date,
    )
    rows = _extract_values(data, ids)
    return [
        {"category": ASSET_CODES.get(r["_id"], _clean_col_name(r["_col"])), "percentage": round(r["value"], 2)}
        for r in rows
        if r["value"] > 0
    ]


def _fetch_regions(portfolio_id: str, start_date: str, end_date: str, ptype: str) -> list[dict]:
    dataset_id = DATASET_IDS[ptype]["region"]
    data_points = md.direct.portfolio.get_data_set_data_points(data_set_id=dataset_id)
    data_points = data_points[1:-1]
    ids = data_points["data_point_id"].to_list()
    settings = md.direct.get_data_point_settings(data_point_ids=ids)
    data = md.direct.portfolio.get_data(
        portfolio_id=portfolio_id,
        data_point_settings=settings,
        start_date=start_date,
        end_date=end_date,
    )
    rows = _extract_values(data, ids)
    result = []
    for r in rows:
        if "Non-US" in r["_col"]:
            continue
        if r["value"] > 0:
            result.append({"name": _clean_col_name(r["_col"]), "percentage": round(r["value"], 2)})
    result.sort(key=lambda x: x["percentage"], reverse=True)
    return result


def _fetch_sectors(portfolio_id: str, start_date: str, end_date: str, ptype: str) -> list[dict]:
    dataset_id = DATASET_IDS[ptype]["sector"]
    data_points = md.direct.portfolio.get_data_set_data_points(data_set_id=dataset_id)
    # equity: skip first 4 rows; bond: skip first 1 row (same as original code)
    data_points = data_points[4:-1] if ptype == "equity" else data_points[1:-1]
    ids = data_points["data_point_id"].to_list()
    settings = md.direct.get_data_point_settings(data_point_ids=ids)
    data = md.direct.portfolio.get_data(
        portfolio_id=portfolio_id,
        data_point_settings=settings,
        start_date=start_date,
        end_date=end_date,
    )
    rows = _extract_values(data, ids)
    result = []
    for r in rows:
        if r["value"] > 0:
            result.append({"name": _clean_col_name(r["_col"]), "percentage": round(r["value"], 2)})
    result.sort(key=lambda x: x["percentage"], reverse=True)
    return result


def _fetch_stylebox(portfolio_id: str, start_date: str, end_date: str) -> list[dict]:
    ids = list(STYLEBOX_CODES.keys())
    settings = md.direct.get_data_point_settings(data_point_ids=ids)
    data = md.direct.portfolio.get_data(
        portfolio_id=portfolio_id,
        data_point_settings=settings,
        start_date=start_date,
        end_date=end_date,
    )
    rows = _extract_values(data, ids)
    return [
        {"name": STYLEBOX_CODES.get(r["_id"], r["_col"]), "code": r["_id"], "percentage": round(r["value"])}
        for r in rows
    ]


def _fetch_holdings(portfolio_id: str) -> list[dict]:
    df = md.direct.portfolio.get_holdings([portfolio_id])
    result = []
    for _, row in df.iterrows():
        isin = str(row.get("ISIN", "") or "")
        name = str(row.get("Name", "") or "")
        weight = row.get("Weight", 0)
        if isin == "SEK_CASH":
            name = "Kassa, SEK"
            isin = ""
        try:
            w = round(float(weight), 2)
        except (TypeError, ValueError):
            w = 0.0
        result.append({"name": name, "isin": isin, "weight": w})
    result.sort(key=lambda x: x["weight"], reverse=True)
    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "token_configured": bool(os.getenv("MD_AUTH_TOKEN"))}


@app.get("/portfolios")
def list_portfolios():
    _set_auth()
    try:
        df = md.direct.user_items.get_portfolios()
        return [
            {"id": str(row["PortfolioId"]), "name": str(row["Name"]), "type": str(row.get("Type", ""))}
            for _, row in df.iterrows()
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/portfolio/{portfolio_id}")
def get_portfolio_data(
    portfolio_id: str,
    portfolio_type: Literal["equity", "bond"] = "equity",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    _set_auth()

    if not start_date or not end_date:
        start_date, end_date = _current_period()

    try:
        t0 = time.time()
        asset      = _fetch_asset_allocation(portfolio_id, start_date, end_date)
        regions    = _fetch_regions(portfolio_id, start_date, end_date, portfolio_type)
        sectors    = _fetch_sectors(portfolio_id, start_date, end_date, portfolio_type)
        stylebox   = _fetch_stylebox(portfolio_id, start_date, end_date)
        holdings   = _fetch_holdings(portfolio_id)
        elapsed    = round(time.time() - t0, 2)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "portfolio_id":    portfolio_id,
        "portfolio_type":  portfolio_type,
        "period":          {"start": start_date, "end": end_date},
        "fetch_duration_s": elapsed,
        "asset_allocation": asset,
        "regions":          regions,
        "sectors":          sectors,
        "stylebox":         stylebox,
        "holdings":         holdings,
    }
