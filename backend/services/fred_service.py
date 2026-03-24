"""
FRED data service — wraps fredapi with caching.
Set FRED_API_KEY in .env to enable. Without it, falls back to mock data.
"""
from __future__ import annotations

import os
import pandas as pd
import diskcache
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

CACHE_DIR = Path(__file__).parent.parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)
cache = diskcache.Cache(str(CACHE_DIR))

CACHE_TTL = 60 * 60 * 4  # 4 hours for macro series

# FRED series IDs for key macro indicators
SERIES_MAP = {
    "FEDFUNDS":    "Effective Federal Funds Rate",
    "T10Y2Y":      "10Y-2Y Spread",
    "DGS10":       "10Y Treasury Yield",
    "DGS2":        "2Y Treasury Yield",
    "CPIAUCSL":    "CPI All Items",
    "CPILFESL":    "Core CPI (Ex Food & Energy)",
    "UNRATE":      "Unemployment Rate",
    "ICSA":        "Initial Jobless Claims",
    "PAYEMS":      "Nonfarm Payrolls",
    "AHETPI":      "Average Hourly Earnings",
    "JOLTS":       "Job Openings (JOLTS)",
    "DCOILWTICO":  "WTI Crude Oil Price",
    "DEXJPUS":     "USDJPY Exchange Rate",
    "IRLTLT01JPM156N": "Japan 10Y Bond Yield",
}


def _get_fred_client():
    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        return None
    try:
        from fredapi import Fred
        return Fred(api_key=api_key)
    except ImportError:
        return None


def get_series(series_id: str, start: Optional[str] = None) -> List[dict]:
    key = f"fred:{series_id}:{start}"
    cached = cache.get(key)
    if cached:
        return cached

    fred = _get_fred_client()
    if fred is None:
        # Fall back to mock data if no FRED key
        return _mock_series(series_id)

    try:
        kwargs = {}
        if start:
            kwargs["observation_start"] = start

        s = fred.get_series(series_id, **kwargs)
        s = s.dropna()
        result = [
            {"date": str(idx.date()), "value": round(float(val), 4)}
            for idx, val in s.items()
        ]
        cache.set(key, result, expire=CACHE_TTL)
        return result
    except Exception as e:
        print(f"FRED error for {series_id}: {e}")
        return _mock_series(series_id)


def get_yield_curve() -> List[dict]:
    """Return current yield curve snapshot."""
    tenors = {
        "1M":  "DGS1MO",
        "3M":  "DGS3MO",
        "6M":  "DGS6MO",
        "1Y":  "DGS1",
        "2Y":  "DGS2",
        "3Y":  "DGS3",
        "5Y":  "DGS5",
        "7Y":  "DGS7",
        "10Y": "DGS10",
        "20Y": "DGS20",
        "30Y": "DGS30",
    }
    result = []
    for tenor, sid in tenors.items():
        series = get_series(sid)
        if series:
            result.append({"tenor": tenor, "yield": series[-1]["value"]})
    return result


def _mock_series(series_id: str) -> List[dict]:
    """Generate realistic mock data when FRED API is unavailable."""
    import random
    import math
    from datetime import datetime, timedelta

    base_map = {
        "FEDFUNDS": 5.33, "DFF": 5.33, "DFII10": 2.1,
        "T10YIE": 2.32, "T10Y2Y": -0.41, "DGS10": 4.48,
        "DGS2": 4.89, "CPIAUCSL": 315.0, "CPILFESL": 320.0,
        "UNRATE": 3.9, "ICSA": 215.0, "PAYEMS": 158000.0,
        "AHETPI": 34.5, "DCOILWTICO": 78.0, "DEXJPUS": 157.5,
        "IRLTLT01JPM156N": 1.05, "DTWEXBGS": 104.0,
    }

    base = base_map.get(series_id, 100.0)
    vol = base * 0.01
    n = 260
    start = datetime(2021, 1, 1)
    out = []
    v = base * 0.6  # start lower, trend up
    for i in range(n):
        v = v + (base - v) * 0.015 + random.gauss(0, vol)
        d = start + timedelta(days=i * 5)
        out.append({"date": d.strftime("%Y-%m-%d"), "value": round(max(0, v), 4)})
    return out
