# VELAR — Macro Research Terminal

> A modern macro research terminal for retail traders. Clean, fast, and signal-driven.

VELAR is a clean, high-performance macro dashboard designed to bridge the gap between retail and institutional analysis. Focused on clarity, speed, and real signal — not clutter.

---

## Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 14 + TypeScript + Tailwind  |
| State     | Zustand + TanStack Query            |
| Backend   | FastAPI (Python)                    |
| Data      | yfinance + FRED API                 |
| Cache     | diskcache (file-based, zero config) |

---

## Structure

```
velar/
├── frontend/               # Next.js app
│   ├── app/               # Pages
│   │   ├── page.tsx       # Overview (main dashboard)
│   │   ├── macro/         # Macro analysis (rates, inflation, etc.)
│   │   ├── calendar/      # Economic calendar (Forex Factory style)
│   │   ├── journal/       # Trade journal
│   │   ├── news/          # Filtered macro/news feed
│   │   └── cot/           # COT positioning / sentiment
│   ├── components/
│   │   ├── shell/         # Sidebar, TopBar
│   │   ├── charts/        # Core chart components
│   │   └── ui/            # Panels, tiles, layout
│   ├── store/             # Zustand global state
│   └── lib/               # api.ts, utils.ts
└── backend/               # FastAPI
    ├── main.py
    ├── routers/            # market, macro, news, cot
    └── services/           # market_service, fred_service, news_service
```

---

## Running Locally

### Step 1 — Install Node.js

```bash
# Using homebrew (recommended)
brew install node

# Or via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
```

### Step 2 — Backend

```bash
cd velar/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Optional: add FRED API key for real macro data
cp .env.example .env
# edit .env and add your FRED_API_KEY
# Get free key at: https://fred.stlouisfed.org/docs/api/api_key.html

# Run
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

### Step 3 — Frontend

```bash
cd velar/frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Design System

- **Background**: `#07080C` — near-black
- **Surface**: `#0D0F16`, `#12151F`
- **Accent**: `#E8A020` — amber signal
- **Data**: `#00D4FF` — cyan
- **Positive**: `#00D97E` / **Negative**: `#FF4560`
- **Font**: Inter (UI) + JetBrains Mono (data/labels)
- **Tight spacing** — information-dense without clutter

---

*VELAR v0.1 — Built for modern macro analysis.*
