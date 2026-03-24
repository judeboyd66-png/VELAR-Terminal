"""
ai_brief.py — Groq AI daily macro brief (FREE tier)
Feeds live market prices + FRED data into Llama 3.3 70B → structured trading brief
14,400 free requests/day — no credit card needed
"""
import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from diskcache import Cache

load_dotenv(Path(__file__).parent.parent / ".env", override=True)

router = APIRouter()
cache = Cache("/tmp/signal_cache")

FRED_KEY  = os.getenv("FRED_API_KEY", "")
GROQ_KEY  = os.getenv("GROQ_API_KEY", "")

QUOTE_SYMBOLS = {
    "SPY":       "S&P 500",
    "QQQ":       "Nasdaq 100",
    "^VIX":      "VIX",
    "^TNX":      "10Y Yield",
    "DX-Y.NYB":  "DXY",
    "USDJPY=X":  "USD/JPY",
    "CL=F":      "WTI Crude",
    "GC=F":      "Gold",
    "EURUSD=X":  "EUR/USD",
}

FRED_SERIES = {
    "FEDFUNDS":  "Fed Funds Rate",
    "CPIAUCSL":  "CPI YoY",
    "UNRATE":    "Unemployment Rate",
    "T10Y2Y":    "2s10s Yield Spread",
}


_STOOQ = {'SPY':'spy.us','QQQ':'qqq.us','^VIX':'VIXCLS','^TNX':'DGS10','DX-Y.NYB':'dx.f','USDJPY=X':'usdjpy','CL=F':'cl.f','GC=F':'xauusd','EURUSD=X':'eurusd'}
_HEADERS = {'User-Agent': 'Mozilla/5.0'}

def _fetch_market_snapshot():
    rows = []
    from datetime import datetime, timedelta
    today = datetime.now(); past = today - timedelta(days=7)
    for sym, label in QUOTE_SYMBOLS.items():
        stooq_sym = _STOOQ.get(sym)
        if not stooq_sym:
            continue
        try:
            r = requests.get('https://stooq.com/q/d/l/',
                params={'s': stooq_sym, 'd1': past.strftime('%Y%m%d'), 'd2': today.strftime('%Y%m%d'), 'i': 'd'},
                headers=_HEADERS, timeout=6)
            lines = [l for l in r.text.strip().split('\n') if l and ',' in l and not l.startswith('Date')]
            if len(lines) >= 2:
                close = float(lines[-1].split(',')[3])
                prev  = float(lines[-2].split(',')[3])
                pct   = (close - prev) / prev * 100
                rows.append(f"{label}: {close:.2f} ({pct:+.2f}%)")
        except Exception:
            pass
    return "\n".join(rows)


def _fetch_fred_snapshot():
    rows = []
    if not FRED_KEY:
        return rows
    for series_id, label in FRED_SERIES.items():
        try:
            r = requests.get('https://api.stlouisfed.org/fred/series/observations',
                params={'series_id': series_id, 'api_key': FRED_KEY, 'sort_order': 'desc',
                        'limit': 14, 'file_type': 'json'}, timeout=8)
            obs = [o for o in r.json().get('observations', []) if o.get('value', '.') != '.']
            if not obs:
                continue
            if series_id == "CPIAUCSL" and len(obs) >= 13:
                val = (float(obs[0]['value']) - float(obs[12]['value'])) / float(obs[12]['value']) * 100
                rows.append(f"{label}: {val:.2f}%")
            else:
                rows.append(f"{label}: {float(obs[0]['value']):.2f}")
        except Exception:
            pass
    return "\n".join(rows)


BRIEF_SCHEMA = """
Return a JSON object with EXACTLY these fields (no markdown, just raw JSON):
{
  "regime": "string — one of: Risk-On | Risk-Off | Neutral | Stagflation | Recession Watch",
  "regime_reason": "string — 1 sentence explaining why",
  "headline": "string — punchy 8-12 word summary of today's macro picture",
  "brief": "string — 3-4 sentence narrative. What is happening in markets today, what's driving it, what does the retail trader need to know",
  "watch": [
    { "event": "string", "when": "string", "why": "string — 1 sentence, what to watch for" }
  ],
  "setups": [
    { "pair": "string", "direction": "Long | Short", "reason": "string — 1-2 sentences", "conviction": "High | Medium | Low" }
  ],
  "risks": ["string — 1 sentence each, 2-3 key tail risks this week"]
}
"""

SYSTEM_PROMPT = """You are SIGNAL's AI macro analyst — a senior institutional macro strategist writing a daily brief for retail traders.

Your job:
- Synthesise live market data into clear, actionable insights
- Be direct and specific — say exactly what's happening and what traders should watch
- Identify 2-3 genuine trade setups based on the current macro environment (FX, commodities, indices — no individual stocks)
- Write like a seasoned macro trader, not a generic AI. Be opinionated.
- Keep it digestible for a retail trader who wants to understand the macro picture

Always ground your analysis in the actual data provided. Do not hallucinate prices."""


@router.get("/brief")
def get_ai_brief():
    if not GROQ_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY not set. Get a free key at console.groq.com and add it to signal/backend/.env"
        )

    cache_key = "ai_brief_v2"
    cached = cache.get(cache_key)
    if cached:
        return cached

    # Fetch live data
    market_data = _fetch_market_snapshot()
    fred_data   = _fetch_fred_snapshot()

    user_content = f"""Here is the current market data as of today:

LIVE MARKET PRICES:
{market_data}

MACRO DATA (FRED):
{fred_data}

Based on this data, generate the daily macro brief.
{BRIEF_SCHEMA}"""

    try:
        from groq import Groq
        client = Groq(api_key=GROQ_KEY)

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=1024,
            temperature=0.7,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_content},
            ],
        )

        raw = completion.choices[0].message.content.strip()

        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"JSON parse error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    cache.set(cache_key, result, expire=1800)  # 30 min cache
    return result
