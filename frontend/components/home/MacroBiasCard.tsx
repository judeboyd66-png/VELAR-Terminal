'use client'

import type { MarketQuote } from '@/lib/api'
import { getMacroBias, type MacroBiasFactorStates } from '@/lib/macroBias'

interface MacroBiasCardProps {
  quotes?: MarketQuote[]
  us02y: {
    current: number | null
    changePct: number | null
  } | null
}

type FactorKey = keyof MacroBiasFactorStates

type InputCard = {
  label: string
  price: string
  change: string
  tone: string
}

function fmtPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function fmtValue(value: number | null | undefined, decimals = 2, suffix = '') {
  if (value == null || Number.isNaN(value)) return '—'
  if (decimals === 0) return value.toLocaleString('en-US', { maximumFractionDigits: 0 }) + suffix
  return value.toFixed(decimals) + suffix
}

function scoreColor(score: number) {
  if (score >= 2.25) return 'var(--sage)'
  if (score <= -2.25) return 'var(--coral)'
  return 'var(--amber)'
}

function factorTone(key: FactorKey, value: MacroBiasFactorStates[FactorKey]) {
  if (value === 'neutral') {
    return {
      color: 'var(--taupe)',
      border: 'rgba(138,122,104,0.12)',
      background: 'rgba(138,122,104,0.05)',
    }
  }

  if (key === 'yields') {
    return {
      color: 'var(--amber)',
      border: 'rgba(196,152,88,0.18)',
      background: 'rgba(196,152,88,0.08)',
    }
  }

  const positive =
    (key === 'equities' && value === 'strong') ||
    (key === 'crypto' && value === 'strong') ||
    (key === 'euro' && value === 'strong') ||
    (key === 'dollar' && value === 'weak') ||
    (key === 'gold' && value === 'weak')

  return positive
    ? {
        color: 'var(--sage)',
        border: 'rgba(138,170,142,0.18)',
        background: 'rgba(138,170,142,0.07)',
      }
    : {
        color: 'var(--coral)',
        border: 'rgba(200,136,120,0.18)',
        background: 'rgba(200,136,120,0.07)',
      }
}

function factorMeta(
  factorStates: MacroBiasFactorStates,
  changes: Record<string, number | null | undefined>,
) {
  return [
    {
      key: 'yields' as const,
      label: 'Yields',
      state: factorStates.yields,
      detail: `2Y ${fmtPct(changes.us02y)} · 10Y ${fmtPct(changes.us10y)}`,
      note:
        factorStates.yields === 'down'
          ? 'Easing or growth-scare. Equities and dollar decide the interpretation.'
          : factorStates.yields === 'up'
            ? 'Policy pressure is building unless risk assets absorb it well.'
            : 'Rates are not giving a strong directional read.',
    },
    {
      key: 'dollar' as const,
      label: 'Dollar',
      state: factorStates.dollar,
      detail: `DXY ${fmtPct(changes.dxy)} · EURUSD ${fmtPct(changes.eurusd)}`,
      note:
        factorStates.dollar === 'weak'
          ? 'Softer financial conditions are helping cross-asset risk.'
          : factorStates.dollar === 'strong'
            ? 'Dollar firmness is tightening external conditions.'
            : 'FX is not a major driver right now.',
    },
    {
      key: 'equities' as const,
      label: 'Equities',
      state: factorStates.equities,
      detail: `NAS100 ${fmtPct(changes.nas100)} · SPX ${fmtPct(changes.spx)}`,
      note:
        factorStates.equities === 'strong'
          ? 'Stocks are confirming risk appetite, with tech carrying more weight.'
          : factorStates.equities === 'weak'
            ? 'Stocks are not confirming optimism, which keeps the tape defensive.'
            : 'Index action is balanced and not confirming either side.',
    },
    {
      key: 'crypto' as const,
      label: 'Crypto',
      state: factorStates.crypto,
      detail: `BTC ${fmtPct(changes.btc)}`,
      note:
        factorStates.crypto === 'strong'
          ? 'BTC is confirming high-beta appetite.'
          : factorStates.crypto === 'weak'
            ? 'BTC is fading and can reduce confidence in any equity bounce.'
            : 'Crypto is not adding much confirmation yet.',
    },
    {
      key: 'gold' as const,
      label: 'Gold',
      state: factorStates.gold,
      detail: `XAUUSD ${fmtPct(changes.xauusd)}`,
      note:
        factorStates.gold === 'strong'
          ? 'Gold strength leans defensive unless broader risk is clearly strong.'
          : factorStates.gold === 'weak'
            ? 'Safe-haven demand is easing back.'
            : 'Gold is not leaning hard either way.',
    },
    {
      key: 'euro' as const,
      label: 'Euro',
      state: factorStates.euro,
      detail: `EURUSD ${fmtPct(changes.eurusd)}`,
      note:
        factorStates.euro === 'strong'
          ? 'EUR strength reinforces a softer-dollar backdrop.'
          : factorStates.euro === 'weak'
            ? 'EUR weakness reinforces dollar pressure.'
            : 'EURUSD is not shifting the regime read much.',
    },
  ]
}

