'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createChart, ColorType, LineStyle, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts'
import { api } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEFRAMES = ['4H', '1D', '1W', '1M', '3M', '1Y'] as const
type TF = typeof TIMEFRAMES[number]

// Maps display label → backend symbol
export const CHART_TICKERS: { label: string; sym: string }[] = [
  { label: 'BTC',    sym: 'BTC-USD'   },
  { label: 'EURUSD', sym: 'EURUSD=X'  },
  { label: 'NAS100', sym: 'QQQ'       },
  { label: 'SPX',    sym: 'SPY'       },
  { label: 'XAUUSD', sym: 'GC=F'      },
  { label: 'DXY',    sym: 'DX-Y.NYB'  },
  { label: 'US10Y',  sym: '^TNX'      },
  { label: 'WTI',    sym: 'CL=F'      },
  { label: 'USDJPY', sym: 'USDJPY=X'  },
  { label: 'VIX',    sym: '^VIX'      },
]

const TF_PARAMS: Record<TF, { period: string; interval: string }> = {
  '4H': { period: '1mo',  interval: '1d'  },
  '1D': { period: '6mo',  interval: '1d'  },
  '1W': { period: '1y',   interval: '1d'  },
  '1M': { period: '2y',   interval: '1wk' },
  '3M': { period: '5y',   interval: '1wk' },
  '1Y': { period: '10y',  interval: '1mo' },
}

// Overlay series colors — amber, coral, cream-dim, taupe
const OVERLAY_COLORS = [
  'rgba(196,152,88,0.85)',   // amber
  'rgba(200,136,120,0.80)',  // coral
  'rgba(240,237,232,0.40)',  // cream-dim
  'rgba(138,122,104,0.70)',  // taupe
]

