import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Always load from the directory this file lives in
load_dotenv(Path(__file__).parent / ".env", override=True)

from routers import market, macro, analytics, backtest, news, ai_brief, calendar, journal


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("SIGNAL backend starting...")
    yield
    print("SIGNAL backend shutting down.")


app = FastAPI(
    title="SIGNAL — Macro Research Terminal API",
    description="Backend API for the SIGNAL macro research terminal.",
    version="0.2.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Production — update with your real Vercel URL after first deploy
    "https://velar-terminal.vercel.app",
    "https://velar-terminal-judeboyd66-png.vercel.app",
]
# Allow all *.vercel.app preview URLs during development
ALLOWED_ORIGIN_REGEX = r"https://velar.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router,    prefix="/market",    tags=["Market"])
app.include_router(macro.router,     prefix="/macro",     tags=["Macro"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(backtest.router,  prefix="/backtest",  tags=["Backtest"])
app.include_router(news.router,      prefix="/news",      tags=["News"])
app.include_router(ai_brief.router,  prefix="/ai",        tags=["AI"])
app.include_router(calendar.router,  prefix="/calendar",  tags=["Calendar"])
app.include_router(journal.router,   prefix="/journal",   tags=["Journal"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "signal-api", "version": "0.2.0"}
