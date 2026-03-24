"""
calendar.py — ForexFactory economic calendar, multi-week
week=0 → this week, week=1 → next week, week=-1 → last week, etc.
"""
import httpx
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from diskcache import Cache

router = APIRouter()
cache  = Cache("/tmp/signal_cache")

FF_THISWEEK = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
FF_NEXTWEEK = "https://nfs.faireconomy.media/ff_calendar_nextweek.json"


def week_monday(offset: int = 0) -> datetime:
    today = datetime.now(timezone.utc)
    mon = today - timedelta(days=today.weekday())
    return (mon + timedelta(weeks=offset)).replace(hour=0, minute=0, second=0, microsecond=0)


def ff_url(week_offset: int) -> str:
    if week_offset == 0:
        return FF_THISWEEK
    if week_offset == 1:
        return FF_NEXTWEEK
    # FF also serves arbitrary weeks via date query param (Monday of that week)
    date_str = week_monday(week_offset).strftime("%Y-%m-%d")
    return f"{FF_THISWEEK}?week={date_str}"

# Weeks available from FF (this + next are reliable; others are best-effort)
FF_RELIABLE_WEEKS = {0, 1}


def parse_events(raw: list, now: datetime) -> list:
    events = []
    for ev in raw:
        impact = ev.get("impact", "Low")
        if impact in ("Non-Economic", "Holiday", ""):
            continue

        date_str = ev.get("date", "")
        try:
            dt = datetime.fromisoformat(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except Exception:
            dt = None

        events.append({
            "title":     ev.get("title", ""),
            "currency":  ev.get("country", ""),
            "impact":    impact.lower(),
            "date_iso":  date_str,
            "timestamp": dt.timestamp() if dt else None,
            "is_past":   (dt < now) if dt else False,
            "forecast":  ev.get("forecast", "") or "",
            "previous":  ev.get("previous", "") or "",
            "actual":    ev.get("actual", "") or "",
        })

    events.sort(key=lambda e: e["timestamp"] or 0)
    return events


@router.get("/events")
async def get_calendar_events(week: int = 0):
    cache_key = f"ff_cal_w{week}"
    cached = cache.get(cache_key)
    if cached:
        return cached

    url = ff_url(week)
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            r = await client.get(url, headers={"User-Agent": "Velar/1.0"})
            raw = r.json()
    except Exception as e:
        return {"error": str(e), "events": [], "week_offset": week}

    now = datetime.now(timezone.utc)
    mon = week_monday(week)
    sun = mon + timedelta(days=6)

    events = parse_events(raw if isinstance(raw, list) else [], now)

    result = {
        "events":      events,
        "fetched_at":  now.isoformat(),
        "week_offset": week,
        "week_start":  mon.strftime("%Y-%m-%d"),
        "week_end":    sun.strftime("%Y-%m-%d"),
    }
    # Shorter cache for current week (events update), longer for other weeks
    expire = 900 if week == 0 else 3600
    cache.set(cache_key, result, expire=expire)
    return result


# Backward compat
@router.get("/thisweek")
async def get_calendar_thisweek():
    return await get_calendar_events(week=0)
