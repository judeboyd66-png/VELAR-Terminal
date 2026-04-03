'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, BarChart2, List, TrendingUp, ImageIcon, Lock } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { type Trade, type JournalStats, calcStats, loadTrades, addTrade, deleteTrade } from '@/lib/journal'
import { useAuth } from '@/app/providers'
import { AddTradeModal } from './AddTradeModal'

// ─── Constants ────────────────────────────────────────────────────────────────

type JournalTab = 'log' | 'analytics'

const RESULT_STYLE: Record<string, { color: string; bg: string }> = {
  Win:  { color: 'var(--sage)',   bg: 'rgba(138,170,142,0.12)' },
  Loss: { color: 'var(--coral)',  bg: 'rgba(200,136,120,0.12)' },
  BE:   { color: 'var(--taupe)', bg: 'rgba(138,122,104,0.10)' },
}

const DIR_STYLE: Record<string, { color: string }> = {
  Long:  { color: 'var(--sage)'  },
  Short: { color: 'var(--coral)' },
}

// ─── Screenshot Lightbox ──────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <img
        src={src}
        alt="trade chart"
        onClick={e => e.stopPropagation()}
        style={{
          display: 'block',
          width: 'auto',
          height: 'auto',
          maxWidth: '92vw',
          maxHeight: '88vh',
          objectFit: 'contain',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.9)',
        }}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 outline-none cursor-pointer flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%', width: '32px', height: '32px', color: '#fff', fontSize: '14px',
        }}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div
      className="flex flex-col gap-1 px-5 py-3 shrink-0"
      style={{ borderRight: '1px solid var(--line2)' }}
    >
      <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--t4)' }}>
        {label}
      </span>
      <span className="text-[20px] font-bold tabular-nums leading-none" style={{ color: color ?? 'var(--t1)', letterSpacing: '-0.03em' }}>
        {value}
      </span>
      {sub && <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{sub}</span>}
    </div>
  )
}

function StatsBar({ stats }: { stats: JournalStats }) {
  const pf   = stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)
  const streak = stats.streak > 0
    ? { label: `${stats.streak}W streak`, color: 'var(--sage)' }
    : stats.streak < 0
      ? { label: `${Math.abs(stats.streak)}L streak`, color: 'var(--coral)' }
      : { label: '—', color: 'var(--t3)' }

  return (
    <div
      className="flex items-stretch overflow-x-auto"
      style={{ background: 'var(--raised)', borderBottom: '1px solid var(--line)', scrollbarWidth: 'none' }}
    >
      <StatPill label="Trades"     value={String(stats.totalTrades)}  sub={`${stats.wins}W · ${stats.losses}L · ${stats.breakEvens}BE`} />
      <StatPill label="Win Rate"   value={`${stats.winRate.toFixed(0)}%`}
        color={stats.winRate >= 50 ? 'var(--sage)' : 'var(--coral)'} />
      <StatPill label="Profit Factor" value={pf}
        color={stats.profitFactor >= 1.5 ? 'var(--sage)' : stats.profitFactor >= 1 ? 'var(--amber)' : 'var(--coral)'} />
      <StatPill label="Total R"    value={`${stats.totalR >= 0 ? '+' : ''}${stats.totalR.toFixed(1)}R`}
        color={stats.totalR >= 0 ? 'var(--sage)' : 'var(--coral)'} />
      <StatPill label="Avg Win"    value={`+${stats.avgWin.toFixed(1)}R`} color="var(--sage)" />
      <StatPill label="Avg Loss"   value={`-${stats.avgLoss.toFixed(1)}R`} color="var(--coral)" />
      <StatPill label="Best"       value={`+${stats.bestTrade.toFixed(1)}R`}  color="var(--sage)" />
      <StatPill label="Worst"      value={`${stats.worstTrade.toFixed(1)}R`}  color="var(--coral)" />
      <StatPill label="Streak"     value={streak.label} color={streak.color} />
    </div>
  )
}

