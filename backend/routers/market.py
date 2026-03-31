"""
market.py — Live market quotes and time series
Sources:
  - Stooq real-time /q/l/ (equities, FX, commodities, crypto) — no key
  - FRED API (10Y yield, VIX) — FRED_API_KEY in .env
  - Fallback: Yahoo Finance v8 direct (if not rate-limited)
"""
from __future__ import annotations
import os, requests, logging, time
from fastapi import APIRouter, Query, HTTPException
from diskcache import Cache
from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

router = APIRouter()
cache  = Cache("/tmp/signal_cache")
log    = logging.getLogger(__name__)

LABEL_MAP = {
    'SPY':       'S&P 500',
    'QQQ':       'Nasdaq',
    '^VIX':      'VIX',
    'DX-Y.NYB':  'DXY',
    'USDJPY=X':  'USDJPY',
    'CL=F':      'WTI',
    'GC=F':      'Gold',
    '^TNX':      '10Y',
    'EURUSD=X':  'EURUSD',
    'BTC-USD':   'BTC',
    '^GSPC':     'S&P 500',
    '^IXIC':     'Nasdaq',
    'GBPUSD=X':  'GBPUSD',
    'AUDUSD=X':  'AUDUSD',
}

# Stooq real-time symbol map (use /q/l/ endpoint)
_STOOQ_RT = {
    'SPY':       'spy.us',
    'QQQ':       'qqq.us',
    'EURUSD=X':  'eurusd',
    'USDJPY=X':  'usdjpy',
    'GBPUSD=X':  'gbpusd',
    'AUDUSD=X':  'audusd',
    'BTC-USD':   'btc.v',
    'GC=F':      'xauusd',
    'DX-Y.NYB':  'dx.f',
    'CL=F':      'cl.f',
}

# Stooq historical symbol map (use /q/d/l/ for time series)
_STOOQ_HIST = {
    'SPY':       'spy.us',
    'QQQ':       'qqq.us',
    'EURUSD=X':  'eurusd',
    'USDJPY=X':  'usdjpy',
    'GBPUSD=X':  'gbpusd',
    'AUDUSD=X':  'audusd',
    'BTC-USD':   'btc.v',
    'GC=F':      'xauusd',
    'CL=F':      'cl.f',
    'DX-Y.NYB':  'dx.f',
}

# FRED historical series map (for symbols Stooq doesn't carry historically)
_FRED_HIST = {
    '^TNX': 'DGS10',
    '^VIX': 'VIXCLS',
}

# FRED series for symbols Stooq doesn't handle well
_FRED_MAP = {
    '^TNX': 'DGS10',
    '^VIX': 'VIXCLS',
}

_HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
_FRED_KEY = os.getenv('FRED_API_KEY', '')


def _safe_float(v) -> float | None:
    try:
        f = float(str(v).strip())
        return None if (f != f) or f == 0 else f
    except Exception:
        return None


def _stooq_rt_quote(symbol: str) -> dict | None:
    """Real-time quote from Stooq /q/l/ endpoint.
    Returns price from last session. Uses Open as proxy for prev_close for futures.
    """
    stooq_sym = _STOOQ_RT.get(symbol)
    if not stooq_sym:
        return None
    try:
        r = requests.get(
            'https://stooq.com/q/l/',
            params={'s': stooq_sym, 'f': 'sd2ohlc', 'h': '', 'e': 'csv'},
            headers=_HEADERS,
            timeout=8,
        )
        if not r.ok:
            return None
        lines = [l for l in r.text.strip().split('\n') if l and not l.startswith('Symbol')]
        if not lines:
            return None
        parts = lines[0].split(',')
        # format: Symbol, Date, Open, High, Low, Close
        if len(parts) < 6:
            return None
        price = _safe_float(parts[5])  # Close
        open_ = _safe_float(parts[2])  # Open (proxy for prev_close for intraday)
        if price is None:
            return None

        # For better prev_close, check if we have it cached from yesterday
        prev_key = f"prev_close_{symbol}"
        prev = cache.get(prev_key) or open_

        change     = (price - prev) if prev else 0
        change_pct = (change / prev * 100) if prev else 0

        # Store this close as prev for next day (expire at end of next trading day)
        cache.set(prev_key, price, expire=86400)

        return {
            'symbol':    symbol,
            'label':     LABEL_MAP.get(symbol, symbol),
            'price':     round(price, 4),
            'change':    round(change, 4),
            'changePct': round(change_pct, 3),
            'prev':      round(prev, 4) if prev else None,
        }
    except Exception as e:
        log.debug(f"Stooq RT quote failed for {symbol}: {e}")
        return None


