import axios from 'axios'

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 20000,
})

export interface MarketQuote {
  symbol: string
  price: number
  change: number
  changePct: number
  prev: number
  label?: string
}

export interface TimeSeriesPoint {
  date:  string
  value: number   // close price
  open?: number
  high?: number
  low?:  number
}

export interface EarningsEntry {
  ticker: string
  name: string
  mcap: number
  sector: string
  lastDate: string | null
  fiscalQ: string | null
  epsEst: number | null
  epsActual: number | null
  surprise: number | null
  revenueEst: number | null
  revenueActual: number | null
  revSurprise: number | null
  nextDate: string | null
  priceChange: number | null
}

export interface NewsArticle {
  title: string
  summary: string
  source: string
  url: string
  tag: string
  impact?: 'high' | 'medium' | 'low'
  published: string
  ts: number
  pinned?: boolean
}

export interface TradeSetup {
  pair: string
  direction: 'Long' | 'Short'
  reason: string
  conviction: 'High' | 'Medium' | 'Low'
}

export interface WatchItem {
  event: string
  when: string
  why: string
}

export interface AiBrief {
  regime: string
  regime_reason: string
  headline: string
  brief: string
  watch: WatchItem[]
  setups: TradeSetup[]
  risks: string[]
}

export const api = {
  market: {
    quotes: (symbols: string[]) =>
      client.get<MarketQuote[]>('/market/quotes', { params: { symbols: symbols.join(',') } }),
    timeSeries: (symbol: string, period = '1y', interval = '1d') =>
      client.get<TimeSeriesPoint[]>('/market/series', { params: { symbol, period, interval } }),
  },

  macro: {
    series: (series_id: string, start?: string) =>
      client.get<TimeSeriesPoint[]>('/macro/series', { params: { series_id, start } }),
    yieldCurve: () => client.get('/macro/yield-curve'),
    fedFunds: () => client.get<TimeSeriesPoint[]>('/macro/fed-funds'),
    cpi: () => client.get<TimeSeriesPoint[]>('/macro/cpi'),
    labor: () => client.get('/macro/labor'),
  },

  analytics: {
    multiSeries: (symbols: string[], mode: 'raw' | 'rebase' | 'zscore', period = '2y') =>
      client.get('/analytics/multi-series', { params: { symbols: symbols.join(','), mode, period } }),
    correlation: (symbols: string[], period = '1y') =>
      client.get('/analytics/correlation', { params: { symbols: symbols.join(','), period } }),
  },

  backtest: {
    run: (params: any) => client.post('/backtest/run', params),
  },

  news: {
    feed: (limit = 15) => client.get<NewsArticle[]>('/news/feed', { params: { limit } }),
    earnings: () => client.get<EarningsEntry[]>('/news/earnings'),
  },

  ai: {
    brief: () => client.get<AiBrief>('/ai/brief'),
  },

  calendar: {
    events: (week = 0) =>
      client.get<CalendarResponse>('/calendar/events', { params: { week } }),
  },

  journal: {
    analyzeScreenshot: (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return client.post<{ ok: boolean; data: ScreenshotAnalysis }>('/journal/analyze-screenshot', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      })
    },
  },
}

export interface CalendarEvent {
  title: string
  currency: string
  impact: 'high' | 'medium' | 'low'
  date_iso: string
  timestamp: number | null
  is_past: boolean
  forecast: string
  previous: string
  actual: string
}

export interface ScreenshotAnalysis {
  pair:        string | null
  direction:   'Long' | 'Short' | null
  entry:       number | null
  sl:          number | null
  tp:          number | null
  rrPlanned:   number | null
  riskPct:     number | null
  timeframe:   string | null
  notes:       string | null
}

export interface CalendarResponse {
  events: CalendarEvent[]
  fetched_at: string
  week_offset: number
  week_start: string
  week_end: string
}