// ─── Trade Row ────────────────────────────────────────────────────────────────

function TradeRow({ trade, onDelete }: { trade: Trade; onDelete: () => void }) {
  const [lightbox, setLightbox] = useState(false)
  const rs = RESULT_STYLE[trade.result]
  const ds = DIR_STYLE[trade.direction]

  return (
    <>
      {lightbox && trade.screenshot && (
        <Lightbox src={trade.screenshot} onClose={() => setLightbox(false)} />
      )}
      <motion.div
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 4 }}
        className="grid items-center px-5 py-3 group"
        style={{
          gridTemplateColumns: '90px 72px 60px 40px 48px 1fr 52px 60px 68px 28px 28px',
          gap: '10px',
          borderBottom: '1px solid var(--line2)',
          background: 'transparent',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        {/* Date */}
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--t3)' }}>
          {trade.date}{trade.time ? ` ${trade.time}` : ''}
        </span>

        {/* Pair */}
        <span className="text-[12px] font-semibold" style={{ color: 'var(--t1)', letterSpacing: '0.02em' }}>
          {trade.pair}
        </span>

        {/* Direction */}
        <span className="text-[11px] font-bold" style={{ color: ds.color }}>
          {trade.direction}
        </span>

        {/* TF */}
        <span className="text-[10px]" style={{ color: 'var(--t4)' }}>
          {trade.timeframe ?? '—'}
        </span>

        {/* Session */}
        <span className="text-[10px]" style={{ color: 'var(--t4)' }}>
          {trade.session ? trade.session.slice(0, 2).toUpperCase() : '—'}
        </span>

        {/* Notes */}
        <span className="text-[11px] truncate" style={{ color: 'var(--t2)' }}>
          {trade.notes ?? trade.setup ?? '—'}
        </span>

        {/* Risk % */}
        <span className="text-[11px] tabular-nums text-right" style={{ color: 'var(--t3)' }}>
          {trade.riskPct != null ? `${trade.riskPct}%` : '—'}
        </span>

        {/* P&L */}
        <span
          className="text-[12px] font-semibold tabular-nums text-right"
          style={{ color: (trade.pnlR ?? 0) > 0 ? 'var(--sage)' : (trade.pnlR ?? 0) < 0 ? 'var(--coral)' : 'var(--t3)' }}
        >
          {trade.pnlR != null ? `${trade.pnlR > 0 ? '+' : ''}${trade.pnlR.toFixed(1)}R` : '—'}
        </span>

        {/* Result badge */}
        <span
          className="text-[10px] font-bold tracking-[0.06em] px-2 py-0.5 rounded-full text-center"
          style={{ background: rs.bg, color: rs.color, border: `1px solid ${rs.color}30` }}
        >
          {trade.result.toUpperCase()}
        </span>

        {/* Screenshot icon */}
        {trade.screenshot ? (
          <button
            onClick={() => setLightbox(true)}
            className="outline-none cursor-pointer transition-opacity"
            style={{ color: 'var(--t3)', background: 'none', border: 'none', padding: 0, lineHeight: 0 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
            title="View chart screenshot"
          >
            <ImageIcon size={12} />
          </button>
        ) : (
          <span />
        )}

        {/* Delete */}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity outline-none cursor-pointer"
          style={{ color: 'var(--t4)', background: 'none', border: 'none', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--coral)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
        >
          <Trash2 size={12} />
        </button>
      </motion.div>
    </>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

const COL = 'text-[9px] font-bold tracking-[0.12em] uppercase'

function TradeLog({ trades, onDelete, loading }: { trades: Trade[]; onDelete: (id: string) => void; loading?: boolean }) {
  return (
    <div className="overflow-x-auto">
    <div style={{ minWidth: '800px' }}>
      {/* Column headers */}
      <div
        className="grid items-center px-5 py-2"
        style={{
          gridTemplateColumns: '90px 72px 60px 40px 48px 1fr 52px 60px 68px 28px 28px',
          gap: '10px',
          background: 'var(--raised)',
          borderBottom: '1px solid var(--line)',
          position: 'sticky',
          top: 'calc(var(--nav-h) + 52px)', // nav + 52px tab-dock
          zIndex: 10,
        }}
      >
        {['Date','Pair','Dir.','TF','Sess.','Notes','Risk','P&L','Result','',''].map((h, i) => (
          <span key={i} className={COL} style={{ color: 'var(--t4)', textAlign: i === 6 || i === 7 ? 'right' : 'left' }}>{h}</span>
        ))}
      </div>

      {/* Rows */}
      <AnimatePresence>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="live-dot" />
          </div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <TrendingUp size={32} style={{ color: 'var(--t4)', opacity: 0.4 }} />
            <span className="text-[13px]" style={{ color: 'var(--t3)' }}>No trades logged yet</span>
          </div>
        ) : (
          trades.map(t => (
            <TradeRow key={t.id} trade={t} onDelete={() => onDelete(t.id)} />
          ))
        )}
      </AnimatePresence>

      {/* Footer */}
      {trades.length > 0 && (
        <div className="px-5 py-3 text-[10px]" style={{ color: 'var(--t4)', borderTop: '1px solid var(--line2)' }}>
          {trades.length} trades
        </div>
      )}
    </div>
    </div>
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function AnalyticsPlaceholder({ label, tall }: { label: string; tall?: boolean }) {
  return (
    <div
      className="rounded-xl flex flex-col"
      style={{ background: 'var(--raised)', border: '1px solid var(--line)', height: tall ? '240px' : '180px' }}
    >
      <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line2)' }}>
        <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--taupe)' }}>{label}</span>
      </div>
      <div className="flex-1 flex items-end px-5 pb-4 gap-1 opacity-[0.07]">
        {[55, 40, 70, 45, 80, 60, 90, 50, 75, 65, 85, 70].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: 'var(--t1)' }} />
        ))}
      </div>
    </div>
  )
}

