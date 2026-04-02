'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api, type CalendarEvent } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY']

const CURRENCY_STYLE: Record<string, { color: string; bg: string }> = {
  USD: { color: 'var(--amber)',  bg: 'rgba(196,152,88,0.12)'  },
  EUR: { color: 'var(--sage)',   bg: 'rgba(138,170,142,0.12)' },
  GBP: { color: 'var(--coral)',  bg: 'rgba(200,136,120,0.12)' },
  JPY: { color: 'var(--cream)',  bg: 'rgba(221,208,184,0.10)' },
  AUD: { color: 'var(--sage)',   bg: 'rgba(138,170,142,0.10)' },
  CAD: { color: 'var(--coral)',  bg: 'rgba(200,136,120,0.10)' },
  CHF: { color: 'var(--taupe)', bg: 'rgba(138,122,104,0.10)' },
  NZD: { color: 'var(--taupe)', bg: 'rgba(138,122,104,0.08)' },
  CNY: { color: 'var(--coral)',  bg: 'rgba(200,136,120,0.08)' },
}

const IMPACT_STYLE: Record<string, { color: string; label: string }> = {
  high:   { color: 'var(--coral)',  label: 'High'   },
  medium: { color: 'var(--amber)',  label: 'Medium' },
  low:    { color: 'var(--taupe)', label: 'Low'    },
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December']

// ─── AI Outlook logic ─────────────────────────────────────────────────────────

// Events where a lower-than-expected print is GOOD for the currency
const INVERSE_PATTERNS = [
  'unemployment', 'jobless', 'initial claims', 'continuing claims',
  'claimant count', 'deficit', 'delinquencies', 'insolvencies',
  'bankruptcies', 'foreclosures', 'non-farm payrolls change' // NFP is normal direction
]

// Remove units so we can parse numbers: %, K, M, B, bps
function parseVal(s: string): number {
  if (!s) return NaN
  const cleaned = s.replace(/[%KMBbps\s,]/gi, '').replace(/[()]/g, '')
  return parseFloat(cleaned)
}

function getOutlook(ev: CalendarEvent): { text: string; bullish: boolean } | null {
  if (!ev.is_past || !ev.actual) return null

  const act  = parseVal(ev.actual)
  const fcst = parseVal(ev.forecast)
  if (isNaN(act) || isNaN(fcst)) return null

  const title = ev.title.toLowerCase()
  const isInverse = INVERSE_PATTERNS.some(p => title.includes(p))
  const beatForecast = act > fcst
  const isBullish = isInverse ? !beatForecast : beatForecast
  const sentiment = beatForecast ? 'Beat est.' : 'Missed est.'
  const direction = isBullish ? `↑ bullish ${ev.currency}` : `↓ bearish ${ev.currency}`

  return { text: `${sentiment} — ${direction}`, bullish: isBullish }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number | null): string {
  if (!ts) return 'All Day'
  const d = new Date(ts * 1000)
  let h = d.getUTCHours(), m = d.getUTCMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function dayKey(ts: number | null, dateIso: string): string {
  if (ts) {
    const d = new Date(ts * 1000)
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  }
  return dateIso.slice(0, 10)
}

function dayLabel(key: string, ts: number | null, dateIso: string): string {
  try {
    const d = ts ? new Date(ts * 1000) : new Date(dateIso)
    const day  = DAYS[d.getUTCDay()]
    const mon  = MONTHS[d.getUTCMonth()]
    const date = d.getUTCDate()
    return `${day}, ${mon} ${date}`
  } catch { return key }
}

function weekRangeLabel(start: string, end: string): string {
  try {
    const s = new Date(start + 'T00:00:00Z')
    const e = new Date(end   + 'T00:00:00Z')
    const sm = MONTHS[s.getUTCMonth()].slice(0, 3)
    const em = MONTHS[e.getUTCMonth()].slice(0, 3)
    const sy = s.getUTCFullYear()
    const label = sm === em
      ? `${sm} ${s.getUTCDate()} – ${e.getUTCDate()}, ${sy}`
      : `${sm} ${s.getUTCDate()} – ${em} ${e.getUTCDate()}, ${sy}`
    return `Week of ${label}`
  } catch { return 'This Week' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImpactDot({ impact }: { impact: string }) {
  const style = IMPACT_STYLE[impact] ?? IMPACT_STYLE.low
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="shrink-0 rounded-full"
        style={{ width: 7, height: 7, background: style.color, boxShadow: `0 0 6px ${style.color}40` }}
      />
      <span className="text-[11px]" style={{ color: style.color }}>{style.label}</span>
    </span>
  )
}

function CurrencyBadge({ currency }: { currency: string }) {
  const s = CURRENCY_STYLE[currency] ?? { color: 'var(--t2)', bg: 'rgba(255,255,255,0.05)' }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-[0.06em]"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}
    >
      {currency}
    </span>
  )
}

function ActualCell({ ev }: { ev: CalendarEvent }) {
  if (!ev.is_past || !ev.actual) {
    return <span style={{ color: 'var(--t4)' }}>—</span>
  }
  const act  = parseVal(ev.actual)
  const fcst = parseVal(ev.forecast)
  let color = 'var(--t1)'
  if (!isNaN(act) && !isNaN(fcst)) {
    const title = ev.title.toLowerCase()
    const isInverse = INVERSE_PATTERNS.some(p => title.includes(p))
    const beat = act > fcst
    const good = isInverse ? !beat : beat
    color = good ? 'var(--sage)' : 'var(--coral)'
  }
  return (
    <span className="font-semibold tabular-nums text-[12px]" style={{ color }}>
      {ev.actual}
    </span>
  )
}

function OutlookCell({ ev }: { ev: CalendarEvent }) {
  const outlook = getOutlook(ev)
  if (!outlook) {
    return (
      <span className="text-[10px]" style={{ color: 'var(--t4)' }}>
        {ev.is_past ? '—' : 'Pending'}
      </span>
    )
  }
  return (
    <span
      className="text-[11px]"
      style={{ color: outlook.bullish ? 'var(--sage)' : 'var(--coral)', lineHeight: 1.4 }}
    >
      {outlook.text}
    </span>
  )
}

// Column header
const COL = 'text-[9px] font-bold tracking-[0.12em] uppercase'

function TableHeader() {
  return (
    <div
      className="grid items-center px-6 py-2 sticky z-10"
      style={{
        gridTemplateColumns: '72px 64px 1fr 110px 72px 72px 72px 1fr',
        background: 'var(--raised)',
        borderBottom: '1px solid var(--line)',
        gap: '12px',
        top: 'var(--nav-h)',
      }}
    >
      <span className={COL} style={{ color: 'var(--t4)' }}>Time</span>
      <span className={COL} style={{ color: 'var(--t4)' }}>Curr.</span>
      <span className={COL} style={{ color: 'var(--t4)' }}>Event</span>
      <span className={COL} style={{ color: 'var(--t4)' }}>Impact</span>
      <span className={COL} style={{ color: 'var(--t4)' }}>Forecast</span>
      <span className={COL} style={{ color: 'var(--t4)' }}>Previous</span>
      <span className={COL} style={{ color: 'var(--t4)' }}>Actual</span>
      <span className={COL} style={{ color: 'var(--t4)' }}>Outlook</span>
    </div>
  )
}

function DayHeader({ label, isPast }: { label: string; isPast: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-6 py-2.5"
      style={{
        background: 'var(--base)',
        borderBottom: '1px solid var(--line2)',
        borderTop: '1px solid var(--line2)',
      }}
    >
      <span className="section-label" style={{ opacity: isPast ? 0.45 : 1 }}>{label}</span>
      {isPast && (
        <span className="text-[9px] tracking-[0.08em] uppercase" style={{ color: 'var(--t4)' }}>
          Past
        </span>
      )}
    </div>
  )
}

function EventRow({ ev, index }: { ev: CalendarEvent; index: number }) {
  const isHigh = ev.impact === 'high'
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, delay: index * 0.02 }}
      className="grid items-center px-6 py-3 group"
      style={{
        gridTemplateColumns: '72px 64px 1fr 110px 72px 72px 72px 1fr',
        gap: '12px',
        borderBottom: '1px solid var(--line2)',
        opacity: ev.is_past ? 0.72 : 1,
        background: 'transparent',
        transition: 'background 0.12s',
        cursor: 'default',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Time */}
      <span className="tabular-nums text-[11px]" style={{ color: 'var(--t3)' }}>
        {formatTime(ev.timestamp)}
      </span>

      {/* Currency */}
      <CurrencyBadge currency={ev.currency} />

      {/* Event name */}
      <span
        className="text-[12px] leading-snug"
        style={{
          color: isHigh ? 'var(--t1)' : 'var(--t2)',
          fontWeight: isHigh ? 500 : 400,
        }}
      >
        {ev.title}
      </span>

      {/* Impact */}
      <ImpactDot impact={ev.impact} />

      {/* Forecast */}
      <span className="tabular-nums text-[11px]" style={{ color: 'var(--t3)' }}>
        {ev.forecast || '—'}
      </span>

      {/* Previous */}
      <span className="tabular-nums text-[11px]" style={{ color: 'var(--t3)' }}>
        {ev.previous || '—'}
      </span>

      {/* Actual */}
      <ActualCell ev={ev} />

      {/* Outlook (AI) */}
      <OutlookCell ev={ev} />
    </motion.div>
  )
}

