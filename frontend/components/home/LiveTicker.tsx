'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

const QUOTE_SYMBOLS = [
  'SPY', 'QQQ', '^VIX', 'DX-Y.NYB', 'USDJPY=X',
  'CL=F', 'GC=F', '^TNX', 'EURUSD=X', 'BTC-USD',
]

const TICKER_SYMBOLS = [
  { symbol: 'SPY',       label: 'S&P 500' },
  { symbol: 'QQQ',       label: 'Nasdaq' },
  { symbol: '^VIX',      label: 'VIX' },
  { symbol: 'DX-Y.NYB',  label: 'DXY' },
  { symbol: 'USDJPY=X',  label: 'USDJPY' },
  { symbol: 'CL=F',      label: 'WTI' },
  { symbol: 'GC=F',      label: 'Gold' },
  { symbol: '^TNX',      label: '10Y' },
  { symbol: 'EURUSD=X',  label: 'EURUSD' },
  { symbol: 'BTC-USD',   label: 'Bitcoin' },
]

function TickerItem({ label, price, changePct }: { label: string; price: number; changePct: number }) {
  const up = changePct >= 0
  return (
    <div className="flex items-center gap-2 px-6 h-full border-r border-white/[0.06] whitespace-nowrap shrink-0">
      <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-taupe">{label}</span>
      <span className="text-[12px] font-semibold tabular-nums text-parchment">
        {price >= 1000 ? price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
          : price >= 10 ? price.toFixed(2)
          : price.toFixed(4)}
      </span>
      <span className={`text-[10px] tabular-nums ${up ? 'text-sage' : 'text-coral'}`}>
        {up ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
      </span>
    </div>
  )
}

// Fallback static data when backend is unavailable
const FALLBACK = [
  { symbol: 'SPY',      label: 'S&P 500',  price: 568.42, changePct: 0.82 },
  { symbol: 'QQQ',      label: 'Nasdaq',   price: 489.15, changePct: 1.24 },
  { symbol: '^VIX',     label: 'VIX',      price: 18.4,   changePct: -2.1 },
  { symbol: 'DX-Y.NYB', label: 'DXY',      price: 103.84, changePct: -0.31 },
  { symbol: 'USDJPY=X', label: 'USDJPY',   price: 149.72, changePct: -0.44 },
  { symbol: 'CL=F',     label: 'WTI',      price: 72.40,  changePct: -0.62 },
  { symbol: 'GC=F',     label: 'Gold',     price: 2314,   changePct: 0.18 },
  { symbol: '^TNX',     label: '10Y',      price: 4.35,   changePct: 0.03 },
  { symbol: 'EURUSD=X', label: 'EURUSD',   price: 1.0842, changePct: 0.22 },
  { symbol: 'BTC-USD',  label: 'Bitcoin',  price: 84210,  changePct: 1.8 },
]

export function LiveTicker() {
  const { data: quotes } = useQuery({
    queryKey: ['live-ticker'],
    queryFn: () => api.market.quotes(QUOTE_SYMBOLS).then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  })

  const items = quotes && quotes.length > 0
    ? quotes.map((q: { symbol: string; label?: string; price: number; changePct: number }) => ({ ...q, price: q.price, changePct: q.changePct }))
    : FALLBACK

  // Double for seamless loop
  const doubled = [...items, ...items]

  return (
    <div className="relative h-[30px] bg-raised border-b border-white/[0.07] overflow-hidden flex-shrink-0">
      {/* fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-raised to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-raised to-transparent z-10 pointer-events-none" />

      <div className="ticker-track flex items-center h-full w-max">
        {doubled.map((item, i) => (
          <TickerItem
            key={`${item.symbol}-${i}`}
            label={item.label ?? item.symbol}
            price={item.price}
            changePct={item.changePct}
          />
        ))}
      </div>
    </div>
  )
}