def _fred_quote(symbol: str) -> dict | None:
    """Latest observation from FRED (VIX, 10Y yield)."""
    series_id = _FRED_MAP.get(symbol)
    if not series_id or not _FRED_KEY:
        return None
    try:
        r = requests.get(
            'https://api.stlouisfed.org/fred/series/observations',
            params={
                'series_id': series_id, 'api_key': _FRED_KEY,
                'sort_order': 'desc', 'limit': 5, 'file_type': 'json',
            },
            timeout=8,
        )
        if not r.ok:
            return None
        obs = [o for o in r.json().get('observations', []) if o.get('value', '.') != '.']
        if not obs:
            return None
        price = _safe_float(obs[0]['value'])
        prev  = _safe_float(obs[1]['value']) if len(obs) >= 2 else None
        if price is None:
            return None
        change     = (price - prev) if prev else 0
        change_pct = (change / prev * 100) if prev else 0
        return {
            'symbol':    symbol,
            'label':     LABEL_MAP.get(symbol, symbol),
            'price':     round(price, 4),
            'change':    round(change, 4),
            'changePct': round(change_pct, 3),
            'prev':      round(prev, 4) if prev else None,
        }
    except Exception as e:
        log.debug(f"FRED quote failed for {symbol}: {e}")
        return None


def _fetch_quote(symbol: str) -> dict | None:
    """Route to best available source."""
    if symbol in _FRED_MAP:
        return _fred_quote(symbol)
    if symbol in _STOOQ_RT:
        return _stooq_rt_quote(symbol)
    return None


def _fred_series(symbol: str, period: str) -> list[dict]:
    """Historical observations from FRED for ^TNX, ^VIX etc."""
    series_id = _FRED_HIST.get(symbol)
    if not series_id or not _FRED_KEY:
        return []
    period_days = {'5d': 7, '1mo': 35, '3mo': 95, '6mo': 185, '1y': 370,
                   '2y': 730, '5y': 1830, '10y': 3650}
    lookback = period_days.get(period, 370)
    start = (datetime.now() - timedelta(days=lookback)).strftime('%Y-%m-%d')
    try:
        r = requests.get(
            'https://api.stlouisfed.org/fred/series/observations',
            params={
                'series_id': series_id, 'api_key': _FRED_KEY,
                'observation_start': start, 'file_type': 'json',
                'sort_order': 'asc',
            },
            timeout=12,
        )
        if not r.ok:
            return []
        points = []
        for obs in r.json().get('observations', []):
            v = _safe_float(obs.get('value'))
            if v is not None:
                points.append({'date': obs['date'], 'value': round(v, 4)})
        return points
    except Exception as e:
        log.debug(f"FRED series failed for {symbol}: {e}")
        return []


def _stooq_series(symbol: str, period: str, interval: str) -> list[dict]:
    """Historical series from Stooq /q/d/l/."""
    stooq_sym = _STOOQ_HIST.get(symbol)
    if not stooq_sym:
        return []

    period_days = {'5d': 7, '1mo': 35, '3mo': 95, '6mo': 185, '1y': 370,
                   '2y': 730, '5y': 1830, '10y': 3650}
    lookback    = period_days.get(period, 370)
    stooq_freq  = {'1d': 'd', '1wk': 'w', '1mo': 'm'}.get(interval, 'd')

    end   = datetime.now()
    start = end - timedelta(days=lookback)
    try:
        r = requests.get(
            'https://stooq.com/q/d/l/',
            params={'s': stooq_sym, 'd1': start.strftime('%Y%m%d'), 'd2': end.strftime('%Y%m%d'), 'i': stooq_freq},
            headers=_HEADERS,
            timeout=12,
        )
        if not r.ok:
            return []
        points = []
        for line in r.text.strip().split('\n'):
            if not line or line.startswith('Date') or ',' not in line:
                continue
            parts = line.split(',')
            # Stooq format: Date, Open, High, Low, Close[, Volume]
            # Close is always index 4 (index 3 is Low — common off-by-one mistake)
            if len(parts) >= 5:
                close = _safe_float(parts[4])
                if close:
                    points.append({'date': parts[0], 'value': round(close, 4)})
        return points
    except Exception as e:
        log.debug(f"Stooq series failed for {symbol}: {e}")
        return []


@router.get("/quotes")
def get_quotes(symbols: str = Query(...)):
    syms = [s.strip() for s in symbols.split(',') if s.strip()]
    cache_key = f"quotes_v5_{'_'.join(sorted(syms))}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    results = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(_fetch_quote, s): s for s in syms}
        for fut in as_completed(futs):
            q = fut.result()
            if q:
                results.append(q)

    # Preserve original symbol order
    sym_order = {s: i for i, s in enumerate(syms)}
    results.sort(key=lambda q: sym_order.get(q['symbol'], 999))

    if results:
        cache.set(cache_key, results, expire=60)
    return results


@router.get("/series")
def get_series(
    symbol: str   = Query(...),
    period: str   = Query('1y'),
    interval: str = Query('1d'),
):
    cache_key = f"series_v6_{symbol}_{period}_{interval}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    if symbol in _FRED_HIST:
        result = _fred_series(symbol, period)
    else:
        result = _stooq_series(symbol, period, interval)
    if not result:
        raise HTTPException(404, f"No data for {symbol}")
    cache.set(cache_key, result, expire=3600)
    return result
