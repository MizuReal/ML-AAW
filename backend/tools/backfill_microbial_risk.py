#!/usr/bin/env python3
"""Compute ``microbial_risk`` for every row in the Supabase ``water_potability``
table and write the label back.

Usage
-----
1.  Set environment variables (or create a ``.env`` file):

        SUPABASE_URL=https://xxxxx.supabase.co
        SUPABASE_SERVICE_KEY=eyJhbG...

2.  Run the script:

        python -m tools.backfill_microbial_risk

    or directly:

        python tools/backfill_microbial_risk.py

The script will:
    a) Read *all* rows from ``water_potability`` in batches.
    b) Compute the rule-based microbial-risk label for each row.
    c) Update each row's ``microbial_risk`` column in Supabase.

Before running, make sure the ``microbial_risk`` column exists on the table.
Run this SQL in the Supabase SQL Editor first:

    ALTER TABLE public.water_potability
      ADD COLUMN IF NOT EXISTS microbial_risk text;

Prerequisites
-------------
    pip install supabase python-dotenv pandas numpy
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

# Allow importing app modules from the backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import numpy as np
import pandas as pd

try:
    from dotenv import load_dotenv
    load_dotenv(BACKEND_DIR / ".env")
except ImportError:
    pass  # dotenv not required if env vars are already set

from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# WHO-threshold scoring  (mirrors app.services.microbial_risk)
# ---------------------------------------------------------------------------

WHO_THRESHOLDS = [
    ("ph",              lambda v: v < 6.5 or v > 8.5, 2),
    ("hardness",        lambda v: v > 300,             1),
    ("solids",          lambda v: v > 27000,           1),
    ("chloramines",     lambda v: v > 9,               2),
    ("sulfate",         lambda v: v > 400,             1),
    ("conductivity",    lambda v: v > 700,             1),
    ("organic_carbon",  lambda v: v > 18,              2),
    ("trihalomethanes", lambda v: v > 80,              1),
    ("turbidity",       lambda v: v > 4,               3),
]

_MAX_SCORE = sum(w for _, _, w in WHO_THRESHOLDS)
HIGH_THRESHOLD = 0.40
MEDIUM_THRESHOLD = 0.20


def _compute_risk(row: dict) -> str:
    score = 0
    for field, test_fn, weight in WHO_THRESHOLDS:
        val = row.get(field)
        if val is None:
            continue
        try:
            val = float(val)
        except (TypeError, ValueError):
            continue
        if not np.isfinite(val):
            continue
        if test_fn(val):
            score += weight
    if score >= _MAX_SCORE * HIGH_THRESHOLD:
        return "high"
    if score >= _MAX_SCORE * MEDIUM_THRESHOLD:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

TABLE_NAME = "water_potability"
BATCH_SIZE = 500  # rows per SELECT page


def _get_client():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        logger.error(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set. "
            "Export them or add a .env file in the backend directory."
        )
        sys.exit(1)
    return create_client(url, key)


def _fetch_all_rows(client) -> list[dict]:
    """Paginate through the entire table."""
    all_rows: list[dict] = []
    offset = 0
    while True:
        resp = (
            client.table(TABLE_NAME)
            .select("id,ph,hardness,solids,chloramines,sulfate,conductivity,organic_carbon,trihalomethanes,turbidity")
            .range(offset, offset + BATCH_SIZE - 1)
            .execute()
        )
        data = resp.data or []
        if not data:
            break
        all_rows.extend(data)
        logger.info("Fetched %d rows (total so far: %d)", len(data), len(all_rows))
        if len(data) < BATCH_SIZE:
            break
        offset += BATCH_SIZE
    return all_rows


def _update_rows(client, updates: list[dict]) -> int:
    """Batch-update rows with their computed microbial_risk label.

    Uses individual upserts because Supabase REST API doesn't support
    bulk UPDATE with different values per row natively.
    """
    success = 0
    for i, upd in enumerate(updates):
        try:
            client.table(TABLE_NAME).update(
                {"microbial_risk": upd["microbial_risk"]}
            ).eq("id", upd["id"]).execute()
            success += 1
        except Exception:
            logger.exception("Failed to update row %s", upd["id"])
        if (i + 1) % 200 == 0:
            logger.info("Updated %d / %d rows …", i + 1, len(updates))
    return success


# ---------------------------------------------------------------------------
# Also update the local CSV with the microbial_risk column
# ---------------------------------------------------------------------------

CSV_PATH = BACKEND_DIR / "water_potability.csv"

COLUMN_MAP = {
    "ph": "ph",
    "Hardness": "hardness",
    "Solids": "solids",
    "Chloramines": "chloramines",
    "Sulfate": "sulfate",
    "Conductivity": "conductivity",
    "Organic_carbon": "organic_carbon",
    "Trihalomethanes": "trihalomethanes",
    "Turbidity": "turbidity",
    "Potability": "is_potable",
}


def update_local_csv():
    """Add microbial_risk column to the local CSV file."""
    if not CSV_PATH.exists():
        logger.warning("Local CSV not found at %s – skipping", CSV_PATH)
        return
    df = pd.read_csv(CSV_PATH)
    rename = {k: v for k, v in COLUMN_MAP.items() if k in df.columns}
    df_norm = df.rename(columns=rename)

    features_cols = [
        "ph", "hardness", "solids", "chloramines", "sulfate",
        "conductivity", "organic_carbon", "trihalomethanes", "turbidity",
    ]

    risks = []
    for _, row in df_norm.iterrows():
        feats = {}
        for c in features_cols:
            val = row.get(c)
            feats[c] = None if pd.isna(val) else float(val)
        risks.append(_compute_risk(feats))

    # Add the column to the *original* (un-renamed) DataFrame
    df["MicrobialRisk"] = risks
    df.to_csv(CSV_PATH, index=False)
    dist = pd.Series(risks).value_counts().to_dict()
    logger.info("Local CSV updated → %s  distribution: %s", CSV_PATH.name, dist)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    logger.info("=== Microbial-risk backfill ===")

    # 1. Update local CSV
    logger.info("--- Updating local CSV ---")
    update_local_csv()

    # 2. Update Supabase
    logger.info("--- Connecting to Supabase ---")
    client = _get_client()

    logger.info("Fetching rows from '%s' …", TABLE_NAME)
    rows = _fetch_all_rows(client)
    logger.info("Total rows fetched: %d", len(rows))

    if not rows:
        logger.warning("No rows found – nothing to update.")
        return

    # Compute labels
    updates = []
    for row in rows:
        risk = _compute_risk(row)
        updates.append({"id": row["id"], "microbial_risk": risk})

    dist = pd.Series([u["microbial_risk"] for u in updates]).value_counts().to_dict()
    logger.info("Label distribution: %s", dist)

    # Write back
    logger.info("Updating %d rows …", len(updates))
    ok = _update_rows(client, updates)
    logger.info("Done – %d / %d rows updated successfully.", ok, len(updates))


if __name__ == "__main__":
    main()
