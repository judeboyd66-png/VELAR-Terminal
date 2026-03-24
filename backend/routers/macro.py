from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from services.fred_service import get_series, get_yield_curve

router = APIRouter()


@router.get("/series")
def fred_series(
    series_id: str = Query(..., description="FRED series ID e.g. FEDFUNDS"),
    start: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
):
    try:
        return get_series(series_id, start=start)
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/yield-curve")
def yield_curve():
    try:
        return get_yield_curve()
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/fed-funds")
def fed_funds():
    return get_series("FEDFUNDS", start="2018-01-01")


@router.get("/cpi")
def cpi():
    return get_series("CPIAUCSL", start="2018-01-01")


@router.get("/labor")
def labor():
    return {
        "unemployment": get_series("UNRATE", start="2018-01-01"),
        "claims":       get_series("ICSA", start="2018-01-01"),
        "payrolls":     get_series("PAYEMS", start="2018-01-01"),
        "wages":        get_series("AHETPI", start="2018-01-01"),
    }
