'use client'

import { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { DottedSurface } from '@/components/ui/DottedSurface'
import { ContainerScroll } from '@/components/ui/ContainerScroll'
import { VelarMark } from '@/components/ui/VelarMark'

function heroStyle(delay: string): React.CSSProperties {
  return {
    opacity:    1,
    transform:  'none',
    transition: `opacity 0.8s ${delay} cubic-bezier(0.16,1,0.3,1), transform 0.8s ${delay} cubic-bezier(0.16,1,0.3,1)`,
  }
}

// ─── Live price strip at base of hero ────────────────────────────

function HeroPrices() {
  const { data: quotes } = useQuery({
    queryKey: ['landing-prices'],
    queryFn: () => api.market.quotes(['SPY', '^TNX', '^VIX', 'GC=F']).then(r => r.data),
    staleTime: 60_000,
    retry: 1,
  })

  const items = [
    { label: 'S&P 500', sym: 'SPY' },
    { label: '10Y',     sym: '^TNX' },
    { label: 'VIX',     sym: '^VIX' },
    { label: 'Gold',    sym: 'GC=F' },
  ]

  return (
    <div className="absolute bottom-0 left-0 right-0 border-t flex" style={{ borderColor: 'var(--line)' }}>
      {items.map((item, i) => {
        const q = quotes?.find((q: { symbol: string; price: number; changePct: number }) => q.symbol === item.sym)
        const price = q
          ? q.price >= 1000
            ? q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
            : q.price.toFixed(2)
          : '—'
        const pct = q ? `${q.changePct > 0 ? '+' : ''}${q.changePct.toFixed(2)}%` : '—'
        const isUp = q ? q.changePct > 0 : null
        const color = isUp == null ? 'var(--t3)' : isUp ? 'var(--sage)' : 'var(--coral)'

        return (
          <div
            key={i}
            className="flex-1 px-4 md:px-8 py-3 md:py-4 border-r last:border-none flex items-center gap-2 md:gap-3 min-w-0"
            style={{ borderColor: 'var(--line)' }}
          >
            <span className="section-label">{item.label}</span>
            <span className="text-[12px] md:text-[13px] font-bold tabular-nums ml-auto" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>
              {price}
            </span>
            <span className="text-[10px] md:text-[11px] tabular-nums shrink-0" style={{ color }}>{pct}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Terminal preview inside ContainerScroll ──────────────────────

function TerminalPreview() {
  const ticker = [
    'BIAS Mild Risk On  +3.8',
    'NAS100 +0.74%',
    'BTC +1.22%',
    'DXY -0.28%',
    'US02Y -0.09%',
    'XAUUSD +0.18%',
    'EURUSD +0.34%',
    'Journal WR 58%',
    'Backtest PF 1.84',
  ]

  const factors = [
    { label: 'Yields', state: 'Down', tone: 'var(--sage)', detail: '2Y leading lower, easing pressure.' },
    { label: 'Dollar', state: 'Soft', tone: 'var(--sage)', detail: 'DXY weaker while EUR firms.' },
    { label: 'Equities', state: 'Bid', tone: 'var(--sage)', detail: 'Tech leadership keeps breadth constructive.' },
    { label: 'Gold', state: 'Alt Safe', tone: 'var(--amber)', detail: 'Alternative safety bid, not panic.' },
  ]

  const journalRows = [
    { pair: 'EURUSD', setup: 'CPI fade', result: '+2.4R', tone: 'var(--sage)' },
    { pair: 'BTC', setup: 'Break + retest', result: '+1.1R', tone: 'var(--sage)' },
    { pair: 'XAUUSD', setup: 'NY reversal', result: '-0.6R', tone: 'var(--coral)' },
  ]

  const backtests = [
    { label: 'Win Rate', value: '58%', sub: '+4.1 pts / 90d' },
    { label: 'Profit Factor', value: '1.84', sub: 'trend pullback model' },
    { label: 'Expectancy', value: '+0.43R', sub: '212 trades sampled' },
  ]

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto md:overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(17,17,20,0.98) 0%, rgba(12,12,15,1) 100%)' }}>
      <div
        className="flex items-center gap-5 px-5 shrink-0 border-b overflow-hidden"
        style={{ height: 30, borderColor: 'var(--line)', background: 'rgba(255,255,255,0.015)' }}
      >
        {ticker.map((item, i) => (
          <span key={i} className="text-[9px] tabular-nums whitespace-nowrap" style={{ color: i === 0 ? 'var(--cream)' : 'var(--t3)' }}>
            {item}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 flex-1 min-h-0">
        <div className="col-span-12 md:col-span-8 border-r min-h-0" style={{ borderColor: 'var(--line)' }}>
          <div className="grid grid-cols-1 md:grid-cols-12 border-b" style={{ borderColor: 'var(--line)' }}>
            <div className="col-span-8 px-4 md:px-5 py-4 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[8px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: 'var(--taupe)' }}>Overview Engine</div>
                  <div className="flex items-center gap-3">
                    <span className="text-[22px] font-semibold tracking-[-0.04em]" style={{ color: 'var(--t1)' }}>Mild Risk On</span>
                    <span
                      className="px-2 py-1 rounded-md text-[8px] font-bold tracking-[0.16em] uppercase"
                      style={{ color: 'var(--sage)', background: 'rgba(138,170,142,0.12)', border: '1px solid rgba(138,170,142,0.16)' }}
                    >
                      Confidence 74%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--t4)' }}>Score</div>
                  <div className="text-[20px] font-semibold tabular-nums tracking-[-0.03em]" style={{ color: 'var(--cream)' }}>+3.8</div>
                </div>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[8px] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--t4)' }}>Cross-Asset Chart</span>
                  <span className="text-[8px] tabular-nums" style={{ color: 'var(--t3)' }}>NAS100 / BTC / DXY</span>
                </div>
                <svg viewBox="0 0 520 170" className="w-full h-[150px]">
                  <defs>
                    <linearGradient id="velarPreviewFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(138,170,142,0.24)" />
                      <stop offset="100%" stopColor="rgba(138,170,142,0)" />
                    </linearGradient>
                  </defs>
                  {[28, 64, 100, 136].map((y) => (
                    <line key={y} x1="0" y1={y} x2="520" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  ))}
                  <path d="M0 118 L48 108 L92 112 L136 95 L182 90 L228 86 L274 71 L320 78 L364 66 L408 52 L452 44 L520 30 L520 170 L0 170 Z" fill="url(#velarPreviewFill)" />
                  <path d="M0 118 L48 108 L92 112 L136 95 L182 90 L228 86 L274 71 L320 78 L364 66 L408 52 L452 44 L520 30" fill="none" stroke="rgba(138,170,142,0.95)" strokeWidth="3" strokeLinecap="round" />
                  <path d="M0 92 L48 96 L92 89 L136 98 L182 93 L228 88 L274 94 L320 90 L364 84 L408 79 L452 82 L520 76" fill="none" stroke="rgba(196,152,88,0.86)" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 6" />
                  <path d="M0 58 L48 60 L92 66 L136 70 L182 74 L228 78 L274 88 L320 93 L364 100 L408 108 L452 113 L520 120" fill="none" stroke="rgba(200,136,120,0.82)" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div>
                    <div className="text-[7px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--t4)' }}>Lead</div>
                    <div className="text-[11px]" style={{ color: 'var(--t2)' }}>Tech + crypto confirming upside.</div>
                  </div>
                  <div>
                    <div className="text-[7px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--t4)' }}>Drag</div>
                    <div className="text-[11px]" style={{ color: 'var(--t2)' }}>Gold firm enough to keep some caution alive.</div>
                  </div>
                  <div>
                    <div className="text-[7px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--t4)' }}>Read</div>
                    <div className="text-[11px]" style={{ color: 'var(--t2)' }}>Easing-with-growth tone, not full panic relief.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-4 px-4 py-4">
              <div className="text-[8px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: 'var(--taupe)' }}>Factor Grid</div>
              <div className="grid grid-cols-1 gap-2">
                {factors.map((factor) => (
                  <div
                    key={factor.label}
                    className="rounded-lg border px-3 py-2.5"
                    style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[8px] font-bold tracking-[0.16em] uppercase" style={{ color: 'var(--t4)' }}>{factor.label}</span>
                      <span className="text-[8px] font-bold tracking-[0.12em] uppercase" style={{ color: factor.tone }}>{factor.state}</span>
                    </div>
                    <p className="text-[10px] leading-[1.45]" style={{ color: 'var(--t3)' }}>{factor.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 min-h-0">
            <div className="col-span-7 border-b md:border-b-0 md:border-r px-4 md:px-5 py-4" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--taupe)' }}>Journal Snapshot</div>
                <span className="text-[8px] tabular-nums" style={{ color: 'var(--t3)' }}>Last 30 sessions</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'Win Rate', value: '58%', tone: 'var(--sage)' },
                  { label: 'Avg R', value: '+0.43', tone: 'var(--cream)' },
                  { label: 'Best Session', value: 'LDN', tone: 'var(--amber)' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-[7px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'var(--t4)' }}>{stat.label}</div>
                    <div className="text-[15px] font-semibold tabular-nums tracking-[-0.03em]" style={{ color: stat.tone }}>{stat.value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--line)' }}>
                {journalRows.map((row, index) => (
                  <div
                    key={row.pair}
                    className="grid items-center px-3 py-2.5"
                    style={{
                      gridTemplateColumns: '72px 1fr 56px',
                      borderTop: index === 0 ? 'none' : '1px solid var(--line2)',
                    }}
                  >
                    <span className="text-[10px] font-semibold" style={{ color: 'var(--t1)' }}>{row.pair}</span>
                    <span className="text-[10px] truncate" style={{ color: 'var(--t3)' }}>{row.setup}</span>
                    <span className="text-[10px] text-right tabular-nums font-semibold" style={{ color: row.tone }}>{row.result}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-5 px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--taupe)' }}>Backtest Lab</div>
                <span className="text-[8px]" style={{ color: 'var(--t3)' }}>Mean reversion / pullback</span>
              </div>
              <div className="rounded-xl border p-3 mb-3" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                <svg viewBox="0 0 220 108" className="w-full h-[94px]">
                  {[24, 50, 76].map((y) => (
                    <line key={y} x1="0" y1={y} x2="220" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  ))}
                  <path d="M0 82 L26 80 L52 70 L78 64 L104 67 L130 52 L156 48 L182 38 L220 22" fill="none" stroke="rgba(242,236,227,0.92)" strokeWidth="2.4" strokeLinecap="round" />
                  <circle cx="182" cy="38" r="4" fill="rgba(196,152,88,0.92)" />
                  <circle cx="220" cy="22" r="4" fill="rgba(138,170,142,1)" />
                </svg>
                <div className="mt-2 text-[10px] leading-[1.45]" style={{ color: 'var(--t3)' }}>
                  Equity curve stays clean through the last cluster of volatility shocks.
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {backtests.map((item) => (
                  <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[8px] font-bold tracking-[0.14em] uppercase" style={{ color: 'var(--t4)' }}>{item.label}</span>
                      <span className="text-[13px] font-semibold tabular-nums tracking-[-0.03em]" style={{ color: 'var(--t1)' }}>{item.value}</span>
                    </div>
                    <div className="text-[9px] mt-1" style={{ color: 'var(--t3)' }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 min-h-0 border-t md:border-t-0" style={{ borderColor: 'var(--line)' }}>
          <div className="h-full flex flex-col">
            <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[8px] font-bold tracking-[0.18em] uppercase" style={{ color: 'var(--taupe)' }}>Workspace</div>
                <span className="text-[8px]" style={{ color: 'var(--t3)' }}>Overview / Journal / Macro</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Journal', value: '142 trades' },
                  { label: 'Backtests', value: '12 models' },
                  { label: 'Alerts', value: '8 active' },
                  { label: 'Calendar', value: '5 high impact' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-[7px] font-bold tracking-[0.14em] uppercase mb-1" style={{ color: 'var(--t4)' }}>{item.label}</div>
                    <div className="text-[12px] font-semibold" style={{ color: 'var(--t1)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 px-4 py-4 overflow-hidden">
              <div className="text-[8px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: 'var(--taupe)' }}>Tradebook Flow</div>
              <div className="space-y-2">
                {[
                  'London session long logged with annotated chart and execution note.',
                  'Macro bias flipped higher after yields rolled over and crypto confirmed.',
                  'Backtest rerun after CPI regime filter improved drawdown control.',
                  'News queue marked for review ahead of payrolls and ISM services.',
                ].map((line, index) => (
                  <div key={index} className="rounded-lg border px-3 py-2.5" style={{ borderColor: 'var(--line)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: index === 2 ? 'var(--amber)' : 'var(--sage)' }} />
                      <p className="text-[10px] leading-[1.5]" style={{ color: 'var(--t3)' }}>{line}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Features ─────────────────────────────────────────────────────

const FEATURES = [
  {
    num: '01',
    tag: 'Market Intelligence',
    title: 'Every signal that matters.',
    desc: 'Curated financial headlines from Reuters, Financial Times, Bloomberg and CNBC — tagged by theme, sorted by recency. Signal, not noise.',
  },
  {
    num: '02',
    tag: 'Macro Dashboard',
    title: 'The numbers that move markets.',
    desc: 'Fed Funds, CPI, unemployment, yield curve, VIX, DXY — live from FRED and market feeds. The dashboard serious macro traders actually use.',
  },
  {
    num: '03',
    tag: 'Economic Calendar',
    title: "What's coming. What matters.",
    desc: "High and medium impact economic events with impact ratings, consensus forecasts, and prior reads. Know what's on the tape before it hits.",
  },
  {
    num: '04',
    tag: 'Trade Journal',
    title: 'Your edge, quantified.',
    desc: "Log every trade, track your R-multiple, measure win rate by pair and session. Understand what actually works — in your account, not someone else's.",
  },
]

// ─── Page ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '12%'])

  return (
    <div style={{ background: 'var(--base)' }}>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[860px] md:h-screen flex items-center overflow-hidden">

        {/* Three.js dot wave */}
        <DottedSurface />

        {/* Soft radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 38%, rgba(138,170,142,0.05) 0%, transparent 68%)' }}
        />

        {/* Headline + CTAs */}
        <motion.div
          style={{ y: heroY }}
          className="relative z-10 w-full px-5 md:px-14 lg:px-20 pt-[112px] md:pt-0"
        >
          <div className="mb-7" style={heroStyle('0.05s')}>
            <span className="section-label">Macro Research Terminal</span>
          </div>

          <h1
            className="font-bold leading-[1.0] mb-8"
            style={{
              fontSize: 'clamp(52px, 6.5vw, 88px)',
              letterSpacing: '-0.04em',
              color: 'var(--t1)',
              maxWidth: '760px',
              ...heroStyle('0.18s'),
            }}
          >
            The macro edge<br />is information.
          </h1>

          <p
            className="mb-8 md:mb-10 max-w-[440px]"
            style={{
              fontSize: '14px',
              lineHeight: '1.65',
              color: 'var(--t3)',
              letterSpacing: '-0.01em',
              ...heroStyle('0.32s'),
            }}
          >
            Real-time macro data, economic calendar, and market context for traders who
            read the chart — not the chatroom.
          </p>
        </motion.div>

        <HeroPrices />
      </section>

      {/* ══ TERMINAL PREVIEW (ContainerScroll) ══════════════════ */}
      <section style={{ background: 'var(--base)' }}>
        <ContainerScroll
          titleComponent={
            <div>
              <div className="section-label mb-5">Terminal Preview</div>
              <h2
                className="font-semibold leading-[1.1]"
                style={{
                  fontSize: 'clamp(28px, 3vw, 44px)',
                  letterSpacing: '-0.035em',
                  color: 'var(--t1)',
                }}
              >
                Built for the macro edge.
              </h2>
              <p className="mt-4 mx-auto max-w-[360px]" style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: '1.65' }}>
                Live data. Zero noise. Everything a macro trader needs, in one place.
              </p>
            </div>
          }
        >
          <TerminalPreview />
        </ContainerScroll>
      </section>

      {/* ══ FEATURES ══════════════════════════════════════════════ */}
      <section className="px-8 md:px-14 lg:px-20">
        <div className="border-t pt-20 mb-0" style={{ borderColor: 'var(--line)' }} />

        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20 py-14 border-b"
            style={{ borderColor: 'var(--line2)' }}
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--t4)', letterSpacing: '0.06em' }}>{f.num}</span>
                <div className="flex-1 h-px" style={{ background: 'var(--line2)' }} />
                <span className="section-label">{f.tag}</span>
              </div>
              <h2
                className="font-semibold leading-[1.15]"
                style={{ fontSize: 'clamp(26px, 2.8vw, 38px)', letterSpacing: '-0.03em', color: 'var(--t1)' }}
              >
                {f.title}
              </h2>
            </div>
            <div className="flex items-center">
              <p style={{ fontSize: '14px', lineHeight: '1.75', color: 'var(--t3)', letterSpacing: '-0.005em' }}>{f.desc}</p>
            </div>
          </motion.div>
        ))}
      </section>

      {/* ══ SIGN UP ═══════════════════════════════════════════════ */}
      {/* Footer */}
      <footer
        className="px-5 md:px-14 py-8 border-t flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-0 justify-between"
        style={{ borderColor: 'var(--line)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="live-dot" style={{ width: 4, height: 4 }} />
          <VelarMark width={14} color="var(--t4)" />
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: 'var(--t4)' }}>
            Velar
          </span>
        </div>
        <span className="text-[11px]" style={{ color: 'var(--t4)' }}>Private alpha</span>
      </footer>
    </div>
  )
}
