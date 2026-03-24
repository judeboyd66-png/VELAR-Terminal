"""backtest.py — stub router"""
from fastapi import APIRouter
router = APIRouter()

@router.post("/run")
def run_backtest(params: dict = {}): return {"status": "not implemented"}
