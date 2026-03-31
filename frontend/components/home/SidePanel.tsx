'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type CalendarEvent, type NewsArticle } from '@/lib/api'

// ─── Config ───────────────────────────────────────────────────────────────────

// Market quotes — 10 assets
const QUOTE_SYMS = ['BTC-USD', 'EURUSD=X', 'QQQ', 'SPY', 'GC=F', 'DX-Y.NYB', '^TNX', 'CL=F', 'USDJPY=X', '^VIX']

const META: Record<string, { label: string; suffix?: string; dec?: number }> = {
  'BTC-USD':   { label: 'BTC',    dec: 0 },
  'EURUSD=X':  { label: 'EURUSD', dec: 4 },
  'QQQ':       { label: 'NAS100', dec: 2 },
  'SPY':       { label: 'SPX',    dec: 2 },
  'GC=F':      { label: 'XAUUSD', dec: 2 },
  'DX-Y.NYB':  { label: 'DXY',    dec: 2 },
  '^TNX':      { label: 'US10Y',  suffix: '%', dec: 2 },
  'CL=F':      { label: 'WTI',    dec: 2 },
  'USDJPY=X':  { label: 'USDJPY', dec: 2 },
  '^VIX':      { label: 'VIX',    dec: 2 },
}

// High-impact event keywords to prioritise
const HIGH_PRIORITY = /CPI|PCE|FOMC|NFP|Non.Farm|Fed|GDP|PMI|Rate|Inflation|Employment|Jobs|Decision|Statement|Payroll/i

// News tag colours — subtle
const TAG_COLOR: Record<string, string> = {
  Macro:     'var(--taupe)',
  Rates:     'var(--amber)',
  Conflict:  'var(--coral)',
  Liquidity: 'var(--sage)',
  Energy:    'var(--amber)',
  FX:        'var(--taupe)',
  Crypto:    'var(--sage)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtPrice(price: number, dec = 2, suffix = '') {
  if (dec === 0) return price.toLocaleString('en-US', { maximumFractionDigits: 0 }) + suffix
  return price.toFixed(dec) + suffix
}

