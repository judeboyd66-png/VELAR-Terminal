"""analytics.py — stub router"""
from fastapi import APIRouter
router = APIRouter()

@router.get("/multi-series")
def multi_series(): return []

@router.get("/correlation")
def correlation(): return {}