function Analytics({ trades }: { trades: Trade[] }) {
  // Win rate by pair
  const byPair = useMemo(() => {
    const map: Record<string, { wins: number; total: number }> = {}
    for (const t of trades) {
      if (!map[t.pair]) map[t.pair] = { wins: 0, total: 0 }
      map[t.pair].total++
      if (t.result === 'Win') map[t.pair].wins++
    }
    return Object.entries(map)
      .map(([pair, d]) => ({ pair, wr: Math.round((d.wins / d.total) * 100), total: d.total }))
      .sort((a, b) => b.total - a.total)
  }, [trades])

  // Equity curve
  const equity = useMemo(() => {
    let running = 0
    return [...trades].sort((a, b) => a.date.localeCompare(b.date)).map(t => {
      running += t.pnlR ?? 0
      return { date: t.date, r: parseFloat(running.toFixed(2)) }
    })
  }, [trades])

  const maxR = Math.max(...equity.map(e => e.r), 1)
  const minR = Math.min(...equity.map(e => e.r), 0)
  const range = maxR - minR || 1

  return (
    <div className="p-4 md:p-6 grid gap-4 grid-cols-1 md:grid-cols-3">
      {/* Equity curve — full width */}
      <div className="col-span-1 md:col-span-3 rounded-xl" style={{ background: 'var(--raised)', border: '1px solid var(--line)' }}>
        <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line2)' }}>
          <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--taupe)' }}>
            Equity Curve (R)
          </span>
          {equity.length > 0 && (
            <span className="text-[11px] tabular-nums font-semibold"
              style={{ color: equity[equity.length - 1].r >= 0 ? 'var(--sage)' : 'var(--coral)' }}>
              {equity[equity.length - 1].r >= 0 ? '+' : ''}{equity[equity.length - 1].r.toFixed(1)}R
            </span>
          )}
        </div>
        <div className="relative px-4 py-4" style={{ height: '160px' }}>
          {equity.length > 1 ? (
            <svg width="100%" height="100%" viewBox={`0 0 ${equity.length - 1} 100`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="eq_fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--sage)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--sage)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                fill="none"
                stroke={equity[equity.length - 1].r >= 0 ? 'var(--sage)' : 'var(--coral)'}
                strokeWidth="0.8"
                strokeLinejoin="round"
                points={equity.map((e, i) => `${i},${100 - ((e.r - minR) / range * 90 + 5)}`).join(' ')}
              />
              <polygon
                fill="url(#eq_fill)"
                points={[
                  `0,95`,
                  ...equity.map((e, i) => `${i},${100 - ((e.r - minR) / range * 90 + 5)}`),
                  `${equity.length - 1},95`,
                ].join(' ')}
              />
            </svg>
          ) : (
            <div className="flex items-center justify-center h-full text-[11px]" style={{ color: 'var(--t4)' }}>
              Log more trades to see equity curve
            </div>
          )}
        </div>
      </div>

      {/* Win rate by pair */}
      <div className="col-span-1 md:col-span-2 rounded-xl" style={{ background: 'var(--raised)', border: '1px solid var(--line)' }}>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line2)' }}>
          <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--taupe)' }}>
            Win Rate by Pair
          </span>
        </div>
        <div className="px-5 py-3 flex flex-col gap-2">
          {byPair.slice(0, 6).map(({ pair, wr, total }) => (
            <div key={pair} className="flex items-center gap-3">
              <span className="text-[11px] font-semibold w-16" style={{ color: 'var(--t2)' }}>{pair}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--float)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${wr}%`, background: wr >= 50 ? 'var(--sage)' : 'var(--coral)', transition: 'width 0.6s ease' }}
                />
              </div>
              <span className="text-[11px] tabular-nums w-10 text-right" style={{ color: 'var(--t3)' }}>{wr}%</span>
              <span className="text-[10px] w-8 text-right" style={{ color: 'var(--t4)' }}>{total}t</span>
            </div>
          ))}
          {byPair.length === 0 && (
            <span className="text-[11px] py-4 text-center" style={{ color: 'var(--t4)' }}>No data yet</span>
          )}
        </div>
      </div>

      {/* Result distribution */}
      <div className="rounded-xl" style={{ background: 'var(--raised)', border: '1px solid var(--line)' }}>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line2)' }}>
          <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--taupe)' }}>
            Result Split
          </span>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {[
            { label: 'Win',  color: 'var(--sage)',   count: trades.filter(t => t.result === 'Win').length  },
            { label: 'Loss', color: 'var(--coral)',  count: trades.filter(t => t.result === 'Loss').length },
            { label: 'BE',   color: 'var(--taupe)', count: trades.filter(t => t.result === 'BE').length   },
          ].map(({ label, color, count }) => {
            const pct = trades.length ? Math.round(count / trades.length * 100) : 0
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="text-[11px] w-8" style={{ color }}>{label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--float)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <span className="text-[11px] tabular-nums w-8 text-right" style={{ color: 'var(--t4)' }}>{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Placeholder charts */}
      <AnalyticsPlaceholder label="P&L by Day of Week" />
      <AnalyticsPlaceholder label="RR Distribution" />
      <AnalyticsPlaceholder label="Session Performance" />
    </div>
  )
}

// ─── Tab dock ─────────────────────────────────────────────────────────────────

function TabDock({ tab, onTab, onAdd }: { tab: JournalTab; onTab: (t: JournalTab) => void; onAdd: (trade: Omit<Trade, 'id' | 'createdAt'>) => Promise<void> }) {
  const TABS: { id: JournalTab; label: string; Icon: React.ElementType }[] = [
    { id: 'log',       label: 'Trade Log',  Icon: List     },
    { id: 'analytics', label: 'Analytics',  Icon: BarChart2 },
  ]
  return (
    <div
      className="sticky z-20 flex items-center justify-between px-5"
      style={{
        height: '52px',
        background: 'var(--raised)',
        borderBottom: '1px solid var(--line)',
        top: 'var(--nav-h)',
      }}
    >
      <div className="flex items-center gap-1">
        {TABS.map(({ id, label, Icon }) => {
          const active = id === tab
          return (
            <button
              key={id}
              onClick={() => onTab(id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all outline-none cursor-pointer"
              style={{
                background: active ? 'var(--item-active)' : 'transparent',
                border: `1px solid ${active ? 'var(--line)' : 'transparent'}`,
                color: active ? 'var(--t1)' : 'var(--t3)',
              }}
            >
              <Icon size={13} strokeWidth={active ? 2 : 1.5} />
              {label}
            </button>
          )
        })}
      </div>

      {/* Add trade */}
      <AddTradeModal
        onAdd={onAdd}
        trigger={
          <button
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium cursor-pointer outline-none transition-all"
            style={{
              background: 'var(--t1)',
              color: 'var(--base)',
              border: 'none',
            }}
          >
            <Plus size={13} strokeWidth={2} />
            Log Trade
          </button>
        }
      />
    </div>
  )
}

// ─── JournalView ──────────────────────────────────────────────────────────────

// ─── Auth gate ────────────────────────────────────────────────────────────────

function JournalAuthGate() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 py-32 px-6"
      style={{ minHeight: 'calc(100vh - var(--nav-h))' }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 56, height: 56, background: 'var(--raised)', border: '1px solid var(--line)' }}
      >
        <Lock size={22} style={{ color: 'var(--t3)' }} />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold mb-2" style={{ color: 'var(--t1)', letterSpacing: '-0.01em' }}>
          Sign in to access your journal
        </p>
        <p className="text-[13px]" style={{ color: 'var(--t3)' }}>
          Your trade log and analytics are private to your account.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/signin"
          className="px-5 py-2.5 rounded-md text-[13px] font-semibold no-underline transition-all"
          style={{ background: 'var(--t1)', color: 'var(--base)' }}
        >
          Sign In
        </Link>
        <Link
          href="/signup"
          className="px-5 py-2.5 rounded-md text-[13px] font-medium no-underline transition-all"
          style={{ background: 'var(--raised)', color: 'var(--t2)', border: '1px solid var(--line)' }}
        >
          Create Account
        </Link>
      </div>
    </div>
  )
}

// ─── JournalView ──────────────────────────────────────────────────────────────

export function JournalView() {
  const { user, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<JournalTab>('log')

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn:  loadTrades,
    enabled:  !!user,
  })

  async function handleDelete(id: string) {
    await deleteTrade(id)
    queryClient.invalidateQueries({ queryKey: ['trades'] })
  }

  const stats  = useMemo(() => calcStats(trades), [trades])
  const sorted = useMemo(
    () => [...trades].sort((a, b) => b.date.localeCompare(a.date) || (b.time ?? '').localeCompare(a.time ?? '')),
    [trades]
  )

  if (authLoading) return (
    <div className="min-h-screen" style={{ paddingTop: 'var(--nav-h)', background: 'var(--base)' }} />
  )

  if (!user) return (
    <div className="min-h-screen" style={{ paddingTop: 'var(--nav-h)', background: 'var(--base)' }}>
      <JournalAuthGate />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ paddingTop: 'var(--nav-h)', background: 'var(--base)' }}>
      <TabDock
        tab={tab}
        onTab={setTab}
        onAdd={async trade => {
          await addTrade(trade)
          queryClient.invalidateQueries({ queryKey: ['trades'] })
        }}
      />
      <StatsBar stats={stats} />

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'log'       && <TradeLog trades={sorted} onDelete={handleDelete} loading={isLoading} />}
          {tab === 'analytics' && <Analytics trades={trades} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
