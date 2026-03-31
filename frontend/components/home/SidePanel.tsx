'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type TimeSeriesPoint } from '@/lib/api'
import { OVERVIEW_SYMS } from '@/components/home/MacroSystemTiles'

// ─── Watchlist display order + labels ─────────────────────────────────────────

const WATCH_ORDER = [
  'BTC-USD', 'EURUSD=X', 'QQQ', 'SPY', 'GC=F',
  'DX-Y.NYB', '^TNX', 'CL=F', 'USDJPY=X', '^VIX',
]

const META: Record<string, { label: string; suffix?: string; dec?: number }> = {
  'BTC-USD':   { label: 'BTC',    dec: 0 },
  'EURUSD=X':  { label: 'EURUSD', dec: 4 },
  'QQQ':       { label: 'NAS100', dec: 2 },
  'SPY':       { label: 'SPX',    dec: 2 },
  'GC=F':      { label: 'XAUUSD', dec: 0 },
  'DX-Y.NYB':  { label: 'DXY',    dec: 2 },
  '^TNX':      { label: 'US10Y',  suffix: '%', dec: 2 },
  'CL=F':      { label: 'WTI',    dec: 2 },
  'USDJPY=X':  { label: 'USDJPY', dec: 2 },
  '^VIX':      { label: 'VIX',    dec: 2 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(price: number, dec = 2, suffix = '') {
  if (dec === 0) return price.toLocaleString('en-US', { maximumFractionDigits: 0 }) + suffix
  return price.toFixed(dec) + suffix
}

function fmtPct(v: number) {
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  const W = 56, H = 20
  if (data.length < 2) return <div style={{ width: W, height: H }} />

  const min   = Math.min(...data)
  const max   = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  const up    = data[data.length - 1] >= data[0]
  const color = up ? 'var(--sage)' : 'var(--coral)'

  return (
    <svg width={W} height={H} style={{ flexShrink: 0, display: 'block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Watch row ────────────────────────────────────────────────────────────────

function WatchRow({
  sym, price, changePct, sparkData,
}: {
  sym: string; price?: number; changePct?: number
  sparkData: number[]
}) {
  const meta  = META[sym] ?? { label: sym, dec: 2 }
  const up    = (changePct ?? 0) > 0
  const down  = (changePct ?? 0) < 0
  const color = up ? 'var(--sage)' : down ? 'var(--coral)' : 'var(--t3)'

  return (
    <div
      className="flex items-center gap-2 py-[8px] border-b"
      style={{ borderColor: 'var(--line2)' }}
    >
      {/* Label */}
      <span
        className="text-[10px] font-semibold tracking-[0.07em] uppercase shrink-0 w-[46px]"
        style={{ color: 'var(--taupe)' }}
      >
        {meta.label}
      </span>

      {/* Sparkline */}
      <div className="flex-1 flex items-center justify-center">
        <Sparkline data={sparkData} />
      </div>

      {/* Price + chg% */}
      <div className="text-right shrink-0">
        <div
          className="text-[12px] font-semibold tabular-nums leading-none"
          style={{ letterSpacing: '-0.02em', color: 'var(--t1)' }}
        >
          {price != null ? fmtPrice(price, meta.dec ?? 2, meta.suffix ?? '') : '—'}
        </div>
        {changePct != null && (
          <div className="text-[9px] tabular-nums mt-[2px]" style={{ color }}>
            {fmtPct(changePct)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SidePanel() {

  // — Shared quote cache (same key + fn as OverviewLeft / MacroSystemTiles) ──
  const { data: quotes } = useQuery({
    queryKey: ['overview-quotes'],
    queryFn:  () => api.market.quotes(OVERVIEW_SYMS).then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  })

  // — US02Y from FRED ─────────────────────────────────────────────────────────
  const { data: t2y } = useQuery({
    queryKey: ['fred-dgs2-ov'],
    queryFn:  () => api.macro.series('DGS2', '2024-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 60 * 60_000,
  })

  // — Sparklines: 1mo daily history per asset (cached 1hr) ───────────────────
  const sparkQueries = WATCH_ORDER.map(sym =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery({
      queryKey: ['spark', sym],
      queryFn:  () => api.market.timeSeries(sym, '1mo', '1d').then(r => r.data),
      staleTime: 60 * 60_000,
      retry: 1,
    })
  )

  const gq = (sym: string) => (quotes as any[])?.find((q: any) => q.symbol === sym)

  function getSparkData(sym: string): number[] {
    const idx = WATCH_ORDER.indexOf(sym)
    if (idx < 0) return []
    const data: TimeSeriesPoint[] = sparkQueries[idx].data ?? []
    // Take last 20 points for the sparkline
    const slice = data.slice(-20)
    return slice.map(p => p.value)
  }

  return (
    <aside
      className="w-[260px] shrink-0 overflow-y-auto"
      style={{
        borderLeft: '1px solid var(--line)',
        maxHeight: 'calc(100vh - 64px)',
        position: 'sticky',
        top: '64px',
      }}
    >
      <div className="px-5 pt-5 pb-4">
        <div className="section-label mb-1">Markets</div>

        {/* Main watchlist — 10 assets */}
        {WATCH_ORDER.map(sym => {
          const q = gq(sym)
          return (
            <WatchRow
              key={sym}
              sym={sym}
              price={q?.price}
              changePct={q?.changePct}
              sparkData={getSparkData(sym)}
            />
          )
        })}

        {/* US02Y — FRED only, no sparkline available */}
        <div
          className="flex items-center gap-2 py-[8px] border-b"
          style={{ borderColor: 'var(--line2)' }}
        >
          <span
            className="text-[10px] font-semibold tracking-[0.07em] uppercase shrink-0 w-[46px]"
            style={{ color: 'var(--taupe)' }}
          >
            US02Y
          </span>
          <div className="flex-1" />
          <div className="text-right shrink-0">
            <div
              className="text-[12px] font-semibold tabular-nums leading-none"
              style={{ letterSpacing: '-0.02em', color: 'var(--t1)' }}
            >
              {t2y != null ? `${t2y.toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
