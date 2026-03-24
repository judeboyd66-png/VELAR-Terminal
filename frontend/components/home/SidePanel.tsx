'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type CalendarEvent } from '@/lib/api'
import { motion } from 'framer-motion'

// ─── Macro data rows ──────────────────────────────────────────────

function MacroRow({ label, value, sub }: { label: string; value?: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-3.5 border-b last:border-none"
      style={{ borderColor: 'var(--line2)' }}>
      <div>
        <div className="text-[10px] font-semibold tracking-[0.11em] uppercase mb-0.5" style={{ color: 'var(--taupe)' }}>
          {label}
        </div>
        {sub && <div className="text-[9.5px]" style={{ color: 'var(--t4)' }}>{sub}</div>}
      </div>
      <div className="text-[18px] font-bold tabular-nums" style={{ letterSpacing: '-0.03em', color: value ? 'var(--t1)' : 'var(--t4)' }}>
        {value ?? '—'}
      </div>
    </div>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────

const impactDot: Record<string, string> = {
  high:   'bg-coral shadow-[0_0_5px_rgba(200,136,120,0.6)]',
  medium: 'bg-amber',
  low:    'bg-white/15',
}

function formatTime(iso: string) {
  try {
    const dt = new Date(iso)
    return {
      day:  dt.toLocaleDateString('en-US', { weekday: 'short' }),
      date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  } catch { return { day: '', date: '', time: '' } }
}

// ─── COT ──────────────────────────────────────────────────────────

const COT_SIGNALS = [
  { market: 'USD/JPY', direction: 'bearish', note: 'Crowded short — contrarian long JPY' },
  { market: 'Gold',    direction: 'bullish', note: 'Extreme long — positioning supports bid' },
  { market: 'Nasdaq',  direction: 'bearish', note: 'Extreme short — squeeze risk if data soft' },
]

// ─── Main component ───────────────────────────────────────────────

export function SidePanel() {
  // Macro queries
  const { data: fedFunds } = useQuery({
    queryKey: ['fred-fedfunds'],
    queryFn: () => api.macro.series('FEDFUNDS', '2023-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 60 * 60 * 1000,
  })

  const { data: cpi } = useQuery({
    queryKey: ['fred-cpi'],
    queryFn: () => api.macro.series('CPIAUCSL', '2024-01-01').then(r => {
      const a = r.data
      if (a.length < 13) return null
      return ((a[a.length - 1].value - a[a.length - 13].value) / a[a.length - 13].value) * 100
    }),
    staleTime: 60 * 60 * 1000,
  })

  const { data: unemployment } = useQuery({
    queryKey: ['fred-unrate'],
    queryFn: () => api.macro.series('UNRATE', '2024-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 60 * 60 * 1000,
  })

  const { data: t2y } = useQuery({
    queryKey: ['fred-t2y'],
    queryFn: () => api.macro.series('DGS2', '2024-01-01').then(r => {
      const a = r.data; return a.length ? a[a.length - 1].value : null
    }),
    staleTime: 60 * 60 * 1000,
  })

  const { data: quotes } = useQuery({
    queryKey: ['side-quotes'],
    queryFn: () => api.market.quotes(['^TNX', '^VIX', 'DX-Y.NYB']).then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 1,
  })

  const gq = (sym: string) => quotes?.find(q => q.symbol === sym)
  const tenY = gq('^TNX')
  const vix  = gq('^VIX')
  const dxy  = gq('DX-Y.NYB')
  const spread = tenY?.price && t2y ? tenY.price - t2y : undefined

  // Calendar
  const { data: calData } = useQuery({
    queryKey: ['calendar-thisweek'],
    queryFn: () => api.calendar.events(0).then(r => r.data),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  const events: CalendarEvent[] = calData?.events
    ? calData.events.filter((e: CalendarEvent) => !e.is_past).slice(0, 5)
    : []

  const fmt = (v: number | null | undefined, decimals = 2, suffix = '') =>
    v !== null && v !== undefined ? `${v.toFixed(decimals)}${suffix}` : undefined

  return (
    <aside className="w-[280px] shrink-0 border-l" style={{ borderColor: 'var(--line)' }}>

      {/* ── Macro ─────────────────────────────────────── */}
      <div className="px-7 pt-8 pb-6 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="section-label mb-1">Macro</div>
        <MacroRow label="Fed Funds"    value={fmt(fedFunds, 2, '%')}      sub="Target rate" />
        <MacroRow label="10Y Yield"    value={fmt(tenY?.price, 2, '%')}   sub="US Treasury" />
        <MacroRow label="2Y Yield"     value={fmt(t2y, 2, '%')}           sub="US Treasury" />
        <MacroRow label="Yield Spread" value={fmt(spread, 2, '%')}        sub="10Y − 2Y" />
        <MacroRow label="VIX"          value={fmt(vix?.price, 2)}         sub="Volatility" />
        <MacroRow label="DXY"          value={fmt(dxy?.price, 2)}         sub="Dollar index" />
        <MacroRow label="CPI YoY"      value={fmt(cpi, 2, '%')}           sub="FRED CPIAUCSL" />
        <MacroRow label="Unemployment" value={fmt(unemployment, 2, '%')}  sub="FRED UNRATE" />
      </div>

      {/* ── This week ────────────────────────────────── */}
      <div className="px-7 pt-7 pb-6 border-b" style={{ borderColor: 'var(--line)' }}>
        <div className="section-label mb-4">This Week</div>

        {events.length > 0 ? (
          <div>
            {events.map((ev, i) => {
              const { day, date, time } = formatTime(ev.date_iso)
              return (
                <motion.div
                  key={i}
                  className="flex gap-3 py-3 border-b last:border-none"
                  style={{ borderColor: 'var(--line2)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="pt-[5px] shrink-0">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${impactDot[ev.impact] ?? ''}`} />
                  </div>
                  <div>
                    <div className="text-[12px] font-medium leading-[1.4] mb-0.5" style={{ color: 'var(--t1)' }}>
                      {ev.title}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--taupe)' }}>
                      {day} {date} · {time} ET
                      {ev.forecast && <span className="ml-1.5" style={{ color: 'var(--t4)' }}>F: {ev.forecast}</span>}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <p className="text-[12px]" style={{ color: 'var(--t4)' }}>No upcoming high-impact events.</p>
        )}

      </div>

      {/* ── COT ─────────────────────────────────────── */}
      <div className="px-7 pt-7 pb-8">
        <div className="section-label mb-4">COT Signals</div>
        <div>
          {COT_SIGNALS.map((s, i) => (
            <div key={i} className="py-3 border-b last:border-none" style={{ borderColor: 'var(--line2)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--t1)' }}>{s.market}</span>
                <span className={`ml-auto text-[9px] font-bold tracking-[0.07em] uppercase px-2 py-0.5 rounded-full border ${
                  s.direction === 'bullish'
                    ? 'text-sage bg-sage/8 border-sage/20'
                    : 'text-coral bg-coral/8 border-coral/20'
                }`}>
                  {s.direction === 'bullish' ? 'Long' : 'Short'}
                </span>
              </div>
              <p className="text-[11px] leading-[1.5]" style={{ color: 'var(--t3)' }}>{s.note}</p>
            </div>
          ))}
        </div>
      </div>

    </aside>
  )
}
