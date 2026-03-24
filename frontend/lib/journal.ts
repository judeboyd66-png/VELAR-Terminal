// ─── Types ────────────────────────────────────────────────────────────────────

export type TradeResult    = 'Win' | 'Loss' | 'BE'
export type TradeDirection = 'Long' | 'Short'
export type Timeframe      = '1M' | '5M' | '15M' | '1H' | '4H' | 'D' | 'W'
export type Session        = 'London' | 'New York' | 'Asia' | 'Overlap'

export interface Trade {
  id:           string
  date:         string          // YYYY-MM-DD
  time?:        string          // HH:MM
  pair:         string          // EURUSD, BTCUSD, etc.
  direction:    TradeDirection
  timeframe?:   Timeframe
  session?:     Session
  entry?:       number
  sl?:          number
  tp?:          number
  riskPct?:     number          // % account risked
  rrPlanned?:   number          // planned RR
  rrAchieved?:  number          // actual RR
  pnlR?:        number          // P&L in R multiples
  result:       TradeResult
  setup?:       string          // e.g. "BOS + FVG retest"
  notes?:       string
  tags?:        string[]
  screenshot?:  string          // base64 data URL of chart image
  createdAt:    string
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface JournalStats {
  totalTrades:    number
  wins:           number
  losses:         number
  breakEvens:     number
  winRate:        number         // percentage
  profitFactor:   number
  totalR:         number
  avgWin:         number
  avgLoss:        number
  bestTrade:      number
  worstTrade:     number
  streak:         number         // positive = win streak, negative = loss streak
  avgRR:          number
}

export function calcStats(trades: Trade[]): JournalStats {
  const closed = trades.filter(t => t.pnlR !== undefined)
  const wins   = closed.filter(t => t.result === 'Win')
  const losses = closed.filter(t => t.result === 'Loss')
  const bes    = closed.filter(t => t.result === 'BE')

  const totalR  = closed.reduce((s, t) => s + (t.pnlR ?? 0), 0)
  const grossW  = wins.reduce((s, t) => s + (t.pnlR ?? 0), 0)
  const grossL  = Math.abs(losses.reduce((s, t) => s + (t.pnlR ?? 0), 0))
  const avgWin  = wins.length ? grossW / wins.length : 0
  const avgLoss = losses.length ? grossL / losses.length : 0
  const pf      = grossL > 0 ? grossW / grossL : wins.length ? Infinity : 0
  const winRate = (wins.length + losses.length) > 0
    ? (wins.length / (wins.length + losses.length)) * 100 : 0

  // current streak (most recent trades first)
  let streak = 0
  const sorted = [...closed].sort((a, b) => b.date.localeCompare(a.date))
  if (sorted.length) {
    const first = sorted[0].result
    for (const t of sorted) {
      if (t.result === 'BE') continue
      if (t.result !== first) break
      streak += first === 'Win' ? 1 : -1
    }
  }

  const pnls = closed.map(t => t.pnlR ?? 0)
  const avgRR = closed.filter(t => t.rrAchieved).reduce((s, t) => s + (t.rrAchieved ?? 0), 0)
              / (closed.filter(t => t.rrAchieved).length || 1)

  return {
    totalTrades: closed.length,
    wins:        wins.length,
    losses:      losses.length,
    breakEvens:  bes.length,
    winRate:     winRate,
    profitFactor: pf,
    totalR,
    avgWin,
    avgLoss,
    bestTrade:  Math.max(...pnls, 0),
    worstTrade: Math.min(...pnls, 0),
    streak,
    avgRR,
  }
}

// ─── localStorage persistence ─────────────────────────────────────────────────

const KEY = 'velar-journal'

export function loadTrades(): Trade[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw) as Trade[]
  } catch { return [] }
}

export function saveTrades(trades: Trade[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(trades))
}

export function addTrade(trade: Omit<Trade, 'id' | 'createdAt'>): Trade {
  const full: Trade = {
    ...trade,
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  }
  const all = loadTrades()
  saveTrades([full, ...all])
  return full
}

export function deleteTrade(id: string): void {
  saveTrades(loadTrades().filter(t => t.id !== id))
}

// ─── Demo seed data ───────────────────────────────────────────────────────────