// Dark chart theme tokens
const C = {
  bg:       '#111114',
  bg2:      '#0c0c0f',
  grid:     'rgba(255,255,255,0.032)',
  text:     'rgba(240,237,232,0.30)',
  border:   'rgba(255,255,255,0.06)',
  primary:  '#8aaa8e',  // sage
  cross:    'rgba(255,255,255,0.22)',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function labelFor(sym: string) {
  return CHART_TICKERS.find(t => t.sym === sym)?.label ?? sym
}

function parseExpression(expr: string): string[] {
  // Supports: "SPY", "SPY/GC=F", "^TNX - DGS2", "BTC-USD / QQQ"
  const raw = expr.trim()
  if (!raw) return []
  // Split on / or - that is not part of a ticker name
  const parts = raw.split(/\s*[\/\+\-\*]\s*/)
  return parts.map(p => p.trim()).filter(Boolean)
}

// ─── Chart component ──────────────────────────────────────────────────────────

function Chart({
  primary,
  overlaySyms,
  tf,
}: {
  primary: string
  overlaySyms: string[]
  tf: TF
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<IChartApi | null>(null)
  const seriesRef    = useRef<ISeriesApi<'Area'> | null>(null)
  const overlayRefs  = useRef<ISeriesApi<'Line'>[]>([])

  const params = TF_PARAMS[tf]

  const { data: primaryData } = useQuery({
    queryKey: ['chart-series', primary, tf],
    queryFn:  () => api.market.timeSeries(primary, params.period, params.interval).then(r => r.data),
    staleTime: 5 * 60_000,
    retry: 1,
  })

  // Fetch overlay data — run one query per overlay
  const overlay0 = useQuery({
    queryKey: ['chart-series', overlaySyms[0] ?? '', tf],
    queryFn:  () => overlaySyms[0]
      ? api.market.timeSeries(overlaySyms[0], params.period, params.interval).then(r => r.data)
      : Promise.resolve([]),
    enabled: !!overlaySyms[0],
    staleTime: 5 * 60_000,
    retry: 1,
  })
  const overlay1 = useQuery({
    queryKey: ['chart-series', overlaySyms[1] ?? '', tf],
    queryFn:  () => overlaySyms[1]
      ? api.market.timeSeries(overlaySyms[1], params.period, params.interval).then(r => r.data)
      : Promise.resolve([]),
    enabled: !!overlaySyms[1],
    staleTime: 5 * 60_000,
    retry: 1,
  })
  const overlay2 = useQuery({
    queryKey: ['chart-series', overlaySyms[2] ?? '', tf],
    queryFn:  () => overlaySyms[2]
      ? api.market.timeSeries(overlaySyms[2], params.period, params.interval).then(r => r.data)
      : Promise.resolve([]),
    enabled: !!overlaySyms[2],
    staleTime: 5 * 60_000,
    retry: 1,
  })
  const overlayDataSets = [overlay0.data, overlay1.data, overlay2.data]

  // Create chart once on mount
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      autoSize: true,
      height: 380,
      layout: {
        background: { type: ColorType.Solid, color: C.bg },
        textColor:  C.text,
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize:   11,
      },
      grid: {
        vertLines: { color: C.grid },
        horzLines: { color: C.grid },
      },
      crosshair: {
        vertLine: { color: C.cross, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#171719' },
        horzLine: { color: C.cross, width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#171719' },
      },
      rightPriceScale: {
        borderColor: C.border,
        textColor:   C.text,
        scaleMargins: { top: 0.12, bottom: 0.08 },
      },
      timeScale: {
        borderColor:     C.border,
        fixLeftEdge:     true,
        fixRightEdge:    true,
        timeVisible:     true,
        secondsVisible:  false,
      },
      handleScroll:  { mouseWheel: true, pressedMouseMove: true },
      handleScale:   { axisPressedMouseMove: true, mouseWheel: true },
    })

    const series = chart.addAreaSeries({
      lineColor:   C.primary,
      topColor:    'rgba(138,170,142,0.12)',
      bottomColor: 'rgba(138,170,142,0)',
      lineWidth:   1,
      priceLineVisible: false,
      lastValueVisible: true,
    })

    chartRef.current  = chart
    seriesRef.current = series

    return () => {
      chart.remove()
      chartRef.current  = null
      seriesRef.current = null
    }
  }, []) // intentionally empty — chart created once

  // Update primary series data
  useEffect(() => {
    if (!seriesRef.current || !primaryData?.length) return
    const pts = primaryData
      .map(p => ({ time: p.date as Time, value: p.value }))
      .sort((a, b) => (a.time < b.time ? -1 : 1))
    seriesRef.current.setData(pts)
    chartRef.current?.timeScale().fitContent()
  }, [primaryData])

  // Update overlay series
  useEffect(() => {
    if (!chartRef.current) return

    // Remove old overlay series
    overlayRefs.current.forEach(s => {
      try { chartRef.current?.removeSeries(s) } catch {}
    })
    overlayRefs.current = []

    overlayDataSets.forEach((data, i) => {
      if (!data?.length || !chartRef.current) return
      const color = OVERLAY_COLORS[i % OVERLAY_COLORS.length]
      const s = chartRef.current.addLineSeries({
        color,
        lineWidth:        1,
        priceLineVisible: false,
        lastValueVisible: true,
        priceScaleId:     `overlay-${i}`,
      })
      s.applyOptions({
        priceScale: { scaleMargins: { top: 0.1, bottom: 0.1 } },
      } as Parameters<typeof s.applyOptions>[0])
      const pts = data
        .map(p => ({ time: p.date as Time, value: p.value }))
        .sort((a, b) => (a.time < b.time ? -1 : 1))
      s.setData(pts)
      overlayRefs.current.push(s)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay0.data, overlay1.data, overlay2.data])

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" />
      {!primaryData && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[11px]" style={{ color: 'var(--t4)' }}>Loading…</div>
        </div>
      )}
    </div>
  )
}

// ─── Main MarketView ──────────────────────────────────────────────────────────

interface MarketViewProps {
  activeTicker?: string  // symbol from SidePanel click
}

