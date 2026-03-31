'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window { TradingView?: any }
}

// ─── Symbol map ───────────────────────────────────────────────────────────────
//   The script widget reads your TradingView browser session, so all symbols
//   available on your account work — TVC bonds, futures, indices, everything.
//   Just stay logged into TradingView.com in the same browser.

export const TV_SYMBOLS: Record<string, string> = {
  'BTC-USD':   'BITSTAMP:BTCUSD',
  'EURUSD=X':  'FX:EURUSD',
  'QQQ':       'NASDAQ:QQQ',
  'SPY':       'AMEX:SPY',
  'GC=F':      'TVC:GOLD',
  'DX-Y.NYB':  'TVC:DXY',
  '^TNX':      'TVC:US10Y',
  'CL=F':      'TVC:USOIL',
  'USDJPY=X':  'FX:USDJPY',
  '^VIX':      'TVC:VIX',
  'HYG':       'AMEX:HYG',
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

// ─── Component ────────────────────────────────────────────────────────────────

interface MarketViewProps {
  activeTicker?: string
}

export function MarketView({ activeTicker }: MarketViewProps) {
  const [tf,  setTf]  = useState<TF>('1D')
  const [sym, setSym] = useState(activeTicker ?? 'SPY')
  const containerRef  = useRef<HTMLDivElement>(null)

  // Sync ticker from sidebar / tile click
  useEffect(() => {
    if (activeTicker) setSym(activeTicker)
  }, [activeTicker])

  // Build + mount the TradingView Advanced Chart widget
  useEffect(() => {
    const tvSym    = TV_SYMBOLS[sym] ?? sym
    const interval = TV_INTERVAL[tf]
    if (!containerRef.current) return

    // A unique container ID each time prevents TradingView from loading
    // cached state from a previous symbol (the "stuck on old symbol" bug)
    const containerId = `tv_${Date.now()}`
    containerRef.current.innerHTML =
      `<div id="${containerId}" style="width:100%;height:100%"></div>`

    const init = () => {
      if (!window.TradingView || !document.getElementById(containerId)) return
      new window.TradingView.widget({
        autosize:          true,
        symbol:            tvSym,
        interval,
        timezone:          'Etc/UTC',
        theme:             'dark',
        style:             '1',          // candlestick
        locale:            'en',
        toolbar_bg:        '#111111',
        enable_publishing: false,
        hide_side_toolbar: false,        // keep drawing tools
        save_image:        false,
        container_id:      containerId,
      })
    }

    // Load tv.js once; reuse the global on subsequent symbol switches
    if (window.TradingView) {
      init()
    } else {
      const s        = document.createElement('script')
      s.src          = 'https://s3.tradingview.com/tv.js'
      s.async        = true
      s.onload       = init
      document.head.appendChild(s)
    }
  }, [sym, tf])

  const displaySym = TV_SYMBOLS[sym] ?? sym

  return (
    <div
      className="border rounded-sm overflow-hidden flex flex-col"
      style={{ borderColor: 'var(--line)', background: '#111111' }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--line2)' }}
      >
        <span
          className="text-[11px] font-semibold tracking-[0.04em]"
          style={{ color: 'var(--t2)' }}
        >
          {displaySym}
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

      {/* ── Chart (script widget mounts here) ───────────────────── */}
      <div ref={containerRef} style={{ height: '560px' }} />
    </div>
  )
}