export const DEMO_TRADES: Trade[] = [
  {
    id: 'demo_1', date: '2026-03-21', time: '10:15', pair: 'EURUSD',
    direction: 'Long', timeframe: '1H', session: 'London',
    entry: 1.0842, sl: 1.0815, tp: 1.0896,
    riskPct: 1, rrPlanned: 2, rrAchieved: 2.0, pnlR: 2.0,
    result: 'Win', setup: 'BOS + FVG retest', notes: 'Clean institutional sweep at NY open, textbook entry.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_2', date: '2026-03-20', time: '14:30', pair: 'NAS100',
    direction: 'Short', timeframe: '4H', session: 'New York',
    entry: 19840, sl: 19920, tp: 19680,
    riskPct: 1, rrPlanned: 2, rrAchieved: 2.0, pnlR: 2.0,
    result: 'Win', setup: 'HTF resistance + LTF CHoCH', notes: 'FOMC reaction play. DXY strength.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_3', date: '2026-03-19', time: '08:45', pair: 'GBPUSD',
    direction: 'Short', timeframe: '1H', session: 'London',
    entry: 1.2965, sl: 1.3005, tp: 1.2885,
    riskPct: 0.5, rrPlanned: 2, rrAchieved: -1, pnlR: -1.0,
    result: 'Loss', setup: 'Supply zone rejection', notes: 'SL hit before continuation. Structure held but timing off.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_4', date: '2026-03-18', time: '03:00', pair: 'USDJPY',
    direction: 'Long', timeframe: '4H', session: 'Asia',
    entry: 149.20, sl: 148.85, tp: 149.90,
    riskPct: 1, rrPlanned: 2, rrAchieved: 2.0, pnlR: 2.0,
    result: 'Win', setup: 'Demand zone + Asia liquidity grab', notes: 'BoJ hold expected. Carry trade strength.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_5', date: '2026-03-17', time: '09:30', pair: 'XAUUSD',
    direction: 'Long', timeframe: 'D', session: 'London',
    entry: 3085, sl: 3060, tp: 3135,
    riskPct: 1.5, rrPlanned: 2, rrAchieved: 2.0, pnlR: 3.0,
    result: 'Win', setup: 'Weekly OB continuation', notes: 'Macro tailwind — rate cut bets + safe haven bid.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_6', date: '2026-03-14', time: '13:15', pair: 'BTCUSD',
    direction: 'Long', timeframe: '4H', session: 'New York',
    entry: 82400, sl: 81200, tp: 84800,
    riskPct: 1, rrPlanned: 2, rrAchieved: 0, pnlR: 0,
    result: 'BE', setup: 'Range breakout retest', notes: 'Moved SL to BE after 1R. Price consolidated, no follow-through.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_7', date: '2026-03-13', time: '16:00', pair: 'EURUSD',
    direction: 'Short', timeframe: '1H', session: 'Overlap',
    entry: 1.0901, sl: 1.0925, tp: 1.0853,
    riskPct: 1, rrPlanned: 2, rrAchieved: -1, pnlR: -1.0,
    result: 'Loss', setup: 'Supply + divergence', notes: 'NFP surprise reversed bias. Should have waited.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_8', date: '2026-03-12', time: '10:00', pair: 'AUDUSD',
    direction: 'Short', timeframe: '1H', session: 'London',
    entry: 0.6285, sl: 0.6310, tp: 0.6235,
    riskPct: 1, rrPlanned: 2, rrAchieved: 2.0, pnlR: 2.0,
    result: 'Win', setup: 'Premium array + CHoCH', notes: 'RBA dovish pivot. Clean SMC setup.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_9', date: '2026-03-11', time: '14:45', pair: 'NAS100',
    direction: 'Long', timeframe: '1H', session: 'New York',
    entry: 19420, sl: 19340, tp: 19580,
    riskPct: 1, rrPlanned: 2, rrAchieved: 2.0, pnlR: 2.0,
    result: 'Win', setup: 'Demand + liquidity sweep', notes: 'CPI beat. Tech strength on disinflation narrative.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_10', date: '2026-03-10', time: '09:00', pair: 'USDJPY',
    direction: 'Short', timeframe: '4H', session: 'London',
    entry: 150.85, sl: 151.30, tp: 149.95,
    riskPct: 0.5, rrPlanned: 2, rrAchieved: -1, pnlR: -0.5,
    result: 'Loss', setup: 'HTF distribution', notes: 'BoJ intervention risk. Stopped out.',
    createdAt: new Date().toISOString(),
  },
]