function fmtChange(change: number, dec = 2) {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(dec)}`
}

function fmtAgo(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 60)  return `${m}m`
    const h = Math.floor(m / 60)
    if (h < 24)  return `${h}h`
    return `${Math.floor(h / 24)}d`
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

function formatEventTime(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch { return '' }
}

// ─── Watch row ────────────────────────────────────────────────────────────────

function WatchRow({
  sym, price, change, changePct, isActive, onClick,
}: {
  sym: string; price?: number; change?: number; changePct?: number
  isActive?: boolean; onClick?: () => void
}) {
  const meta   = META[sym] ?? { label: sym, dec: 2 }
  const up     = (changePct ?? 0) > 0
  const down   = (changePct ?? 0) < 0
  const color  = up ? 'var(--sage)' : down ? 'var(--coral)' : 'var(--t3)'

  return (
    <div
      onClick={onClick}
      className="flex items-center justify-between py-[6px] border-b cursor-pointer transition-colors"
      style={{
        borderColor: 'var(--line2)',
        background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      {/* Label */}
      <span
        className="text-[10px] font-semibold tracking-[0.08em] uppercase"
        style={{ color: isActive ? 'var(--t1)' : 'var(--taupe)' }}
      >
        {meta.label}
      </span>

      {/* Price + changes */}
      <div className="text-right">
        <div
          className="text-[12px] font-semibold tabular-nums leading-none"
          style={{ letterSpacing: '-0.02em', color: 'var(--t1)' }}
        >
          {price != null ? fmtPrice(price, meta.dec, meta.suffix) : '—'}
        </div>
        {change != null && changePct != null && (
          <div className="flex items-center justify-end gap-1.5 mt-[2px]">
            <span className="text-[9px] tabular-nums" style={{ color }}>
              {fmtChange(change, meta.dec ?? 2)}
            </span>
            <span className="text-[9px] tabular-nums" style={{ color }}>
              {fmtChange(changePct, 2)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Impact dot ──────────────────────────────────────────────────────────────

const impactDot: Record<string, string> = {
  high:   'bg-coral',
  medium: 'bg-amber',
  low:    'bg-white/10',
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SidePanelProps {
  activeTicker?: string
  onTickerSelect?: (sym: string) => void
}

export function SidePanel({ activeTicker, onTickerSelect }: SidePanelProps) {

  // — Quotes ————————————————————————————————————————————————————————
  const { data: quotes } = useQuery({
    queryKey: ['side-watchlist'],
    queryFn:  () => api.market.quotes(QUOTE_SYMS).then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  })

  // — US02Y from FRED (not on Stooq real-time) ——————————————————————
  const { data: t2y } = useQuery({
    queryKey: ['fred-dgs2-side'],
    queryFn:  () => api.macro.series('DGS2', '2024-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 60 * 60_000,
  })

  // — Calendar events ———————————————————————————————————————————————
  const { data: calData } = useQuery({
    queryKey: ['calendar-side'],
    queryFn:  () => api.calendar.events(0).then(r => r.data),
    staleTime: 15 * 60_000,
    retry: 1,
  })

  // — News ——————————————————————————————————————————————————————————
  const { data: newsData } = useQuery({
    queryKey: ['news-side'],
    queryFn:  () => api.news.feed(3).then(r => r.data),
    staleTime: 15 * 60_000,
    retry: 1,
  })

  const gq = (sym: string) => quotes?.find(q => q.symbol === sym)

  // Filter events: future only, high-priority keywords first, max 5
  const events: CalendarEvent[] = (() => {
    if (!calData?.events) return []
    const upcoming = calData.events.filter((e: CalendarEvent) => !e.is_past)
    const high = upcoming.filter((e: CalendarEvent) =>
      e.impact === 'high' || HIGH_PRIORITY.test(e.title)
    )
    return (high.length ? high : upcoming).slice(0, 4)
  })()

  const news: NewsArticle[] = newsData?.slice(0, 3) ?? []

  return (
    <aside
      className="w-[280px] shrink-0 flex flex-col overflow-y-auto"
      style={{ borderLeft: '1px solid var(--line)', maxHeight: 'calc(100vh - 64px)' }}
    >

      {/* ── Markets ─────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-2">
        <div className="section-label mb-2">Markets</div>

        {QUOTE_SYMS.map(sym => {
          const q = gq(sym)
          return (
            <WatchRow
              key={sym}
              sym={sym}
              price={q?.price}
              change={q?.change}
              changePct={q?.changePct}
              isActive={activeTicker === sym}
              onClick={() => onTickerSelect?.(sym)}
            />
          )
        })}

        {/* US02Y — FRED only */}
        <div className="flex items-center justify-between py-[6px]">
          <span className="text-[10px] font-semibold tracking-[0.08em] uppercase"
            style={{ color: 'var(--taupe)' }}>US02Y</span>
          <div className="text-right">
            <div className="text-[12px] font-semibold tabular-nums"
              style={{ letterSpacing: '-0.02em', color: 'var(--t1)' }}>
              {t2y != null ? `${t2y.toFixed(2)}%` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Events ──────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="section-label mb-2">Key Events</div>
        {events.length > 0 ? (
          <div>
            {events.map((ev, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 py-1.5 border-b last:border-none"
                style={{ borderColor: 'var(--line2)' }}
              >
                <div className="pt-[5px] shrink-0">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${impactDot[ev.impact] ?? 'bg-white/10'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium leading-[1.35]" style={{ color: 'var(--t1)' }}>
                    {ev.title}
                  </div>
                  <div className="flex items-center gap-2 mt-[3px]">
                    {ev.currency && (
                      <span className="text-[8.5px] font-semibold tracking-[0.08em] uppercase px-1.5 py-[2px] rounded-sm border"
                        style={{ color: 'var(--taupe)', borderColor: 'var(--line2)', background: 'var(--raised)' }}>
                        {ev.currency}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--t4)' }}>
                      {formatEventTime(ev.date_iso)}
                    </span>
                  </div>
                </div>
                {ev.forecast && (
                  <div className="text-[9px] tabular-nums shrink-0" style={{ color: 'var(--t4)' }}>
                    F: {ev.forecast}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: 'var(--t4)' }}>No upcoming events</p>
        )}
      </div>

      {/* ── Latest News ─────────────────────────────────────────── */}
      <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="section-label mb-2">Latest News</div>
        {news.length > 0 ? (
          <div>
            {news.map((article, i) => {
              const tag = guessTag(article.title)
              return (
                <div
                  key={i}
                  className="py-1.5 border-b last:border-none"
                  style={{ borderColor: 'var(--line2)' }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
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
                    className="text-[11px] leading-[1.4] hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--t2)', textDecoration: 'none' }}
                  >
                    {article.title}
                  </a>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: 'var(--t4)' }}>No news</p>
        )}
      </div>

    </aside>
  )
}
