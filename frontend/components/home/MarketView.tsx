'use client'

import { useEffect, useRef, useState } from 'react'

// ─── TradingView global type ──────────────────────────────────────────────────

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView: { widget: new (config: Record<string, any>) => void }
  }
}

// ─── Symbol map: our internal keys → TradingView exchange:symbol ──────────────

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
  '4H': '240',
  '1D': 'D',
  '1W': 'W',
  '1M': 'M',
  '3M': '3M',
  '1Y': '12M',
}

const CONTAINER_ID = 'velar-tv-chart'

// ─── Component ────────────────────────────────────────────────────────────────

interface MarketViewProps {
  activeTicker?: string
}

export function MarketView({ activeTicker }: MarketViewProps) {
  const [tf,  setTf]  = useState<TF>('1D')
  const [sym, setSym] = useState(activeTicker ?? 'SPY')
  const scriptLoaded  = useRef(false)

  // Sync ticker from sidebar click
  useEffect(() => {
    if (activeTicker) setSym(activeTicker)
  }, [activeTicker])

  // Load tv.js once
  useEffect(() => {
    if (document.getElementById('tv-script')) {
      scriptLoaded.current = true
      return
    }
    const s = document.createElement('script')
    s.id  = 'tv-script'
    s.src = 'https://s3.tradingview.com/tv.js'
    s.async = true
    s.onload = () => { scriptLoaded.current = true }
    document.head.appendChild(s)
  }, [])

  // Create / re-create widget whenever sym or tf changes
  useEffect(() => {
    const tvSym     = TV_SYMBOLS[sym] ?? sym
    const interval  = TV_INTERVAL[tf]

    const create = () => {
      const el = document.getElementById(CONTAINER_ID)
      if (!el || !window.TradingView) return
      el.innerHTML = ''   // destroy previous widget
      new window.TradingView.widget({
        autosize:             true,
        symbol:               tvSym,
        interval,
        timezone:             'Etc/UTC',
        theme:                'dark',
        style:                '1',        // candlestick
        locale:               'en',
        toolbar_bg:           '#111111',
        backgroundColor:      'rgba(17,17,17,1)',
        gridColor:            'rgba(255,255,255,0.04)',
        enable_publishing:    false,
        allow_symbol_change:  false,
        hide_side_toolbar:    false,
        save_image:           false,
        withdateranges:       true,
        hide_legend:          false,
        container_id:         CONTAINER_ID,
        // Candle colours — white up, grey down
        overrides: {
          'mainSeriesProperties.candleStyle.upColor':             '#e8e8e8',
          'mainSeriesProperties.candleStyle.downColor':           '#555555',
          'mainSeriesProperties.candleStyle.borderUpColor':       '#e8e8e8',
          'mainSeriesProperties.candleStyle.borderDownColor':     '#555555',
          'mainSeriesProperties.candleStyle.wickUpColor':         '#aaaaaa',
          'mainSeriesProperties.candleStyle.wickDownColor':       '#666666',
          'paneProperties.background':                            '#111111',
          'paneProperties.backgroundType':                        'solid',
          'paneProperties.vertGridProperties.color':              'rgba(255,255,255,0.04)',
          'paneProperties.horzGridProperties.color':              'rgba(255,255,255,0.04)',
          'scalesProperties.textColor':                           'rgba(200,200,200,0.4)',
          'scalesProperties.lineColor':                           'rgba(255,255,255,0.07)',
        },
      })
    }

    // If script already loaded, create immediately; else wait for it
    if (window.TradingView) {
      create()
    } else {
      const s = document.getElementById('tv-script')
      if (s) {
        s.addEventListener('load', create, { once: true })
        return () => s.removeEventListener('load', create)
      }
    }
  }, [sym, tf])

  const label = Object.entries(TV_SYMBOLS).find(([k]) => k === sym)?.[0] ?? sym

  return (
    <div
      className="border rounded-sm overflow-hidden flex flex-col"
      style={{ borderColor: 'var(--line)', background: '#111111' }}
    >
      {/* ── Controls ──────────────────────────────────────────── */}
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

      {/* ── TradingView chart ─────────────────────────────────── */}
      <div id={CONTAINER_ID} style={{ height: '560px' }} />
    </div>
  )
}
