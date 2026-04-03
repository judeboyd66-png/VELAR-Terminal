import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TradeResult    = 'Win' | 'Loss' | 'BE'
export type TradeDirection = 'Long' | 'Short'
export type Timeframe      = '1M' | '5M' | '15M' | '1H' | '4H' | 'D' | 'W'
export type Session        = 'London' | 'New York' | 'Asia' | 'Overlap'

export interface Trade {
  id:           string
  date:         string
  time?:        string
  pair:         string
  direction:    TradeDirection
  timeframe?:   Timeframe
  session?:     Session
  entry?:       number
  sl?:          number
  tp?:          number
  riskPct?:     number
  rrPlanned?:   number
  rrAchieved?:  number
  pnlR?:        number
  result:       TradeResult
  setup?:       string
  notes?:       string
  tags?:        string[]
  screenshot?:  string          // base64 data URL
  createdAt:    string
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface JournalStats {
  totalTrades:  number
  wins:         number
  losses:       number
  breakEvens:   number
  winRate:      number
  profitFactor: number
  totalR:       number
  avgWin:       number
  avgLoss:      number
  bestTrade:    number
  worstTrade:   number
  streak:       number
  avgRR:        number
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
    winRate,
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

// ─── DB mapping ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToTrade(row: any): Trade {
  return {
    id:          row.id,
    date:        row.date,
    time:        row.time,
    pair:        row.pair,
    direction:   row.direction,
    timeframe:   row.timeframe,
    session:     row.session,
    entry:       row.entry,
    sl:          row.sl,
    tp:          row.tp,
    riskPct:     row.risk_pct,
    rrPlanned:   row.rr_planned,
    rrAchieved:  row.rr_achieved,
    pnlR:        row.pnl_r,
    result:      row.result,
    setup:       row.setup,
    notes:       row.notes,
    tags:        row.tags,
    screenshot:  row.screenshot,
    createdAt:   row.created_at,
  }
}

function tradeToDb(trade: Omit<Trade, 'createdAt'>) {
  return {
    id:          trade.id,
    date:        trade.date,
    time:        trade.time ?? null,
    pair:        trade.pair,
    direction:   trade.direction,
    timeframe:   trade.timeframe ?? null,
    session:     trade.session ?? null,
    entry:       trade.entry ?? null,
    sl:          trade.sl ?? null,
    tp:          trade.tp ?? null,
    risk_pct:    trade.riskPct ?? null,
    rr_planned:  trade.rrPlanned ?? null,
    rr_achieved: trade.rrAchieved ?? null,
    pnl_r:       trade.pnlR ?? null,
    result:      trade.result,
    setup:       trade.setup ?? null,
    notes:       trade.notes ?? null,
    tags:        trade.tags ?? null,
    screenshot:  trade.screenshot ?? null,
    // user_id is injected automatically by Supabase RLS from auth.uid()
  }
}

// ─── Supabase CRUD ────────────────────────────────────────────────────────────

export async function loadTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(dbToTrade)
}

export async function addTrade(trade: Omit<Trade, 'id' | 'createdAt'>): Promise<Trade> {
  const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const { data, error } = await supabase
    .from('trades')
    .insert([tradeToDb({ ...trade, id })])
    .select()
    .single()
  if (error) throw error
  return dbToTrade(data)
}

export async function deleteTrade(id: string): Promise<void> {
  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Demo seed (for display purposes only — not saved to DB) ─────────────────

export const DEMO_TRADES: Trade[] = [
  {
    id: 'demo_1', date: '2026-03-21', time: '10:15', pair: 'EURUSD',
    direction: 'Long', timeframe: '1H', session: 'London',
    entry: 1.0842, sl: 1.0815, tp: 1.0896,
    riskPct: 1, rrPlanned: 2, rrAchieved: 2.0, pnlR: 2.0,
    result: 'Win', setup: 'BOS + FVG retest', notes: 'Clean institutional sweep at NY open.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_2', date: '2026-03-20', time: '14:30', pair: 'NAS100',
    direction: 'Short', timeframe: '4H', session: 'New York',
    entry: 19840, sl: 19920, tp: 19680,
    riskPct: 1, rrPlanned: 2, rrAchieved: 2.0, pnlR: 2.0,
    result: 'Win', setup: 'HTF resistance + LTF CHoCH', notes: 'FOMC reaction play.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'demo_3', date: '2026-03-19', time: '08:45', pair: 'GBPUSD',
    direction: 'Short', timeframe: '1H', session: 'London',
    entry: 1.2965, sl: 1.3005, tp: 1.2885,
    riskPct: 0.5, rrPlanned: 2, rrAchieved: -1, pnlR: -1.0,
    result: 'Loss', setup: 'Supply zone rejection', notes: 'Stopped out before continuation.',
    createdAt: new Date().toISOString(),
  },
]
