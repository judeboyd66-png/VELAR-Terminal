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

function TickerItem({ label, price, changePct }: { label: string; price: number | null; changePct: number | null }) {
  const up = (changePct ?? 0) >= 0
  return (
    <div className="flex items-center gap-2 px-6 h-full border-r border-white/[0.06] whitespace-nowrap shrink-0">
      <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-taupe">{label}</span>
      <span className="text-[12px] font-semibold tabular-nums text-parchment">
        {price == null
          ? '—'
          : price >= 1000
            ? price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : price >= 10
              ? price.toFixed(2)
              : price.toFixed(4)}
      </span>
      <span className={`text-[10px] tabular-nums ${changePct == null ? 'text-taupe' : up ? 'text-sage' : 'text-coral'}`}>
        {changePct == null ? 'Live feed pending' : `${up ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}%`}
      </span>
    </div>
  )
}

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
    : TICKER_SYMBOLS.map(item => ({ ...item, price: null, changePct: null }))

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