// ─── Filter Dock ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string
  active: boolean
  color?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all outline-none cursor-pointer whitespace-nowrap"
      style={{
        background: active ? (color ? `${color}20` : 'var(--item-active)') : 'transparent',
        border: `1px solid ${active ? (color ?? 'var(--t3)') : 'var(--line)'}`,
        color: active ? (color ?? 'var(--t1)') : 'var(--t3)',
      }}
    >
      {color && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: color }}
        />
      )}
      {label}
    </button>
  )
}

function FilterDock({
  currencies,
  impacts,
  onCurrency,
  onImpact,
}: {
  currencies: Set<string>
  impacts: Set<string>
  onCurrency: (c: string) => void
  onImpact: (i: string) => void
}) {
  return (
    <div
      className="flex items-center gap-2 px-6 py-3 overflow-x-auto"
      style={{
        background: 'var(--raised)',
        borderBottom: '1px solid var(--line)',
        scrollbarWidth: 'none',
      }}
    >
      {/* Currency filters */}
      <span className="text-[9px] font-bold tracking-[0.1em] uppercase shrink-0" style={{ color: 'var(--t4)' }}>
        Currency
      </span>
      <FilterChip
        label="All"
        active={currencies.size === 0}
        onClick={() => { if (currencies.size > 0) CURRENCIES.forEach(c => onCurrency(c)) }}
      />
      {CURRENCIES.map(c => {
        const s = CURRENCY_STYLE[c]
        return (
          <FilterChip
            key={c}
            label={c}
            active={currencies.has(c)}
            color={s?.color}
            onClick={() => onCurrency(c)}
          />
        )
      })}

      {/* Divider */}
      <div className="w-px h-4 mx-2 shrink-0" style={{ background: 'var(--line)' }} />

      {/* Impact filters */}
      <span className="text-[9px] font-bold tracking-[0.1em] uppercase shrink-0" style={{ color: 'var(--t4)' }}>
        Impact
      </span>
      {(['high', 'medium', 'low'] as const).map(imp => {
        const s = IMPACT_STYLE[imp]
        return (
          <FilterChip
            key={imp}
            label={s.label}
            active={impacts.has(imp)}
            color={s.color}
            onClick={() => onImpact(imp)}
          />
        )
      })}
    </div>
  )
}