export function MarketView({ activeTicker }: MarketViewProps) {
  const [primary,  setPrimary]  = useState('SPY')
  const [tf,       setTf]       = useState<TF>('1W')
  const [overlays, setOverlays] = useState<string[]>([])
  const [expr,     setExpr]     = useState('')
  const [exprInput, setExprInput] = useState('')

  // Sync with SidePanel click
  useEffect(() => {
    if (activeTicker) setPrimary(activeTicker)
  }, [activeTicker])

  const addOverlay = useCallback((sym: string) => {
    if (!sym || sym === primary || overlays.includes(sym) || overlays.length >= 3) return
    setOverlays(prev => [...prev, sym])
  }, [primary, overlays])

  const removeOverlay = useCallback((sym: string) => {
    setOverlays(prev => prev.filter(s => s !== sym))
  }, [])

  const applyExpression = () => {
    const parts = parseExpression(exprInput)
    if (!parts.length) return
    // For now: first token = primary, rest = overlays
    setPrimary(parts[0])
    setOverlays(parts.slice(1, 4))
    setExpr(exprInput)
  }

  const primaryLabel = labelFor(primary)

  return (
    <div className="border rounded-sm overflow-hidden"
      style={{ background: 'var(--raised)', borderColor: 'var(--line)' }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--line2)' }}>

        {/* Active label */}
        <span className="text-[11px] font-semibold tracking-[0.06em]"
          style={{ color: 'var(--t1)' }}>
          {primaryLabel}
        </span>

        {/* Divider */}
        <span style={{ color: 'var(--line)' }}>|</span>

        {/* Expression input */}
        <div className="flex items-center gap-1.5 flex-1">
          <input
            value={exprInput}
            onChange={e => setExprInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') applyExpression() }}
            placeholder="SPX / GOLD  ·  US10Y - US02Y  ·  BTC / NAS100"
            className="flex-1 bg-transparent text-[11px] outline-none min-w-0"
            style={{ color: 'var(--t2)', caretColor: 'var(--t1)' }}
          />
          {exprInput && (
            <button
              onClick={applyExpression}
              className="text-[9px] font-semibold tracking-[0.08em] uppercase px-2 py-1 rounded-sm border"
              style={{ color: 'var(--taupe)', borderColor: 'var(--line)' }}
            >
              Apply
            </button>
          )}
        </div>

        {/* Timeframe buttons */}
        <div className="flex items-center gap-px">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className="text-[10px] font-medium px-2.5 py-1 rounded-sm transition-colors"
              style={{
                color:      t === tf ? 'var(--t1)'   : 'var(--t3)',
                background: t === tf ? 'var(--float)' : 'transparent',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Overlay chips + add ──────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ borderColor: 'var(--line2)' }}>
        <span className="text-[9px] font-semibold tracking-[0.1em] uppercase"
          style={{ color: 'var(--taupe)' }}>
          Overlay
        </span>
        {overlays.map((sym, i) => (
          <span
            key={sym}
            className="inline-flex items-center gap-1 text-[10px] px-2 py-[2px] rounded-sm border"
            style={{
              color: OVERLAY_COLORS[i % OVERLAY_COLORS.length],
              borderColor: OVERLAY_COLORS[i % OVERLAY_COLORS.length].replace('0.85', '0.3').replace('0.80', '0.3').replace('0.40', '0.2').replace('0.70', '0.3'),
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            {labelFor(sym)}
            <button
              onClick={() => removeOverlay(sym)}
              className="opacity-50 hover:opacity-100 transition-opacity ml-0.5 text-[9px]"
            >
              ×
            </button>
          </span>
        ))}

        {/* Add overlay dropdown */}
        {overlays.length < 3 && (
          <select
            value=""
            onChange={e => { addOverlay(e.target.value); e.target.value = '' }}
            className="text-[10px] bg-transparent outline-none cursor-pointer"
            style={{ color: 'var(--t4)' }}
          >
            <option value="" disabled style={{ background: '#111114' }}>+ Add</option>
            {CHART_TICKERS
              .filter(t => t.sym !== primary && !overlays.includes(t.sym))
              .map(t => (
                <option key={t.sym} value={t.sym} style={{ background: '#111114', color: '#f0ede8' }}>
                  {t.label}
                </option>
              ))}
          </select>
        )}
      </div>

      {/* ── Chart ───────────────────────────────────────────────── */}
      <div style={{ background: C.bg }}>
        <Chart primary={primary} overlaySyms={overlays} tf={tf} />
      </div>

    </div>
  )
}