export function MacroBiasCard({ quotes, us02y }: MacroBiasCardProps) {
  const quote = (symbol: string) => quotes?.find(item => item.symbol === symbol)

  const us10yQuote = quote('^TNX')
  const dxyQuote = quote('DX-Y.NYB')
  const spxQuote = quote('SPY')
  const nasQuote = quote('QQQ')
  const btcQuote = quote('BTC-USD')
  const goldQuote = quote('GC=F')
  const euroQuote = quote('EURUSD=X')

  const inputs = {
    us02y: us02y?.changePct ?? null,
    us10y: us10yQuote?.changePct ?? null,
    dxy: dxyQuote?.changePct ?? null,
    spx: spxQuote?.changePct ?? null,
    nas100: nasQuote?.changePct ?? null,
    btc: btcQuote?.changePct ?? null,
    xauusd: goldQuote?.changePct ?? null,
    eurusd: euroQuote?.changePct ?? null,
  }

  const bias = getMacroBias(inputs)
  const meterPosition = `${((bias.score + 10) / 20) * 100}%`
  const factors = factorMeta(bias.factorStates, inputs)
  const inputCards: InputCard[] = [
    {
      label: 'US02Y',
      price: fmtValue(us02y?.current, 2, '%'),
      change: fmtPct(inputs.us02y),
      tone: inputs.us02y == null ? 'var(--t3)' : inputs.us02y > 0 ? 'var(--coral)' : inputs.us02y < 0 ? 'var(--sage)' : 'var(--t3)',
    },
    {
      label: 'US10Y',
      price: fmtValue(us10yQuote?.price, 2, '%'),
      change: fmtPct(inputs.us10y),
      tone: inputs.us10y == null ? 'var(--t3)' : inputs.us10y > 0 ? 'var(--coral)' : inputs.us10y < 0 ? 'var(--sage)' : 'var(--t3)',
    },
    {
      label: 'DXY',
      price: fmtValue(dxyQuote?.price, 2),
      change: fmtPct(inputs.dxy),
      tone: inputs.dxy == null ? 'var(--t3)' : inputs.dxy > 0 ? 'var(--coral)' : inputs.dxy < 0 ? 'var(--sage)' : 'var(--t3)',
    },
    {
      label: 'SPX',
      price: fmtValue(spxQuote?.price, 2),
      change: fmtPct(inputs.spx),
      tone: inputs.spx == null ? 'var(--t3)' : inputs.spx > 0 ? 'var(--sage)' : inputs.spx < 0 ? 'var(--coral)' : 'var(--t3)',
    },
    {
      label: 'NAS100',
      price: fmtValue(nasQuote?.price, 2),
      change: fmtPct(inputs.nas100),
      tone: inputs.nas100 == null ? 'var(--t3)' : inputs.nas100 > 0 ? 'var(--sage)' : inputs.nas100 < 0 ? 'var(--coral)' : 'var(--t3)',
    },
    {
      label: 'BTC',
      price: fmtValue(btcQuote?.price, 0),
      change: fmtPct(inputs.btc),
      tone: inputs.btc == null ? 'var(--t3)' : inputs.btc > 0 ? 'var(--sage)' : inputs.btc < 0 ? 'var(--coral)' : 'var(--t3)',
    },
    {
      label: 'XAUUSD',
      price: fmtValue(goldQuote?.price, 0),
      change: fmtPct(inputs.xauusd),
      tone: inputs.xauusd == null ? 'var(--t3)' : inputs.xauusd > 0 ? 'var(--amber)' : inputs.xauusd < 0 ? 'var(--taupe)' : 'var(--t3)',
    },
    {
      label: 'EURUSD',
      price: fmtValue(euroQuote?.price, 4),
      change: fmtPct(inputs.eurusd),
      tone: inputs.eurusd == null ? 'var(--t3)' : inputs.eurusd > 0 ? 'var(--sage)' : inputs.eurusd < 0 ? 'var(--coral)' : 'var(--t3)',
    },
  ]

  return (
    <div>
      <div className="section-label mb-3">Macro Bias</div>

      <div
        className="rounded-sm border p-5"
        style={{ borderColor: 'var(--line)', background: 'var(--raised)' }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-[720px]">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="live-dot" />
              <h3
                className="text-[24px] font-bold leading-none"
                style={{ color: 'var(--t1)', letterSpacing: '-0.03em' }}
              >
                {bias.label}
              </h3>
              <span
                className="text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-1 rounded-sm border"
                style={{
                  color: scoreColor(bias.score),
                  borderColor: 'var(--line2)',
                  background: 'var(--base)',
                }}
              >
                Score {bias.score > 0 ? '+' : ''}{bias.score.toFixed(1)}
              </span>
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: 'var(--t3)' }}>
                Confidence {(bias.confidence * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: 'var(--t4)' }}>
                Live market + FRED
              </span>
            </div>

            <div
              className="relative h-2 rounded-full border overflow-hidden mb-3"
              style={{ borderColor: 'var(--line2)', background: 'var(--base)' }}
            >
              <div className="absolute inset-y-0 left-0 w-1/2" style={{ background: 'rgba(200,136,120,0.18)' }} />
              <div className="absolute inset-y-0 right-0 w-1/2" style={{ background: 'rgba(138,170,142,0.18)' }} />
              <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: 'var(--line)' }} />
              <div
                className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border"
                style={{
                  left: meterPosition,
                  background: 'var(--raised)',
                  borderColor: scoreColor(bias.score),
                  boxShadow: `0 0 0 2px ${scoreColor(bias.score)}20`,
                }}
              />
            </div>

            <p className="text-[12px] leading-[1.65] max-w-[680px]" style={{ color: 'var(--t2)' }}>
              {bias.explanation}
            </p>
          </div>

          <div className="shrink-0 lg:min-w-[220px]">
            <div className="section-label mb-2">Live Inputs</div>
            <div className="text-[10px] leading-[1.55]" style={{ color: 'var(--t4)' }}>
              The engine reads daily changes from rates, dollar, equities, crypto, gold, and euro in real time.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {inputCards.map(card => (
            <div
              key={card.label}
              className="rounded-sm border px-4 py-3"
              style={{ borderColor: 'var(--line2)', background: 'rgba(255,255,255,0.015)' }}
            >
              <div className="section-label mb-2">{card.label}</div>
              <div
                className="text-[15px] font-semibold tabular-nums leading-none mb-1"
                style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}
              >
                {card.price}
              </div>
              <div className="text-[10px] tabular-nums" style={{ color: card.tone }}>
                {card.change}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
          {factors.map(factor => {
            const tone = factorTone(factor.key, factor.state)

            return (
              <div
                key={factor.key}
                className="rounded-sm border px-4 py-3"
                style={{ borderColor: 'var(--line2)', background: 'rgba(255,255,255,0.015)' }}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="section-label">{factor.label}</span>
                  <span
                    className="text-[8px] font-semibold tracking-[0.1em] uppercase px-[7px] py-[3px] rounded-sm border"
                    style={{
                      color: tone.color,
                      background: tone.background,
                      borderColor: tone.border,
                    }}
                  >
                    {factor.state}
                  </span>
                </div>
                <div className="text-[11px] tabular-nums leading-[1.5]" style={{ color: 'var(--t3)' }}>
                  {factor.detail}
                </div>
                <div className="text-[10px] leading-[1.45] mt-2" style={{ color: 'var(--t4)' }}>
                  {factor.note}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
