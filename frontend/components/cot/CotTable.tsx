'use client'

import { motion } from 'framer-motion'

// ─── Static COT data (CFTC Commitment of Traders, weekly) ─────────
// Net non-commercial positions (large speculators). Positive = net long.

const COT_DATA = [
  {
    market: 'EUR/USD',   asset: 'FX',     net: 42_800,  change: +5_200,  oi: 8.4,  bias: 'bullish' as const },
  {
    market: 'GBP/USD',   asset: 'FX',     net: -18_400, change: -3_100,  oi: -6.2, bias: 'bearish' as const },
  {
    market: 'JPY/USD',   asset: 'FX',     net: -61_200, change: -8_700,  oi: -14.8, bias: 'bearish' as const },
  {
    market: 'AUD/USD',   asset: 'FX',     net: 12_300,  change: +2_400,  oi: 4.1,  bias: 'bullish' as const },
  {
    market: 'Gold',      asset: 'Metals', net: 184_600, change: -6_300,  oi: 22.1, bias: 'bullish' as const },
  {
    market: 'Silver',    asset: 'Metals', net: 28_400,  change: +4_100,  oi: 9.6,  bias: 'bullish' as const },
  {
    market: 'WTI Crude', asset: 'Energy', net: 198_200, change: -12_500, oi: 18.7, bias: 'bullish' as const },
  {
    market: 'Nat Gas',   asset: 'Energy', net: -82_100, change: +3_300,  oi: -24.3, bias: 'bearish' as const },
  {
    market: 'S&P 500',   asset: 'Equity', net: 31_400,  change: +8_900,  oi: 5.2,  bias: 'bullish' as const },
  {
    market: 'Nasdaq',    asset: 'Equity', net: -14_200, change: -2_200,  oi: -7.8, bias: 'bearish' as const },
  {
    market: 'Bitcoin',   asset: 'Crypto', net: 8_900,   change: +1_600,  oi: 11.4, bias: 'bullish' as const },
  {
    market: 'Copper',    asset: 'Metals', net: 22_100,  change: -900,    oi: 6.3,  bias: 'bullish' as const },
]

const ASSET_TYPES = ['All', 'FX', 'Metals', 'Energy', 'Equity', 'Crypto']

function fmtNet(n: number) {
  const abs = Math.abs(n)
  const sign = n >= 0 ? '+' : '−'
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}K`
  return `${sign}${abs}`
}

// Horizontal bar showing net positioning scale (max ~±200K)
function PositionBar({ net }: { net: number }) {
  const MAX = 220_000
  const pct = Math.min(Math.abs(net) / MAX, 1) * 100
  const isLong = net >= 0

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Short side */}
      <div className="flex-1 flex justify-end">
        {!isLong && (
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${pct}%`, background: 'var(--coral)', opacity: 0.7 }}
          />
        )}
      </div>

      {/* Center tick */}
      <div className="w-px h-3 shrink-0" style={{ background: 'var(--line)' }} />

      {/* Long side */}
      <div className="flex-1">
        {isLong && (
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${pct}%`, background: 'var(--sage)', opacity: 0.7 }}
          />
        )}
      </div>
    </div>
  )
}

function BiasBadge({ bias }: { bias: 'bullish' | 'bearish' | 'neutral' }) {
  const styles = {
    bullish: { color: 'var(--sage)',  bg: 'rgba(138,170,142,0.1)',  border: 'rgba(138,170,142,0.25)', label: 'Long' },
    bearish: { color: 'var(--coral)', bg: 'rgba(200,136,120,0.1)',  border: 'rgba(200,136,120,0.25)', label: 'Short' },
    neutral: { color: 'var(--taupe)', bg: 'rgba(138,122,104,0.1)',  border: 'rgba(138,122,104,0.25)', label: 'Neutral' },
  }
  const s = styles[bias]
  return (
    <span
      className="text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  )
}

export function CotTable() {
  return (
    <div className="px-14 py-12">

      {/* Header */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
      >
        <div className="section-label mb-3">COT Report</div>
        <h1
          className="font-bold mb-2"
          style={{ fontSize: 'clamp(26px, 2.8vw, 38px)', letterSpacing: '-0.03em', color: 'var(--t1)', lineHeight: 1.1 }}
        >
          Commitment of Traders
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.6 }}>
          Net non-commercial positions (large speculators) — CFTC weekly. Positive = net long.
        </p>
      </motion.div>

      {/* Table */}
      <motion.div
        className="border rounded-lg overflow-hidden"
        style={{ borderColor: 'var(--line)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {/* Table header */}
        <div
          className="grid border-b px-6 py-3"
          style={{
            gridTemplateColumns: '160px 80px 110px 110px 80px 200px 80px',
            borderColor: 'var(--line)',
            background: 'var(--raised)',
          }}
        >
          {['Market', 'Asset', 'Net Position', 'Wk Change', '% OI', 'Positioning', 'Bias'].map(h => (
            <div key={h} className="section-label">{h}</div>
          ))}
        </div>

        {/* Rows */}
        {COT_DATA.map((row, i) => {
          const changeUp = row.change >= 0
          return (
            <motion.div
              key={row.market}
              className="grid items-center px-6 border-b last:border-none"
              style={{
                gridTemplateColumns: '160px 80px 110px 110px 80px 200px 80px',
                borderColor: 'var(--line2)',
                height: 52,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * i }}
              whileHover={{ background: 'rgba(255,255,255,0.018)' }}
            >
              {/* Market */}
              <div className="text-[13px] font-semibold" style={{ color: 'var(--t1)', letterSpacing: '-0.01em' }}>
                {row.market}
              </div>

              {/* Asset type */}
              <div className="text-[10px] font-medium tracking-[0.06em] uppercase" style={{ color: 'var(--taupe)' }}>
                {row.asset}
              </div>

              {/* Net position */}
              <div
                className="text-[13px] font-semibold tabular-nums"
                style={{ color: row.net >= 0 ? 'var(--sage)' : 'var(--coral)', letterSpacing: '-0.01em' }}
              >
                {fmtNet(row.net)}
              </div>

              {/* Week change */}
              <div
                className="text-[12px] tabular-nums"
                style={{ color: changeUp ? 'var(--sage)' : 'var(--coral)', opacity: 0.8 }}
              >
                {changeUp ? '▲' : '▼'} {fmtNet(Math.abs(row.change))}
              </div>

              {/* % of OI */}
              <div
                className="text-[12px] tabular-nums"
                style={{ color: row.oi >= 0 ? 'var(--t2)' : 'var(--t2)' }}
              >
                {row.oi >= 0 ? '+' : ''}{row.oi.toFixed(1)}%
              </div>

              {/* Position bar */}
              <div className="pr-4">
                <PositionBar net={row.net} />
              </div>

              {/* Bias badge */}
              <div>
                <BiasBadge bias={row.bias} />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Footer note */}
      <p className="mt-6 text-[11px]" style={{ color: 'var(--t4)' }}>
        Data sourced from CFTC Commitments of Traders report. Updated weekly, typically released Friday.
        Position bar width is relative to open interest.
      </p>

    </div>
  )
}
