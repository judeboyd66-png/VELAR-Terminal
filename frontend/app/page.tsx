'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { auth } from '@/lib/auth'
import { api } from '@/lib/api'
import { DottedSurface } from '@/components/ui/DottedSurface'
import { ContainerScroll } from '@/components/ui/ContainerScroll'
import { VelarMark } from '@/components/ui/VelarMark'

// CSS transition helper
function useHeroVisible() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return visible
}

function heroStyle(visible: boolean, delay: string): React.CSSProperties {
  return {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'none' : 'translateY(18px)',
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
    { label: 'S&P 500', sym: 'SPY',  fallbackPrice: '568.40', fallbackPct: '+0.82%', up: true  },
    { label: '10Y',     sym: '^TNX', fallbackPrice: '4.35%',  fallbackPct: '+0.03%', up: true  },
    { label: 'VIX',     sym: '^VIX', fallbackPrice: '18.40',  fallbackPct: '−2.10%', up: false },
    { label: 'Gold',    sym: 'GC=F', fallbackPrice: '3,010',  fallbackPct: '+0.18%', up: true  },
  ]

  return (
    <div className="absolute bottom-0 left-0 right-0 border-t flex" style={{ borderColor: 'var(--line)' }}>
      {items.map((item, i) => {
        const q = quotes?.find((q: { symbol: string; price: number; changePct: number }) => q.symbol === item.sym)
        const price = q
          ? q.price >= 1000
            ? q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })
            : q.price.toFixed(2)
          : item.fallbackPrice
        const pct = q ? `${q.changePct > 0 ? '+' : ''}${q.changePct.toFixed(2)}%` : item.fallbackPct
        const isUp = q ? q.changePct > 0 : item.up
        const color = isUp ? 'var(--sage)' : 'var(--coral)'

        return (
          <div
            key={i}
            className="flex-1 px-8 py-4 border-r last:border-none flex items-center gap-3"
            style={{ borderColor: 'var(--line)' }}
          >
            <span className="section-label">{item.label}</span>
            <span className="text-[13px] font-bold tabular-nums ml-auto" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>
              {price}
            </span>
            <span className="text-[11px] tabular-nums" style={{ color }}>{pct}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Terminal preview inside ContainerScroll ──────────────────────

function TerminalPreview() {
  const NEWS = [
    { tag: 'FED',    headline: 'Powell signals no rush to cut as inflation stays sticky above 2%' },
    { tag: 'MACRO',  headline: 'US CPI cools slightly — core remains elevated at 3.2%'           },
    { tag: 'EQUITY', headline: 'S&P 500 holds 5,600 support ahead of key earnings week'          },
    { tag: 'FX',     headline: 'Dollar strength accelerates as rate differential widens vs EUR'   },
    { tag: 'ENERGY', headline: 'WTI crude falls below $73 on surprise inventory build'            },
  ]
  const KPIS = [
    { label: 'FED FUNDS',    value: '3.64%', sub: '−25bps',  up: false },
    { label: 'CPI YOY',      value: '2.66%', sub: '−0.08',   up: false },
    { label: 'UNEMPLOYMENT', value: '4.40%', sub: '+0.10',   up: true  },
    { label: '10Y YIELD',    value: '4.35%', sub: '+0.03',   up: true  },
  ]
  const TICKER = ['SPY  568.42  +0.82%', 'VIX  18.40  −2.10%', 'Gold  3,010  +0.18%', 'BTC  84,210  +1.80%', 'DXY  103.84  −0.31%', 'USDJPY  149.72  −0.44%']

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: 'var(--base)' }}>
      {/* Ticker */}
      <div
        className="flex items-center gap-6 px-5 shrink-0 border-b overflow-hidden"
        style={{ height: 28, borderColor: 'var(--line)', background: 'var(--raised)' }}
      >
        {TICKER.map((t, i) => (
          <span key={i} className="text-[9px] tabular-nums whitespace-nowrap" style={{ color: 'var(--t3)' }}>{t}</span>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 border-b shrink-0" style={{ borderColor: 'var(--line)' }}>
        {KPIS.map((k, i) => (
          <div key={i} className="px-5 py-4 border-r last:border-r-0" style={{ borderColor: 'var(--line)' }}>
            <div className="text-[7px] font-bold tracking-[0.14em] mb-2" style={{ color: 'var(--taupe)' }}>{k.label}</div>
            <div className="text-[20px] font-bold tabular-nums" style={{ color: 'var(--t1)', letterSpacing: '-0.03em' }}>{k.value}</div>
            <div className="text-[9px] mt-1 tabular-nums" style={{ color: k.up ? 'var(--sage)' : 'var(--coral)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* News */}
      <div className="flex-1 overflow-hidden">
        {NEWS.map((n, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-5 border-b"
            style={{ height: 44, borderColor: 'var(--line2)' }}
          >
            <span className="text-[7px] font-bold tracking-[0.14em] w-10 shrink-0" style={{ color: 'var(--taupe)' }}>{n.tag}</span>
            <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--t2)', letterSpacing: '-0.01em' }}>{n.headline}</span>
          </div>
        ))}
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
  const router = useRouter()
  const heroRef = useRef<HTMLDivElement>(null)
  const heroVisible = useHeroVisible()

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroY       = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])

  useEffect(() => {
    if (auth.isAuthenticated()) router.replace('/dashboard')
  }, [router])

  return (
    <div style={{ background: 'var(--base)' }}>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative h-screen flex items-center overflow-hidden">

        {/* Three.js dot wave */}
        <DottedSurface />

        {/* Soft radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 38%, rgba(138,170,142,0.05) 0%, transparent 68%)' }}
        />

        {/* Headline + CTAs */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 w-full px-8 md:px-14 lg:px-20"
        >
          <div className="mb-7" style={heroStyle(heroVisible, '0.05s')}>
            <span className="section-label">Macro Research Terminal</span>
          </div>

          <h1
            className="font-bold leading-[1.0] mb-8"
            style={{
              fontSize: 'clamp(52px, 6.5vw, 88px)',
              letterSpacing: '-0.04em',
              color: 'var(--t1)',
              maxWidth: '760px',
              ...heroStyle(heroVisible, '0.18s'),
            }}
          >
            The macro edge<br />is information.
          </h1>

          <p
            className="mb-10 max-w-[440px]"
            style={{
              fontSize: '15px',
              lineHeight: '1.65',
              color: 'var(--t3)',
              letterSpacing: '-0.01em',
              ...heroStyle(heroVisible, '0.32s'),
            }}
          >
            Real-time macro data, economic calendar, and market context for traders who
            read the chart — not the chatroom.
          </p>

          <div className="flex items-center gap-5" style={heroStyle(heroVisible, '0.44s')}>
            <Link
              href="/signup"
              className="no-underline inline-flex items-center gap-2 px-6 py-3 rounded-md text-[13px] font-semibold transition-opacity duration-200"
              style={{ background: 'var(--t1)', color: 'var(--base)', letterSpacing: '-0.01em' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Get Access
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/signin"
              className="no-underline text-[13px] transition-colors"
              style={{ color: 'var(--t3)', letterSpacing: '-0.01em' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
            >
              Already have access →
            </Link>
          </div>
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
      <section className="px-8 md:px-14 lg:px-20 py-36">
        <motion.div
          className="max-w-[480px] mx-auto text-center"
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-label mb-6">Access</div>
          <h2
            className="font-bold mb-5 leading-[1.05]"
            style={{ fontSize: 'clamp(36px, 3.8vw, 56px)', letterSpacing: '-0.04em', color: 'var(--t1)' }}
          >
            Request access.
          </h2>
          <p className="mb-10" style={{ fontSize: '14px', color: 'var(--t3)', lineHeight: '1.65' }}>
            VELAR is a private research terminal. Create an account to access the full platform.
          </p>
          <Link
            href="/signup"
            className="no-underline inline-flex items-center justify-center gap-2 w-full px-8 py-3.5 rounded-md text-[13.5px] font-semibold transition-opacity duration-200"
            style={{ background: 'var(--t1)', color: 'var(--base)', letterSpacing: '-0.01em' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            Get Access →
          </Link>
          <p className="mt-6 text-[12px]" style={{ color: 'var(--t4)' }}>
            Already have access?{' '}
            <Link
              href="/signin"
              className="no-underline transition-colors"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer
        className="px-8 md:px-14 py-8 border-t flex items-center justify-between"
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