// ─── Week Navigation ──────────────────────────────────────────────────────────

// FF only reliably serves this week (0) and next week (1)
const MIN_WEEK = 0
const MAX_WEEK = 1

function WeekNav({
  weekOffset,
  weekStart,
  weekEnd,
  onPrev,
  onNext,
  loading,
}: {
  weekOffset: number
  weekStart: string
  weekEnd: string
  onPrev: () => void
  onNext: () => void
  loading: boolean
}) {
  const label = weekStart && weekEnd
    ? weekRangeLabel(weekStart, weekEnd)
    : weekOffset === 0 ? 'This Week' : 'Next Week'

  const canPrev = weekOffset > MIN_WEEK
  const canNext = weekOffset < MAX_WEEK

  return (
    <div
      className="flex items-center justify-between px-6 py-3"
      style={{ borderBottom: '1px solid var(--line)', background: 'var(--base)' }}
    >
      <button
        onClick={onPrev}
        disabled={!canPrev}
        className="flex items-center gap-1.5 text-[11px] transition-colors outline-none px-3 py-1.5 rounded-md"
        style={{
          color: canPrev ? 'var(--t3)' : 'var(--t4)',
          background: 'var(--control-bg)',
          border: '1px solid var(--line)',
          cursor: canPrev ? 'pointer' : 'default',
          opacity: canPrev ? 1 : 0.4,
        }}
        onMouseEnter={e => { if (canPrev) e.currentTarget.style.color = 'var(--t1)' }}
        onMouseLeave={e => { if (canPrev) e.currentTarget.style.color = 'var(--t3)' }}
      >
        <ChevronLeft size={13} />
        Prev week
      </button>

      <div className="flex items-center gap-3">
        {loading && <div className="live-dot" />}
        <span className="text-[12px] font-medium" style={{ color: 'var(--t1)' }}>{label}</span>
        {weekOffset === 0 && (
          <span
            className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(96,200,120,0.12)',
              color: 'var(--live)',
              border: '1px solid rgba(96,200,120,0.25)',
            }}
          >
            Live
          </span>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!canNext}
        className="flex items-center gap-1.5 text-[11px] transition-colors outline-none px-3 py-1.5 rounded-md"
        style={{
          color: canNext ? 'var(--t3)' : 'var(--t4)',
          background: 'var(--control-bg)',
          border: '1px solid var(--line)',
          cursor: canNext ? 'pointer' : 'default',
          opacity: canNext ? 1 : 0.4,
        }}
        onMouseEnter={e => { if (canNext) e.currentTarget.style.color = 'var(--t1)' }}
        onMouseLeave={e => { if (canNext) e.currentTarget.style.color = 'var(--t3)' }}
      >
        Next week
        <ChevronRight size={13} />
      </button>
    </div>
  )
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export function CalendarView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [selCurrencies, setSelCurrencies] = useState<Set<string>>(new Set())
  const [selImpacts, setSelImpacts]       = useState<Set<string>>(new Set())

  const { data, isFetching } = useQuery({
    queryKey: ['calendar', weekOffset],
    queryFn: () => api.calendar.events(weekOffset).then(r => r.data),
    staleTime: 300_000,
    refetchInterval: weekOffset === 0 ? 300_000 : false,
  })

  // Toggle helpers
  function toggleCurrency(c: string) {
    setSelCurrencies(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  function toggleImpact(i: string) {
    setSelImpacts(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  // Filter + group by day
  const grouped = useMemo(() => {
    const events = data?.events ?? []
    const filtered = events.filter(ev => {
      if (selCurrencies.size > 0 && !selCurrencies.has(ev.currency)) return false
      if (selImpacts.size > 0 && !selImpacts.has(ev.impact)) return false
      return true
    })

    const map = new Map<string, { label: string; events: CalendarEvent[]; isPast: boolean }>()
    for (const ev of filtered) {
      const key = dayKey(ev.timestamp, ev.date_iso)
      if (!map.has(key)) {
        map.set(key, { label: dayLabel(key, ev.timestamp, ev.date_iso), events: [], isPast: ev.is_past })
      }
      map.get(key)!.events.push(ev)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [data, selCurrencies, selImpacts])

  const totalVisible = grouped.reduce((n, [, g]) => n + g.events.length, 0)

  return (
    <div className="min-h-screen" style={{ paddingTop: 'var(--nav-h)', background: 'var(--base)' }}>
      {/* Week navigation */}
      <WeekNav
        weekOffset={weekOffset}
        weekStart={data?.week_start ?? ''}
        weekEnd={data?.week_end ?? ''}
        onPrev={() => setWeekOffset(w => Math.max(MIN_WEEK, w - 1))}
        onNext={() => setWeekOffset(w => Math.min(MAX_WEEK, w + 1))}
        loading={isFetching}
      />

      {/* Filter dock */}
      <FilterDock
        currencies={selCurrencies}
        impacts={selImpacts}
        onCurrency={toggleCurrency}
        onImpact={toggleImpact}
      />

      {/* Sticky column header — outside scroll container so sticky works */}
      <TableHeader />

      {/* Table rows — horizontal scroll on mobile */}
      <div className="overflow-x-auto" style={{ background: 'var(--base)' }}>
        <div style={{ minWidth: '700px' }}>

        <AnimatePresence mode="wait">
          <motion.div
            key={weekOffset}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                {isFetching ? (
                  <div className="live-dot" />
                ) : (
                  <>
                    <span className="text-[13px]" style={{ color: 'var(--t3)' }}>
                      No events match your filters
                    </span>
                    <button
                      onClick={() => { setSelCurrencies(new Set()); setSelImpacts(new Set()) }}
                      className="text-[11px] cursor-pointer outline-none"
                      style={{ color: 'var(--amber)' }}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              grouped.map(([key, group]) => (
                <div key={key}>
                  <DayHeader label={group.label} isPast={group.isPast} />
                  {group.events.map((ev, i) => (
                    <EventRow key={`${ev.title}-${ev.timestamp}`} ev={ev} index={i} />
                  ))}
                </div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer count */}
        {totalVisible > 0 && (
          <div
            className="px-6 py-4 text-[10px] flex items-center gap-2"
            style={{ borderTop: '1px solid var(--line2)', color: 'var(--t4)' }}
          >
            <span>{totalVisible} events</span>
            <span>·</span>
            <span>ET (UTC−5)</span>
            <span>·</span>
            <span>Source: ForexFactory</span>
            {data?.fetched_at && (
              <>
                <span>·</span>
                <span>Updated {new Date(data.fetched_at).toLocaleTimeString()}</span>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
