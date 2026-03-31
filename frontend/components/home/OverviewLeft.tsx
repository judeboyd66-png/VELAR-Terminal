'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { MacroSystemTiles } from '@/components/home/MacroSystemTiles'
import { MarketView }       from '@/components/home/MarketView'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, dec = 2, suffix = '') =>
  v != null ? `${v.toFixed(dec)}${suffix}` : '—'

// ─── Macro grid cell ─────────────────────────────────────────────────────────

function MacroCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="py-3 px-4 border-r border-b last:border-r-0"
      style={{ borderColor: 'var(--line2)' }}
    >
      <div
        className="text-[9px] font-semibold tracking-[0.13em] uppercase mb-2"
        style={{ color: 'var(--taupe)' }}
      >
        {label}
      </div>
      <div
        className="text-[18px] font-bold tabular-nums leading-none"
        style={{
          letterSpacing: '-0.03em',
          color: value === '—' ? 'var(--t4)' : 'var(--t1)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface OverviewLeftProps {
  activeTicker?: string
  onTickerSelect?: (sym: string) => void
}

export function OverviewLeft({ activeTicker, onTickerSelect }: OverviewLeftProps) {

  // — Macro data —
  const { data: fedFunds } = useQuery({
    queryKey: ['fred-fedfunds-ov'],
    queryFn:  () => api.macro.series('FEDFUNDS', '2023-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 3_600_000,
  })

  const { data: cpi } = useQuery({
    queryKey: ['fred-cpi-ov'],
    queryFn:  () => api.macro.series('CPIAUCSL', '2024-01-01').then(r => {
      const a = r.data
      if (a.length < 13) return null
      return ((a[a.length - 1].value - a[a.length - 13].value) / a[a.length - 13].value) * 100
    }),
    staleTime: 3_600_000,
  })

  const { data: unemployment } = useQuery({
    queryKey: ['fred-unrate-ov'],
    queryFn:  () => api.macro.series('UNRATE', '2024-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 3_600_000,
  })

  const { data: t2y } = useQuery({
    queryKey: ['fred-dgs2-ov'],
    queryFn:  () => api.macro.series('DGS2', '2024-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 3_600_000,
  })

  const { data: quotes } = useQuery({
    queryKey: ['overview-quotes'],
    queryFn:  () => api.market.quotes(['^TNX', '^VIX', 'DX-Y.NYB', 'SPY', 'GC=F', 'CL=F', 'QQQ']).then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })

  const tenY   = quotes?.find(q => q.symbol === '^TNX')
  const spread = tenY?.price != null && t2y != null ? tenY.price - t2y : null

  return (
    <div className="flex flex-col gap-5">

      {/* ── Weekly Systems ───────────────────────────────────────── */}
      <MacroSystemTiles />

      {/* ── Macro Data ───────────────────────────────────────────── */}
      <div>
        <div className="section-label mb-4">Macro</div>
        <div
          className="grid grid-cols-6 border-t border-l"
          style={{ borderColor: 'var(--line2)' }}
        >
          <MacroCell label="CPI YoY"      value={fmt(cpi,          2, '%')} />
          <MacroCell label="Fed Funds"    value={fmt(fedFunds,     2, '%')} />
          <MacroCell label="Unemployment" value={fmt(unemployment, 2, '%')} />
          <MacroCell label="2Y Yield"     value={fmt(t2y,          2, '%')} />
          <MacroCell label="10Y Yield"    value={fmt(tenY?.price,  2, '%')} />
          <MacroCell label="Yield Spread" value={fmt(spread,       2, '%')} />
        </div>
      </div>

      {/* ── Market View ──────────────────────────────────────────── */}
      <div>
        <div className="section-label mb-4">Market View</div>
        <MarketView activeTicker={activeTicker} />
      </div>

    </div>
  )
}
