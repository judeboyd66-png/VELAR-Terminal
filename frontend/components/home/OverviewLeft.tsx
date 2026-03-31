'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type CalendarEvent, type NewsArticle } from '@/lib/api'
import { MacroSystemTiles, OVERVIEW_SYMS } from '@/components/home/MacroSystemTiles'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined, dec = 2, suffix = '') =>
  v != null ? `${v.toFixed(dec)}${suffix}` : '—'

const fmtChg = (v: number | null | undefined, dec = 2) => {
  if (v == null) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(dec)}`
}

function fmtAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 60)  return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24)  return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return '' }
}

function formatEventDay(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const today = now.toDateString()
    const tomorrow = new Date(now.getTime() + 86400000).toDateString()
    if (d.toDateString() === today)    return 'Today'
    if (d.toDateString() === tomorrow) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch { return '' }
}

function formatEventTime(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York' }) + ' ET'
  } catch { return '' }
}

function guessTag(title: string): string {
  if (/CPI|PCE|inflation|GDP|rate|Fed|FOMC|yield|bond/i.test(title)) return 'Macro'
  if (/yield|treasury|rate hike|cut|taper|QE|QT/i.test(title))       return 'Rates'
  if (/war|conflict|missile|strike|attack|sanctions/i.test(title))    return 'Conflict'
  if (/liquidity|repo|RRP|TGA|balance sheet/i.test(title))            return 'Liquidity'
  if (/oil|energy|OPEC|crude|gas/i.test(title))                       return 'Energy'
  if (/dollar|yen|euro|FX|currency|USDJPY|DXY/i.test(title))         return 'FX'
  if (/bitcoin|BTC|crypto|ethereum/i.test(title))                     return 'Crypto'
  return 'Macro'
}

const TAG_COLOR: Record<string, string> = {
  Macro:     'var(--taupe)',
  Rates:     'var(--amber)',
  Conflict:  'var(--coral)',
  Liquidity: 'var(--sage)',
  Energy:    'var(--amber)',
  FX:        'var(--taupe)',
  Crypto:    'var(--sage)',
}

const HIGH_PRIORITY = /CPI|PCE|FOMC|NFP|Non.Farm|Fed|GDP|PMI|Rate|Inflation|Employment|Jobs|Decision|Statement|Payroll/i

const impactDot: Record<string, string> = {
  high:   'bg-coral',
  medium: 'bg-amber',
  low:    'bg-white/10',
}

// ─── Macro grid cell ──────────────────────────────────────────────────────────

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
        className="text-[17px] font-bold tabular-nums leading-none"
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

// ─── Market Context ───────────────────────────────────────────────────────────
// Shows what's happening across key themes — data + neutral one-line descriptor

function MarketContext({ quotes }: { quotes: ReturnType<typeof useQuery>['data'] }) {
  const gq = (sym: string) => (quotes as any[])?.find((q: any) => q.symbol === sym)

  const vix    = gq('^VIX')
  const move   = gq('^MOVE')
  const tenY   = gq('^TNX')
  const dxy    = gq('DX-Y.NYB')
  const gold   = gq('GC=F')
  const spy    = gq('SPY')
  const qqq    = gq('QQQ')
  const usdjpy = gq('USDJPY=X')
  const eurusd = gq('EURUSD=X')

  // Computed descriptor strings — factual, not directional opinions
  function volDesc() {
    const v = vix?.price; const m = move?.price
    if (!v && !m) return 'No data'
    const parts: string[] = []
    if (v > 25) parts.push('Equity vol elevated')
    else if (v < 14) parts.push('Equity vol subdued')
    else parts.push('Equity vol normal range')
    if (m) {
      if (m > 120) parts.push('bond vol elevated')
      else if (m < 80) parts.push('bond vol low')
      else parts.push('bond vol normal')
    }
    return parts.join('. ') + '.'
  }

  function ratesDesc() {
    const chg = tenY?.changePct
    if (chg == null) return 'No data'
    if (chg > 0.05)  return 'Yields rising. Bond prices falling.'
    if (chg < -0.05) return 'Yields falling. Bond prices rising.'
    return 'Yields little changed.'
  }

  function goldDesc() {
    const chg = gold?.changePct
    if (chg == null) return 'No data'
    if (chg > 1)  return 'Strong safe haven and/or inflation bid.'
    if (chg > 0)  return 'Modest bid. Watching for follow-through.'
    if (chg < -1) return 'Selling pressure. Risk appetite may be improving.'
    return 'Consolidating.'
  }

  function dollarDesc() {
    const chg = dxy?.changePct; const eurChg = eurusd?.changePct
    if (chg == null) return 'No data'
    const eurPart = eurChg != null ? ` EUR ${fmtChg(eurChg, 2)}% on the day.` : ''
    if (chg > 0.3)  return `Dollar strengthening.${eurPart}`
    if (chg < -0.3) return `Dollar softening.${eurPart}`
    return `Dollar flat.${eurPart}`
  }

  function equitiesDesc() {
    const spyChg = spy?.changePct; const qqqChg = qqq?.changePct
    if (spyChg == null) return 'No data'
    const vixPart = vix?.price ? ` VIX ${vix.price.toFixed(1)}.` : ''
    if (spyChg > 0.5 && qqqChg != null && qqqChg > 0.5) return `Both S&P and Nasdaq bid.${vixPart}`
    if (spyChg < -0.5) return `Risk assets under pressure.${vixPart}`
    return `Equities mixed.${vixPart}`
  }

  function yenDesc() {
    const p = usdjpy?.price; const chg = usdjpy?.changePct
    if (!p) return 'No data'
    if (p > 155 && (chg ?? 0) > 0.3)   return 'Yen weakening. Carry trade building.'
    if (p < 145 && (chg ?? 0) < -0.5)  return 'Yen strengthening sharply. Carry unwind risk.'
    if ((chg ?? 0) < -0.3)              return 'Yen gaining. Watch for carry unwind.'
    return 'Yen carry broadly stable.'
  }

  const rows = [
    {
      theme: 'VOLATILITY',
      data:  `VIX ${fmt(vix?.price, 1)}  ${fmtChg(vix?.changePct, 1)}%  ·  MOVE ${fmt(move?.price, 1)}  ${fmtChg(move?.changePct, 1)}%`,
      desc:  volDesc(),
    },
    {
      theme: 'RATES',
      data:  `10Y ${fmt(tenY?.price, 2)}%  ${fmtChg(tenY?.changePct, 2)}%  ·  EURUSD ${fmt(eurusd?.price, 4)}`,
      desc:  ratesDesc(),
    },
    {
      theme: 'GOLD',
      data:  `$${fmt(gold?.price, 0)}  ${fmtChg(gold?.changePct, 2)}%`,
      desc:  goldDesc(),
    },
    {
      theme: 'DOLLAR',
      data:  `DXY ${fmt(dxy?.price, 2)}  ${fmtChg(dxy?.changePct, 2)}%`,
      desc:  dollarDesc(),
    },
    {
      theme: 'EQUITIES',
      data:  `SPX ${fmtChg(spy?.changePct, 2)}%  ·  NAS ${fmtChg(qqq?.changePct, 2)}%`,
      desc:  equitiesDesc(),
    },
    {
      theme: 'YEN',
      data:  `USDJPY ${fmt(usdjpy?.price, 2)}  ${fmtChg(usdjpy?.changePct, 2)}%`,
      desc:  yenDesc(),
    },
  ]

  return (
    <div>
      <div className="section-label mb-3">Market Context</div>
      <div
        className="rounded-sm border overflow-hidden"
        style={{ borderColor: 'var(--line)', background: 'var(--raised)' }}
      >
        {rows.map((row, i) => (
          <div
            key={row.theme}
            className="px-4 py-3 border-b last:border-none"
            style={{ borderColor: 'var(--line2)' }}
          >
            <div className="flex items-start gap-3">
              {/* Theme label */}
              <div
                className="text-[9px] font-semibold tracking-[0.12em] uppercase shrink-0 pt-[1px] w-[72px]"
                style={{ color: 'var(--taupe)' }}
              >
                {row.theme}
              </div>
              {/* Data + descriptor */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-[11px] tabular-nums leading-none mb-[4px]"
                  style={{ color: 'var(--t1)' }}
                >
                  {row.data}
                </div>
                <div
                  className="text-[10px] leading-[1.4]"
                  style={{ color: 'var(--t4)' }}
                >
                  {row.desc}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Today's Agenda ───────────────────────────────────────────────────────────

function TodaysAgenda() {
  const { data: calData } = useQuery({
    queryKey: ['calendar-events'],
    queryFn:  () => api.calendar.events(0).then(r => r.data),
    staleTime: 15 * 60_000,
    retry: 1,
  })

  const events: CalendarEvent[] = (() => {
    if (!calData?.events) return []
    const upcoming = calData.events.filter((e: CalendarEvent) => !e.is_past)
    const high = upcoming.filter((e: CalendarEvent) =>
      e.impact === 'high' || HIGH_PRIORITY.test(e.title)
    )
    return (high.length ? high : upcoming).slice(0, 6)
  })()

  return (
    <div>
      <div className="section-label mb-3">Today&apos;s Agenda</div>
      <div
        className="rounded-sm border overflow-hidden"
        style={{ borderColor: 'var(--line)', background: 'var(--raised)' }}
      >
        {events.length > 0 ? events.map((ev, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-[9px] border-b last:border-none"
            style={{ borderColor: 'var(--line2)' }}
          >
            {/* Impact dot */}
            <span
              className={`inline-block shrink-0 w-1.5 h-1.5 rounded-full ${impactDot[ev.impact] ?? 'bg-white/10'}`}
            />
            {/* Event name */}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium truncate" style={{ color: 'var(--t1)' }}>
                {ev.title}
              </div>
            </div>
            {/* Currency + time */}
            <div className="flex items-center gap-2 shrink-0">
              {ev.currency && (
                <span
                  className="text-[8.5px] font-semibold tracking-[0.08em] uppercase px-1.5 py-[2px] rounded-sm border"
                  style={{ color: 'var(--taupe)', borderColor: 'var(--line2)', background: 'var(--base)' }}
                >
                  {ev.currency}
                </span>
              )}
              <span className="text-[10px] tabular-nums" style={{ color: 'var(--t4)' }}>
                {formatEventDay(ev.date_iso)}
                {ev.date_iso && (() => {
                  const t = formatEventTime(ev.date_iso)
                  return t ? ` · ${t}` : ''
                })()}
              </span>
            </div>
          </div>
        )) : (
          <div className="px-4 py-3 text-[11px]" style={{ color: 'var(--t4)' }}>
            No high-impact releases this week
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Urgent News ──────────────────────────────────────────────────────────────
// Last ~6h breaking headlines only — not the full news feed

function UrgentNews() {
  const { data: newsData } = useQuery({
    queryKey: ['news-feed-overview'],
    queryFn:  () => api.news.feed(20).then(r => r.data),
    staleTime: 15 * 60_000,
    retry: 1,
  })

  const articles: NewsArticle[] = (() => {
    if (!newsData?.length) return []
    const sixHoursAgo = Date.now() - 6 * 60 * 60_000
    const recent = newsData.filter((a: NewsArticle) => {
      try { return new Date(a.published).getTime() > sixHoursAgo } catch { return false }
    })
    // Fall back to top 2 latest if nothing in last 6h
    const pool = recent.length > 0 ? recent : newsData
    return pool.slice(0, 3)
  })()

  if (!articles.length) return null

  return (
    <div>
      <div className="section-label mb-3">Urgent News</div>
      <div
        className="rounded-sm border overflow-hidden"
        style={{ borderColor: 'var(--line)', background: 'var(--raised)' }}
      >
        {articles.map((article, i) => {
          const tag = guessTag(article.title)
          return (
            <div
              key={i}
              className="px-4 py-[9px] border-b last:border-none"
              style={{ borderColor: 'var(--line2)' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[8px] font-semibold tracking-[0.1em] uppercase"
                  style={{ color: TAG_COLOR[tag] ?? 'var(--taupe)' }}
                >
                  {tag}
                </span>
                <span className="text-[9px]" style={{ color: 'var(--t4)' }}>
                  {fmtAgo(article.published)}
                </span>
              </div>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] leading-[1.45] hover:opacity-75 transition-opacity"
                style={{ color: 'var(--t2)', textDecoration: 'none', display: 'block' }}
              >
                {article.title}
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function OverviewLeft() {

  // — Shared quote cache ─────────────────────────────────────────────────────
  const { data: quotes } = useQuery({
    queryKey: ['overview-quotes'],
    queryFn:  () => api.market.quotes(OVERVIEW_SYMS).then(r => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  })

  // — Macro data (FRED) ──────────────────────────────────────────────────────
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

  const tenY   = (quotes as any[])?.find((q: any) => q.symbol === '^TNX')
  const spread = tenY?.price != null && t2y != null ? tenY.price - t2y : null

  return (
    <div className="flex flex-col gap-6">

      {/* ── Systems ──────────────────────────────────────────────── */}
      <MacroSystemTiles />

      {/* ── Market Context ───────────────────────────────────────── */}
      <MarketContext quotes={quotes} />

      {/* ── Two-column: Agenda + News ────────────────────────────── */}
      <div className="grid grid-cols-2 gap-5">
        <TodaysAgenda />
        <UrgentNews />
      </div>

      {/* ── Macro Snapshot ───────────────────────────────────────── */}
      <div>
        <div className="section-label mb-3">Macro</div>
        <div
          className="grid grid-cols-6 border-t border-l"
          style={{ borderColor: 'var(--line2)' }}
        >
          <MacroCell label="CPI YoY"      value={fmt(cpi,          2, '%')} />
          <MacroCell label="Fed Funds"    value={fmt(fedFunds,     2, '%')} />
          <MacroCell label="Unemployment" value={fmt(unemployment, 1, '%')} />
          <MacroCell label="2Y Yield"     value={fmt(t2y,          2, '%')} />
          <MacroCell label="10Y Yield"    value={fmt(tenY?.price,  2, '%')} />
          <MacroCell label="Yield Spread" value={fmt(spread,       2, '%')} />
        </div>
      </div>

    </div>
  )
}
