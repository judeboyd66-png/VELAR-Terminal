'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Shared symbol list — must match OverviewLeft + SidePanel exactly ─────────
export const OVERVIEW_SYMS = [
  'US02Y', '^TNX', '^VIX', '^MOVE', 'DX-Y.NYB', 'SPY', 'QQQ',
  'GC=F', 'CL=F', 'USDJPY=X', 'BTC-USD', 'EURUSD=X', 'HYG',
]

// ─── Types ────────────────────────────────────────────────────────────────────

type StateVariant = 'sage' | 'coral' | 'neutral'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fv = (v: number | null | undefined, dec = 2, suffix = '') =>
  v != null ? `${v.toFixed(dec)}${suffix}` : '—'

const fvT = (billions: number | null) =>
  billions != null ? `$${(billions / 1000).toFixed(2)}T` : '—'

const fvChg = (v: number | null | undefined, dec = 2) => {
  if (v == null) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(dec)}`
}

// ─── State variant map ────────────────────────────────────────────────────────
// Descriptive states only — no trade signals or directional recommendations

const VARIANT: Record<string, StateVariant> = {
  // sage: calm / positive flow conditions
  Low:        'sage',
  Easing:     'sage',
  Expanding:  'sage',
  // coral: stress signals
  Spiking:    'coral',
  Rising:     'coral',
  Unwinding:  'coral',
  Tightening: 'coral',
  // neutral: informational / indeterminate
  Elevated:   'neutral',
  Falling:    'neutral',
  Flat:       'neutral',
  Building:   'neutral',
  Stable:     'neutral',
  Bid:        'neutral',
  Offered:    'neutral',
  Range:      'neutral',
  Consolidating: 'neutral',
  Strengthening: 'neutral',
  Weakening:  'neutral',
  Neutral:    'neutral',
}

// ─── Single tile ──────────────────────────────────────────────────────────────

function SystemTile({
  title, m1, m2, state,
}: {
  title: string
  m1: { label: string; value: string }
  m2?: { label: string; value: string }
  state: string
}) {
  const v           = VARIANT[state] ?? 'neutral'
  const stateColor  = v === 'sage'  ? 'var(--sage)'
                    : v === 'coral' ? 'var(--coral)'
                    : 'var(--taupe)'
  const stateBg     = v === 'sage'  ? 'rgba(138,170,142,0.07)'
                    : v === 'coral' ? 'rgba(200,136,120,0.07)'
                    : 'rgba(138,122,104,0.05)'
  const stateBorder = v === 'sage'  ? 'rgba(138,170,142,0.18)'
                    : v === 'coral' ? 'rgba(200,136,120,0.18)'
                    : 'rgba(138,122,104,0.12)'

  return (
    <div
      className="shrink-0 w-[152px] rounded-sm border px-4 py-3.5 flex flex-col gap-2.5"
      style={{ background: 'var(--raised)', borderColor: 'var(--line)' }}
    >
      {/* Title */}
      <div className="section-label">{title}</div>

      {/* Metrics */}
      <div className="flex flex-col gap-[3px]">
        <div className="text-[11px] tabular-nums leading-[1.4]">
          <span style={{ color: 'var(--t3)' }}>{m1.label} </span>
          <span style={{ color: 'var(--t2)' }}>{m1.value}</span>
        </div>
        {m2 && (
          <div className="text-[11px] tabular-nums leading-[1.4]">
            <span style={{ color: 'var(--t3)' }}>{m2.label} </span>
            <span style={{ color: 'var(--t2)' }}>{m2.value}</span>
          </div>
        )}
      </div>

      {/* State badge */}
      <div
        className="self-start text-[8px] font-semibold tracking-[0.09em] uppercase px-[7px] py-[3px] rounded-sm border"
        style={{ color: stateColor, background: stateBg, borderColor: stateBorder }}
      >
        {state}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MacroSystemTiles() {

  // — Shared quote cache (same key + fn as OverviewLeft and SidePanel) ────────
  const { data: quotes } = useQuery({
    queryKey: ['overview-quotes'],
    queryFn:  () => api.market.quotes(OVERVIEW_SYMS).then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })

  // — FRED liquidity components ─────────────────────────────────────────────
  const { data: walcl } = useQuery({
    queryKey: ['fred-walcl'],
    queryFn:  () => api.macro.series('WALCL', '2024-06-01').then(r => {
      const a = r.data
      if (a.length < 2) return null
      return { current: a[a.length - 1].value, prev: a[a.length - 2].value }
    }),
    staleTime: 24 * 3_600_000,
    retry: 1,
  })

  const { data: tga } = useQuery({
    queryKey: ['fred-wtregen'],
    queryFn:  () => api.macro.series('WTREGEN', '2024-06-01').then(r => {
      const a = r.data
      if (a.length < 2) return null
      return { current: a[a.length - 1].value, prev: a[a.length - 2].value }
    }),
    staleTime: 24 * 3_600_000,
    retry: 1,
  })

  const { data: rrp } = useQuery({
    queryKey: ['fred-rrp'],
    queryFn:  () => api.macro.series('RRPONTSYD', '2024-06-01').then(r => {
      const a = r.data
      if (a.length < 2) return null
      return { current: a[a.length - 1].value, prev: a[a.length - 2].value }
    }),
    staleTime: 24 * 3_600_000,
    retry: 1,
  })

  // ─── Quote lookups ─────────────────────────────────────────────────────────
  const gq = (sym: string) => quotes?.find(q => q.symbol === sym)

  const vix    = gq('^VIX')
  const move   = gq('^MOVE')
  const tenY   = gq('^TNX')
  const dxy    = gq('DX-Y.NYB')
  const gold   = gq('GC=F')
  const oil    = gq('CL=F')
  const usdjpy = gq('USDJPY=X')

  // ─── Liquidity calc ────────────────────────────────────────────────────────
  const walclBn     = walcl ? walcl.current / 1000 : null
  const walclPrevBn = walcl ? walcl.prev    / 1000 : null
  const tgaBn       = tga   ? tga.current          : null
  const tgaPrevBn   = tga   ? tga.prev              : null
  const rrpBn       = rrp   ? rrp.current           : null
  const rrpPrevBn   = rrp   ? rrp.prev              : null

  const netLiqBn = walclBn != null && tgaBn != null && rrpBn != null
    ? walclBn - tgaBn - rrpBn : walclBn
  const netLiqPrevBn = walclPrevBn != null && tgaPrevBn != null && rrpPrevBn != null
    ? walclPrevBn - tgaPrevBn - rrpPrevBn : walclPrevBn

  // ─── State derivations — descriptive only ─────────────────────────────────

  // 1. Volatility — VIX level (MOVE shown as headline metric)
  const volState: string =
    vix?.price == null  ? 'Neutral'
    : vix.price > 30    ? 'Spiking'
    : vix.price > 20    ? 'Elevated'
    : vix.price < 14    ? 'Low'
    : 'Easing'

  // 2. Rates — 10Y yield daily change direction
  const ratesState: string =
    tenY?.changePct == null       ? 'Flat'
    : tenY.changePct > 0.04       ? 'Rising'
    : tenY.changePct < -0.04      ? 'Falling'
    : 'Flat'

  // 3. Dollar — DXY daily change
  const dollarState: string =
    dxy?.changePct == null       ? 'Flat'
    : dxy.changePct > 0.2        ? 'Strengthening'
    : dxy.changePct < -0.2       ? 'Weakening'
    : 'Flat'

  // 4. Yen Carry — USDJPY level
  const carryState: string =
    usdjpy?.price == null        ? 'Stable'
    : usdjpy.price > 155         ? 'Building'
    : usdjpy.price < 145 && (usdjpy.changePct ?? 0) < -0.5 ? 'Unwinding'
    : 'Stable'

  // 5. Gold — daily change direction
  const goldState: string =
    gold?.changePct == null      ? 'Consolidating'
    : gold.changePct > 0.5       ? 'Bid'
    : gold.changePct < -0.5      ? 'Offered'
    : 'Consolidating'

  // 6. Oil — daily change direction
  const oilState: string =
    oil?.changePct == null       ? 'Range'
    : oil.changePct > 1.0        ? 'Bid'
    : oil.changePct < -1.0       ? 'Offered'
    : 'Range'

  // 7. Liquidity — net change week-on-week
  const liqState: string =
    netLiqBn == null || netLiqPrevBn == null ? 'Neutral'
    : netLiqBn > netLiqPrevBn + 50           ? 'Expanding'
    : netLiqBn < netLiqPrevBn - 50           ? 'Tightening'
    : 'Neutral'

  return (
    <div>
      <div className="section-label mb-3">Systems</div>

      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* 1 ── Volatility (MOVE headline + VIX) */}
        <SystemTile
          title="Volatility"
          m1={{ label: 'MOVE', value: fv(move?.price, 1) }}
          m2={{ label: 'VIX',  value: fv(vix?.price,  1) }}
          state={volState}
        />

        {/* 2 ── Rates */}
        <SystemTile
          title="Rates"
          m1={{ label: '10Y', value: fv(tenY?.price,     2, '%') }}
          m2={{ label: 'Chg', value: fvChg(tenY?.change, 3) }}
          state={ratesState}
        />

        {/* 3 ── Dollar */}
        <SystemTile
          title="Dollar"
          m1={{ label: 'DXY', value: fv(dxy?.price,      2) }}
          m2={{ label: 'Chg', value: fvChg(dxy?.changePct, 2) + '%' }}
          state={dollarState}
        />

        {/* 4 ── Yen Carry */}
        <SystemTile
          title="Yen Carry"
          m1={{ label: 'USDJPY', value: fv(usdjpy?.price,     2) }}
          m2={{ label: 'Chg',    value: fvChg(usdjpy?.change, 2) }}
          state={carryState}
        />

        {/* 5 ── Gold */}
        <SystemTile
          title="Gold"
          m1={{ label: 'XAU', value: fv(gold?.price,      0) }}
          m2={{ label: 'Chg', value: fvChg(gold?.changePct, 2) + '%' }}
          state={goldState}
        />

        {/* 6 ── Oil */}
        <SystemTile
          title="Oil"
          m1={{ label: 'WTI', value: fv(oil?.price,      2) }}
          m2={{ label: 'Chg', value: fvChg(oil?.changePct, 2) + '%' }}
          state={oilState}
        />

        {/* 7 ── Liquidity */}
        <SystemTile
          title="Liquidity"
          m1={{ label: 'Fed BS',  value: fvT(walclBn)  }}
          m2={{ label: 'Net Liq', value: fvT(netLiqBn) }}
          state={liqState}
        />
      </div>
    </div>
  )
}
