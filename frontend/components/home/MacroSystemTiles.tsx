'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type StateVariant = 'sage' | 'coral' | 'neutral'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a string like "Mar 28 close" for the most recent Friday */
function lastFridayLabel(): string {
  const d = new Date()
  const dow = d.getDay() // 0=Sun … 6=Sat
  const back = dow === 5 ? 0 : dow === 6 ? 1 : dow + 2
  d.setDate(d.getDate() - back)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' close'
}

const fv = (v: number | null | undefined, dec = 2, suffix = '') =>
  v != null ? `${v.toFixed(dec)}${suffix}` : '—'

const fvT = (billions: number | null) =>
  billions != null ? `$${(billions / 1000).toFixed(2)}T` : '—'

// ─── State variant map ────────────────────────────────────────────────────────

const VARIANT: Record<string, StateVariant> = {
  // green
  Easing:                'sage',
  Improving:             'sage',
  Expanding:             'sage',
  Expansion:             'sage',
  Calm:                  'sage',
  // red
  Tightening:            'coral',
  'Stress rising':       'coral',
  Unwinding:             'coral',
  'Rising stress':       'coral',
  'Inflation risk rising': 'coral',
  // neutral
  'Peak risk':           'neutral',
  'Carry building':      'neutral',
  Cooling:               'neutral',
  Stable:                'neutral',
  Neutral:               'neutral',
  Elevated:              'neutral',
}

// ─── Tile → chart symbol map ──────────────────────────────────────────────────

const TILE_SYMBOL: Record<string, string> = {
  'Fed & Rates':    '^TNX',
  'Private Credit': 'HYG',
  'Yen Carry':      'USDJPY=X',
  'Volatility':     '^VIX',
  'Capex & AI':     'QQQ',
  'Oil & Inflation':'CL=F',
  'Liquidity':      'SPY',
}

// ─── Single tile ──────────────────────────────────────────────────────────────

