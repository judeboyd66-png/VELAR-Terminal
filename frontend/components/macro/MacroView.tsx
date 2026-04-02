'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Landmark, CreditCard, ArrowLeftRight,
  Zap, RefreshCcw, Cpu, Flame,
} from 'lucide-react'

// ─── Section definitions ───────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'fed',       label: 'Fed & Rates',           Icon: Landmark,       color: 'var(--amber)'  },
  { id: 'private',   label: 'Private Credit',         Icon: CreditCard,     color: 'var(--sage)'   },
  { id: 'yen',       label: 'Yen Carry Trade',        Icon: ArrowLeftRight, color: 'var(--cream)'  },
  { id: 'vol',       label: 'Volatility',             Icon: Zap,            color: 'var(--coral)'  },
  { id: 'refi',      label: 'Refinancing Pressures',  Icon: RefreshCcw,     color: 'var(--taupe)'  },
  { id: 'capex',     label: 'Capex & AI Bubble',      Icon: Cpu,            color: 'var(--sage)'   },
  { id: 'war',       label: 'War, Oil & Inflation',   Icon: Flame,          color: 'var(--coral)'  },
] as const

type SectionId = typeof SECTIONS[number]['id']

// ─── Shared placeholder building blocks ───────────────────────────────────────

function StatCard({
  label,
  value = '—',
  sub,
  color,
  wide,
}: {
  label: string
  value?: string
  sub?: string
  color?: string
  wide?: boolean
}) {
  return (
    <div
      className={`flex flex-col justify-between p-5 rounded-xl ${wide ? 'col-span-1 sm:col-span-2' : ''}`}
      style={{
        background: 'var(--raised)',
        border: '1px solid var(--line)',
        minHeight: '110px',
      }}
    >
      <span className="section-label">{label}</span>
      <div>
        <div
          className="text-[28px] font-bold tabular-nums leading-none mb-1"
          style={{ color: color ?? 'var(--t1)', letterSpacing: '-0.03em' }}
        >
          {value}
        </div>
        {sub && <div className="text-[11px]" style={{ color: 'var(--t4)' }}>{sub}</div>}
      </div>
    </div>
  )
}

