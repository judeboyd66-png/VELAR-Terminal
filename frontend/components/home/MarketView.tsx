'use client'

import { useEffect, useState } from 'react'

// ─── Symbol map: our sidebar keys → TradingView exchange:symbol ───────────────

export const TV_SYMBOLS: Record<string, string> = {
  'BTC-USD':   'BITSTAMP:BTCUSD',
  'EURUSD=X':  'FX:EURUSD',
  'QQQ':       'NASDAQ:QQQ',
  'SPY':       'AMEX:SPY',
  'GC=F':      'COMEX:GC1!',
  'DX-Y.NYB':  'TVC:DXY',
  '^TNX':      'TVC:US10Y',
  'CL=F':      'NYMEX:CL1!',
  'USDJPY=X':  'FX:USDJPY',
  '^VIX':      'CBOE:VIX',
}

// ─── Timeframes ───────────────────────────────────────────────────────────────

const TIMEFRAMES = ['4H', '1D', '1W', '1M', '3M', '1Y'] as const
type TF = typeof TIMEFRAMES[number]

const TV_INTERVAL: Record<TF, string> = {
  '4H':  '240',
  '1D':  'D',
  '1W':  'W',
  '1M':  'M',
  '3M':  '3M',
  '1Y':  '12M',
}

// ─── Build iframe URL ─────────────────────────────────────────────────────────

function buildSrc(sym: string, tf: TF): string {
  const tvSym    = TV_SYMBOLS[sym] ?? sym
  const interval = TV_INTERVAL[tf]
  const params   = new URLSearchParams({
    symbol:             tvSym,
    interval,
    theme:              'dark',
    style:              '1',        // candlestick
    locale:             'en',
    toolbarbg:          '111111',
    timezone:           'Etc/UTC',
    enable_publishing:  '0',
    symboledit:         '1',        // allow typing symbols inside TV
    hideideas:          '1',
    // candle colour overrides — white up, grey down
    'overrides[mainSeriesProperties.candleStyle.upColor]':         '#e8e8e8',
    'overrides[mainSeriesProperties.candleStyle.downColor]':       '#555555',
    'overrides[mainSeriesProperties.candleStyle.borderUpColor]':   '#e8e8e8',
    'overrides[mainSeriesProperties.candleStyle.borderDownColor]': '#555555',
    'overrides[mainSeriesProperties.candleStyle.wickUpColor]':     '#aaaaaa',
    'overrides[mainSeriesProperties.candleStyle.wickDownColor]':   '#666666',
  })
  return `https://www.tradingview.com/widgetembed/?${params.toString()}`
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MarketViewProps {
  activeTicker?: string
}

export function MarketView({ activeTicker }: MarketViewProps) {
  const [tf,  setTf]  = useState<TF>('1D')
  const [sym, setSym] = useState(activeTicker ?? 'SPY')

  // Sync ticker from sidebar click
  useEffect(() => {
    if (activeTicker) setSym(activeTicker)
  }, [activeTicker])

  const src = buildSrc(sym, tf)

  return (
    <div
      className="border rounded-sm overflow-hidden flex flex-col"
      style={{ borderColor: 'var(--line)', background: '#111111' }}
    >
      {/* ── Top bar ───────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--line2)' }}
      >
        <span
          className="text-[11px] font-semibold tracking-[0.04em]"
          style={{ color: 'var(--t2)' }}
        >
          {TV_SYMBOLS[sym] ?? sym}
        </span>

        {/* Timeframe buttons */}
        <div className="flex items-center gap-px">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className="text-[10px] font-medium px-2.5 py-1 rounded-sm transition-colors"
              style={{
                color:      t === tf ? 'var(--t1)'    : 'var(--t4)',
                background: t === tf ? 'var(--float)' : 'transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart iframe ──────────────────────────────────────── */}
      {/*
        key={src} forces React to unmount+remount the iframe whenever
        symbol or timeframe changes — guarantees a fresh chart every time.
      */}
      <iframe
        key={src}
        src={src}
        width="100%"
        height="560"
        frameBorder="0"
        allowFullScreen
        style={{ display: 'block' }}
      />
    </div>
  )
}