function SystemTile({
  title,
  m1,
  m2,
  state,
  updated,
  onClick,
}: {
  title: string
  m1: { label: string; value: string }
  m2?: { label: string; value: string }
  state: string
  updated: string
  onClick?: () => void
}) {
  const v            = VARIANT[state] ?? 'neutral'
  const stateColor   = v === 'sage'  ? 'var(--sage)'
                     : v === 'coral' ? 'var(--coral)'
                     : 'var(--taupe)'
  const stateBg      = v === 'sage'  ? 'rgba(138,170,142,0.07)'
                     : v === 'coral' ? 'rgba(200,136,120,0.07)'
                     : 'rgba(138,122,104,0.05)'
  const stateBorder  = v === 'sage'  ? 'rgba(138,170,142,0.18)'
                     : v === 'coral' ? 'rgba(200,136,120,0.18)'
                     : 'rgba(138,122,104,0.12)'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      className="shrink-0 w-[155px] rounded-sm border px-4 py-3.5 flex flex-col gap-2.5 cursor-pointer transition-opacity hover:opacity-80 active:opacity-60"
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

      {/* Updated */}
      <div className="text-[9px]" style={{ color: 'var(--t4)' }}>
        Updated: {updated}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MacroSystemTilesProps {
  onTileSelect?: (sym: string) => void
}

export function MacroSystemTiles({ onTileSelect }: MacroSystemTilesProps) {
  const updated = lastFridayLabel()

  // — Market quotes (reuses cached 'overview-quotes' from OverviewLeft) ——————
  const { data: baseQuotes } = useQuery({
    queryKey: ['overview-quotes'],
    queryFn:  () =>
      api.market.quotes(['^TNX', '^VIX', 'DX-Y.NYB', 'SPY', 'GC=F', 'CL=F', 'QQQ']).then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })

  // — Extra quotes: USDJPY + HYG (new, not in base) ————————————————————————
  const { data: extraQuotes } = useQuery({
    queryKey: ['macro-tiles-extra'],
    queryFn:  () =>
      api.market.quotes(['USDJPY=X', 'HYG']).then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })

  // — FRED series (all reuse existing cache keys from OverviewLeft) ————————
  const { data: t2y } = useQuery({
    queryKey: ['fred-dgs2-ov'],
    queryFn:  () => api.macro.series('DGS2', '2024-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
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

  const { data: cpi } = useQuery({
    queryKey: ['fred-cpi-ov'],
    queryFn:  () => api.macro.series('CPIAUCSL', '2024-01-01').then(r => {
      const a = r.data
      if (a.length < 13) return null
      return ((a[a.length - 1].value - a[a.length - 13].value) / a[a.length - 13].value) * 100
    }),
    staleTime: 3_600_000,
  })

  // — FRED liquidity components ————————————————————————————————————————————
  // WALCL: Fed balance sheet (millions of USD, weekly)
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

  // WTREGEN: Treasury General Account (billions of USD, weekly)
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

  // RRPONTSYD: Overnight Reverse Repos (billions of USD, daily)
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

  // ─── Quote lookups ───────────────────────────────────────────────────────
  const gq = (sym: string) => baseQuotes?.find(q => q.symbol === sym)
  const eq = (sym: string) => extraQuotes?.find(q => q.symbol === sym)

  const vix    = gq('^VIX')
  const wti    = gq('CL=F')
  const qqq    = gq('QQQ')
  const usdjpy = eq('USDJPY=X')
  const hyg    = eq('HYG')

  // ─── State derivations (rule-based only) ─────────────────────────────────

  // 1. Fed & Rates — driven by 2Y yield level
  const fedState: string =
    t2y == null       ? 'Neutral'
    : t2y > 4.5       ? 'Tightening'
    : t2y < 3.0       ? 'Easing'
    : 'Neutral'

  // 2. Private Credit — HYG daily change as stress proxy
  const creditState: string =
    hyg?.changePct == null  ? 'Stable'
    : hyg.changePct < -0.5  ? 'Stress rising'
    : hyg.changePct >  0.3  ? 'Improving'
    : 'Stable'

  // 3. Yen Carry — USDJPY level
  const carryState: string =
    usdjpy?.price == null    ? 'Stable'
    : usdjpy.price > 150     ? 'Carry building'
    : usdjpy.price < 142     ? 'Unwinding'
    : 'Stable'

  // 4. Volatility — VIX level
  const volState: string =
    vix?.price == null   ? 'Calm'
    : vix.price > 25     ? 'Rising stress'
    : vix.price > 20     ? 'Elevated'
    : 'Calm'

  // 5. Capex & AI — QQQ daily change direction
  const capexState: string =
    qqq?.changePct == null   ? 'Peak risk'
    : qqq.changePct >  0.5   ? 'Expansion'
    : qqq.changePct < -0.5   ? 'Cooling'
    : 'Peak risk'

  // 6. Oil & Inflation — WTI momentum + CPI level
  const oilState: string =
    cpi == null                                    ? 'Stable'
    : cpi > 3.5 && (wti?.changePct ?? 0) > 0.8    ? 'Inflation risk rising'
    : cpi < 2.5                                    ? 'Cooling'
    : 'Stable'

  // 7. Liquidity — net = WALCL(millions)/1000 - TGA(billions) - RRP(billions)
  //    All normalised to billions for comparison
  const walclBn     = walcl ? walcl.current / 1000 : null
  const walclPrevBn = walcl ? walcl.prev    / 1000 : null
  const tgaBn       = tga   ? tga.current          : null
  const tgaPrevBn   = tga   ? tga.prev              : null
  const rrpBn       = rrp   ? rrp.current           : null
  const rrpPrevBn   = rrp   ? rrp.prev              : null

  // Use full net liq if all components available; fall back to WALCL direction alone
  const netLiqBn = walclBn != null && tgaBn != null && rrpBn != null
    ? walclBn - tgaBn - rrpBn : walclBn
  const netLiqPrevBn = walclPrevBn != null && tgaPrevBn != null && rrpPrevBn != null
    ? walclPrevBn - tgaPrevBn - rrpPrevBn : walclPrevBn

  const liqState: string =
    netLiqBn == null || netLiqPrevBn == null ? 'Neutral'
    : netLiqBn > netLiqPrevBn + 50           ? 'Expanding'
    : netLiqBn < netLiqPrevBn - 50           ? 'Tightening'
    : 'Neutral'

  return (
    <div className="mb-0">
      <div className="section-label mb-3">Weekly Systems</div>

      <div
        className="flex gap-3 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* 1 ── Fed & Rates */}
        <SystemTile
          title="Fed & Rates"
          m1={{ label: '2Y',   value: fv(t2y,          2, '%') }}
          m2={{ label: 'Unemp', value: fv(unemployment, 1, '%') }}
          state={fedState}
          updated={updated}
          onClick={() => onTileSelect?.(TILE_SYMBOL['Fed & Rates'])}
        />

        {/* 2 ── Private Credit */}
        <SystemTile
          title="Private Credit"
          m1={{ label: 'HYG',  value: fv(hyg?.price,     2) }}
          m2={{ label: 'Chg',  value: fv(hyg?.changePct, 2, '%') }}
          state={creditState}
          updated={updated}
          onClick={() => onTileSelect?.(TILE_SYMBOL['Private Credit'])}
        />

        {/* 3 ── Yen Carry */}
        <SystemTile
          title="Yen Carry"
          m1={{ label: 'USDJPY', value: fv(usdjpy?.price, 2) }}
          m2={{ label: '2Y',     value: fv(t2y,           2, '%') }}
          state={carryState}
          updated={updated}
          onClick={() => onTileSelect?.(TILE_SYMBOL['Yen Carry'])}
        />

        {/* 4 ── Volatility */}
        <SystemTile
          title="Volatility"
          m1={{ label: 'VIX',  value: fv(vix?.price, 1) }}
          m2={{ label: 'MOVE', value: '—' }}
          state={volState}
          updated={updated}
          onClick={() => onTileSelect?.(TILE_SYMBOL['Volatility'])}
        />

        {/* 5 ── Capex & AI */}
        <SystemTile
          title="Capex & AI"
          m1={{ label: 'NAS100', value: fv(qqq?.price,     2) }}
          m2={{ label: 'Chg',    value: fv(qqq?.changePct, 2, '%') }}
          state={capexState}
          updated={updated}
          onClick={() => onTileSelect?.(TILE_SYMBOL['Capex & AI'])}
        />

        {/* 6 ── Oil & Inflation */}
        <SystemTile
          title="Oil & Inflation"
          m1={{ label: 'WTI', value: fv(wti?.price, 2) }}
          m2={{ label: 'CPI', value: fv(cpi,        2, '%') }}
          state={oilState}
          updated={updated}
          onClick={() => onTileSelect?.(TILE_SYMBOL['Oil & Inflation'])}
        />

        {/* 7 ── Liquidity */}
        <SystemTile
          title="Liquidity"
          m1={{ label: 'Fed BS',  value: fvT(walclBn) }}
          m2={{ label: 'Net Liq', value: fvT(netLiqBn) }}
          state={liqState}
          updated={updated}
          onClick={() => onTileSelect?.(TILE_SYMBOL['Liquidity'])}
        />
      </div>
    </div>
  )
}
