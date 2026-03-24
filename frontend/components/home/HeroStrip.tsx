'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { motion } from 'framer-motion'

const HEROES = [
  { symbol: 'SPY',    label: 'S&P 500',   type: 'pct'   },
  { symbol: '^VIX',   label: 'VIX',       type: 'price' },
  { symbol: '^TNX',   label: '10Y Yield', type: 'price', suffix: '%' },
  { symbol: 'GC=F',   label: 'Gold',      type: 'pct'   },
]

const FALLBACK: Record<string, { price: number; changePct: number; change: number }> = {
  'SPY':   { price: 568.40, changePct:  0.82, change:  4.62 },
  '^VIX':  { price: 18.40,  changePct: -2.10, change: -0.40 },
  '^TNX':  { price: 4.35,   changePct:  0.03, change:  0.03 },
  'GC=F':  { price: 3010,   changePct:  0.18, change:  5.40 },
}

function fmtPrice(price: number, suffix = ''): string {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 }) + suffix
  return price.toFixed(2) + suffix
}

export function HeroStrip() {
  const { data: quotes } = useQuery({
    queryKey: ['hero-strip'],
    queryFn: () => api.market.quotes(HEROES.map(h => h.symbol)).then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  })

  const get = (sym: string) => quotes?.find(q => q.symbol === sym) ?? FALLBACK[sym]

  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--line)', background: 'var(--base)' }}
    >
      <div className="grid grid-cols-4">
        {HEROES.map((h, i) => {
          const d = get(h.symbol)
          const isUp   = d.changePct > 0
          const isDown = d.changePct < 0
          const color  = isUp ? 'var(--sage)' : isDown ? 'var(--coral)' : 'var(--t3)'

          const mainNumber = h.type === 'pct'
            ? `${isUp ? '+' : ''}${d.changePct.toFixed(2)}%`
            : fmtPrice(d.price, h.suffix)

          const sub = h.type === 'pct'
            ? fmtPrice(d.price)
            : `${isUp ? '+' : ''}${d.changePct.toFixed(2)}%`

          return (
            <motion.div
              key={h.symbol}
              className="group px-14 py-10 border-r last:border-none relative"
              style={{ borderColor: 'var(--line)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Subtle hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: 'rgba(255,255,255,0.012)' }} />

              <div className="relative">
                {/* Label */}
                <div className="section-label mb-4">{h.label}</div>

                {/* Main number — editorial scale */}
                <div
                  className="font-bold tabular-nums leading-none mb-3"
                  style={{
                    fontSize: 'clamp(32px, 3.2vw, 48px)',
                    letterSpacing: '-0.04em',
                    color,
                  }}
                >
                  {mainNumber}
                </div>

                {/* Sub — price or % change */}
                <div className="text-[13px] tabular-nums" style={{ color: 'var(--t3)', letterSpacing: '-0.01em' }}>
                  {sub}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