function ChartPlaceholder({ label, tall }: { label?: string; tall?: boolean }) {
  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        background: 'var(--raised)',
        border: '1px solid var(--line)',
        height: tall ? '260px' : '180px',
      }}
    >
      {label && (
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line2)' }}>
          <span className="section-label">{label}</span>
        </div>
      )}
      <div className="flex-1 flex items-end px-5 pb-4 gap-1 opacity-[0.07]">
        {/* Fake bar chart silhouette */}
        {[40, 55, 48, 62, 58, 72, 65, 80, 70, 85, 78, 90].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${h}%`, background: 'var(--t1)' }}
          />
        ))}
      </div>
    </div>
  )
}

function SectionWrap({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="p-4 md:p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    >
      {children}
    </motion.div>
  )
}

function ComingSoonBadge() {
  return (
    <span
      className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ml-2"
      style={{
        background: 'rgba(138,122,104,0.12)',
        color: 'var(--taupe)',
        border: '1px solid rgba(138,122,104,0.2)',
        verticalAlign: 'middle',
      }}
    >
      Data soon
    </span>
  )
}

// ─── Section content ───────────────────────────────────────────────────────────

function FedRates() {
  return (
    <SectionWrap>
      <StatCard label="Fed Funds Rate"    sub="Target range upper bound"     color="var(--amber)" />
      <StatCard label="Core PCE"          sub="YoY — Fed's preferred gauge"  color="var(--coral)" />
      <StatCard label="CPI YoY"           sub="Headline inflation"           color="var(--coral)" />
      <StatCard label="Unemployment"      sub="U-3 rate"                     color="var(--sage)"  />
      <StatCard label="Non-Farm Payrolls" sub="Monthly job additions"        color="var(--sage)"  />
      <StatCard label="10Y Treasury"      sub="Yield"                        color="var(--cream)" />
      <StatCard label="2Y Treasury"       sub="Yield"                        color="var(--cream)" />
      <StatCard label="Yield Spread"      sub="10Y minus 2Y"                 color="var(--taupe)" />
      {/* Charts span full width */}
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <ChartPlaceholder label="Fed Funds Rate — Historical" tall />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="CPI vs Core PCE" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="Yield Curve" />
      </div>
    </SectionWrap>
  )
}

function PrivateCredit() {
  return (
    <SectionWrap>
      <StatCard label="Total AUM"         sub="Private credit market size"   color="var(--sage)"  />
      <StatCard label="Default Rate"      sub="Trailing 12-month"            color="var(--coral)" />
      <StatCard label="CLO AAA Spread"    sub="vs SOFR"                      color="var(--cream)" />
      <StatCard label="BDC Net Asset"     sub="BDC index price"              color="var(--amber)" />
      <StatCard label="HY Spread"         sub="Option-adjusted"              color="var(--coral)" />
      <StatCard label="IG Spread"         sub="Investment grade OAS"         color="var(--taupe)" />
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="Private Credit AUM Growth" tall />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="HY vs IG Spreads" tall />
      </div>
      <div className="col-span-1 sm:col-span-2 lg:col-span-4 pt-2">
        <div
          className="rounded-xl p-5"
          style={{ background: 'var(--raised)', border: '1px solid var(--line)' }}
        >
          <span className="section-label mb-3 block">Key Risks</span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['Covenant erosion in leveraged loans', 'Illiquidity premium compression', 'Refinancing wall 2025–2026'].map(r => (
              <div key={r} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: 'var(--coral)' }} />
                <span className="text-[12px]" style={{ color: 'var(--t2)' }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrap>
  )
}

function YenCarry() {
  return (
    <SectionWrap>
      <StatCard label="USD/JPY"           sub="Spot rate"                    color="var(--cream)" />
      <StatCard label="BOJ Policy Rate"   sub="Bank of Japan target"         color="var(--amber)" />
      <StatCard label="US–JP Rate Diff"   sub="Fed Funds minus BOJ rate"     color="var(--coral)" />
      <StatCard label="JPY Net Position"  sub="CFTC speculative positioning" color="var(--taupe)" />
      <StatCard label="JPY Volatility"    sub="1M implied vol"               color="var(--sage)"  />
      <StatCard label="Carry Return"      sub="Rolling 3M carry P&L"        color="var(--amber)" />
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <ChartPlaceholder label="USD/JPY — 2Y History" tall />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="Rate Differential" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="CFTC JPY Positioning" />
      </div>
    </SectionWrap>
  )
}

function Volatility() {
  return (
    <SectionWrap>
      <StatCard label="VIX"              sub="CBOE 30-day implied vol"      color="var(--coral)" />
      <StatCard label="MOVE Index"       sub="Treasury implied volatility"  color="var(--amber)" />
      <StatCard label="VIX9D"            sub="9-day short-term VIX"         color="var(--coral)" />
      <StatCard label="VIX3M"            sub="3-month VIX"                  color="var(--taupe)" />
      <StatCard label="Put/Call Ratio"   sub="Equity options"               color="var(--sage)"  />
      <StatCard label="VVIX"             sub="Vol of vol"                   color="var(--cream)" />
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <ChartPlaceholder label="VIX — 2Y History" tall />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="MOVE Index" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="VIX Term Structure" />
      </div>
    </SectionWrap>
  )
}

function Refinancing() {
  return (
    <SectionWrap>
      <StatCard label="Corp Debt Maturity" sub="2025 refinancing wall"      color="var(--coral)" />
      <StatCard label="HY Maturity Wall"   sub="High yield due 2025–2026"   color="var(--coral)" />
      <StatCard label="30Y Mortgage Rate"  sub="US fixed"                   color="var(--amber)" />
      <StatCard label="DXY"               sub="Dollar index"                color="var(--cream)" />
      <StatCard label="IG Maturity"        sub="Investment grade due 2025"  color="var(--taupe)" />
      <StatCard label="SOFR"              sub="Secured overnight rate"      color="var(--sage)"  />
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <ChartPlaceholder label="Corporate Debt Maturity Profile" tall />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="HY Issuance vs Maturity" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="Mortgage Rate History" />
      </div>
    </SectionWrap>
  )
}

function Capex() {
  return (
    <SectionWrap>
      <StatCard label="Mag-7 Capex"       sub="Trailing 12-month total"     color="var(--sage)"  />
      <StatCard label="Data Center Spend"  sub="YoY growth"                 color="var(--amber)" />
      <StatCard label="Power Demand"       sub="AI data centre load growth" color="var(--coral)" />
      <StatCard label="Nvidia Revenue"     sub="Data centre segment"         color="var(--sage)"  />
      <StatCard label="AI Index"           sub="Global AI equity basket"    color="var(--cream)" />
      <StatCard label="SOX / SMH"          sub="Semiconductor index"         color="var(--taupe)" />
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <ChartPlaceholder label="Big Tech Capex — Quarterly" tall />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="AI vs Broader Market" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="Power Demand Forecast" />
      </div>
    </SectionWrap>
  )
}

function WarOil() {
  return (
    <SectionWrap>
      <StatCard label="WTI Crude"         sub="Front-month futures"         color="var(--amber)" />
      <StatCard label="Brent Crude"       sub="International benchmark"     color="var(--amber)" />
      <StatCard label="Gold"              sub="Spot $/oz"                   color="var(--cream)" />
      <StatCard label="CPI Energy"        sub="YoY energy component"        color="var(--coral)" />
      <StatCard label="Nat Gas"           sub="Henry Hub front-month"       color="var(--taupe)" />
      <StatCard label="Geopolitical Risk" sub="GPR index"                   color="var(--coral)" />
      <div className="col-span-1 sm:col-span-2 lg:col-span-4">
        <ChartPlaceholder label="WTI Crude — 2Y" tall />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="Gold vs Real Rates" />
      </div>
      <div className="col-span-1 sm:col-span-2">
        <ChartPlaceholder label="Energy vs Core CPI" />
      </div>
    </SectionWrap>
  )
}

function renderSection(id: SectionId) {
  switch (id) {
    case 'fed':     return <FedRates />
    case 'private': return <PrivateCredit />
    case 'yen':     return <YenCarry />
    case 'vol':     return <Volatility />
    case 'refi':    return <Refinancing />
    case 'capex':   return <Capex />
    case 'war':     return <WarOil />
  }
}

// ─── Sub-nav dock ──────────────────────────────────────────────────────────────

function SectionDock({
  active,
  onSelect,
}: {
  active: SectionId
  onSelect: (id: SectionId) => void
}) {
  return (
    <div
      className="sticky z-20 flex items-center gap-1 px-6 overflow-x-auto"
      style={{
        background: 'var(--raised)',
        borderBottom: '1px solid var(--line)',
        scrollbarWidth: 'none',
        height: '52px',
        top: 'var(--nav-h)',
      }}
    >
      {SECTIONS.map(({ id, label, Icon, color }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all outline-none cursor-pointer shrink-0"
            style={{
              background: isActive ? `${color}18` : 'transparent',
              border: `1px solid ${isActive ? color : 'transparent'}`,
              color: isActive ? color : 'var(--t3)',
            }}
            onMouseEnter={e => {
              if (!isActive) e.currentTarget.style.color = 'var(--t2)'
            }}
            onMouseLeave={e => {
              if (!isActive) e.currentTarget.style.color = 'var(--t3)'
            }}
          >
            <Icon size={13} strokeWidth={isActive ? 2 : 1.5} />
            {label}
          </button>
        )
      })}
    </div>
  )
}

// ─── MacroView ────────────────────────────────────────────────────────────────

export function MacroView() {
  const [active, setActive] = useState<SectionId>('fed')
  const section = SECTIONS.find(s => s.id === active)!

  return (
    <div className="min-h-screen" style={{ paddingTop: 'var(--nav-h)', background: 'var(--base)' }}>
      <SectionDock active={active} onSelect={setActive} />

      {/* Section header */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: '1px solid var(--line2)' }}
      >
        <section.Icon size={15} style={{ color: section.color }} strokeWidth={1.75} />
        <h1 className="text-[14px] font-semibold" style={{ color: 'var(--t1)', letterSpacing: '-0.01em' }}>
          {section.label}
        </h1>
        <ComingSoonBadge />
      </div>

      {/* Section content */}
      <AnimatePresence mode="wait">
        <div key={active}>
          {renderSection(active)}
        </div>
      </AnimatePresence>
    </div>
  )
}
