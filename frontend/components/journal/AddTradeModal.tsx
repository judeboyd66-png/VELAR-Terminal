'use client'

import { useState, useRef, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ImagePlus, XCircle } from 'lucide-react'
import { type Trade, type TradeResult, type TradeDirection, type Timeframe, type Session } from '@/lib/journal'

const PAIRS      = ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCAD','NZDUSD','USDCHF','EURGBP','XAUUSD','XAGUSD','BTCUSD','ETHUSD','NAS100','SPX500','US30','XCUUSD','USOIL','NATGAS']
const TIMEFRAMES = ['1M','5M','15M','1H','4H','D','W']
const SESSIONS   = ['London','New York','Asia','Overlap']

type FormData = {
  date: string; time: string; pair: string; direction: TradeDirection
  timeframe: Timeframe; session: Session; entry: string; sl: string; tp: string
  riskPct: string; rrPlanned: string; result: TradeResult; notes: string
}

const EMPTY: FormData = {
  date: new Date().toISOString().slice(0, 10), time: '', pair: 'EURUSD',
  direction: 'Long', timeframe: '1H', session: 'London',
  entry: '', sl: '', tp: '', riskPct: '1', rrPlanned: '2',
  result: 'Win', notes: '',
}

// Resize image for storage — keep resolution high enough to read chart details
function compressImage(file: File, maxW = 1920, maxH = 1080, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      if (width > maxW || height > maxH) {
        const ratio = Math.min(maxW / width, maxH / height)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))   // PNG — lossless, sharp text/lines
    }
    img.onerror = reject
    img.src = url
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--t4)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--float)', border: '1px solid var(--line)',
  color: 'var(--t1)', borderRadius: '6px', padding: '8px 10px',
  fontSize: '12px', outline: 'none', width: '100%',
}

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={inputStyle}
      onFocus={e => (e.currentTarget.style.borderColor = 'var(--t3)')}
      onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line)')}
    />
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function ToggleGroup<T extends string>({
  value, onChange, options, colors,
}: {
  value: T; onChange: (v: T) => void; options: T[]
  colors?: Partial<Record<T, string>>
}) {
  return (
    <div className="flex gap-1">
      {options.map(o => {
        const active = value === o
        const color  = colors?.[o] ?? 'var(--t3)'
        return (
          <button
            key={o} type="button" onClick={() => onChange(o)}
            className="flex-1 py-1.5 rounded-md text-[11px] font-medium transition-all outline-none cursor-pointer"
            style={{
              background: active ? `${color}20` : 'var(--float)',
              border: `1px solid ${active ? color : 'var(--line)'}`,
              color: active ? color : 'var(--t3)',
            }}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ─── Screenshot Attach Zone ───────────────────────────────────────────────────

function ScreenshotZone({
  value,
  onChange,
}: {
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const compressed = await compressImage(file)
    onChange(compressed)
  }, [onChange])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  if (value) {
    return (
      <div className="relative rounded-lg overflow-hidden" style={{ border: '1px solid var(--line)' }}>
        <img
          src={value}
          alt="chart"
          style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }}
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 rounded-full outline-none cursor-pointer transition-opacity"
          style={{ background: 'rgba(0,0,0,0.55)', border: 'none', padding: '3px', lineHeight: 0 }}
          title="Remove screenshot"
        >
          <XCircle size={16} style={{ color: '#fff' }} />
        </button>
        <div
          className="absolute bottom-2 left-2 text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
        >
          Chart attached
        </div>
      </div>
    )
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer transition-all"
      style={{
        height: '80px',
        border: `1.5px dashed ${dragging ? 'var(--t2)' : 'var(--line)'}`,
        background: dragging ? 'color-mix(in srgb, var(--t2) 4%, transparent)' : 'transparent',
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]
        if (f) handleFile(f)
        e.target.value = ''
      }} />
      <ImagePlus size={18} style={{ color: 'var(--t4)' }} />
      <span style={{ color: 'var(--t4)', fontSize: '11px' }}>Attach chart screenshot</span>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function AddTradeModal({
  onAdd,
  trigger,
}: {
  onAdd: (t: Omit<Trade, 'id' | 'createdAt'>) => void
  trigger: React.ReactNode
}) {
  const [open, setOpen]           = useState(false)
  const [form, setForm]           = useState<FormData>(EMPTY)
  const [screenshot, setScreenshot] = useState<string | null>(null)

  const set = <K extends keyof FormData>(k: K) => (v: FormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  function handleClose(o: boolean) {
    setOpen(o)
    if (!o) { setForm(EMPTY); setScreenshot(null) }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const rr   = parseFloat(form.rrPlanned)
    const risk = parseFloat(form.riskPct) || 1
    let pnlR: number | undefined
    if (!isNaN(rr)) {
      pnlR = form.result === 'Win' ? rr * risk : form.result === 'Loss' ? -risk : 0
    }
    onAdd({
      date:       form.date,
      time:       form.time || undefined,
      pair:       form.pair,
      direction:  form.direction,
      timeframe:  form.timeframe,
      session:    form.session,
      entry:      parseFloat(form.entry)     || undefined,
      sl:         parseFloat(form.sl)        || undefined,
      tp:         parseFloat(form.tp)        || undefined,
      riskPct:    parseFloat(form.riskPct)   || 1,
      rrPlanned:  parseFloat(form.rrPlanned) || undefined,
      pnlR,
      result:     form.result,
      notes:      form.notes || undefined,
      screenshot: screenshot ?? undefined,
    })
    setForm(EMPTY)
    setScreenshot(null)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        />
        <Dialog.Content
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full outline-none"
          style={{
            maxWidth: '540px', maxHeight: '92vh', overflowY: 'auto',
            background: 'var(--raised)', border: '1px solid var(--line)',
            borderRadius: '16px', padding: '24px',
            boxShadow: '0 32px 100px rgba(0,0,0,0.7)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-[14px] font-semibold" style={{ color: 'var(--t1)', letterSpacing: '-0.02em' }}>
              Log Trade
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="outline-none cursor-pointer" style={{ color: 'var(--t4)', background: 'none', border: 'none' }}>
                <X size={15} />
              </button>
            </Dialog.Close>
          </div>

          {/* Screenshot attach */}
          <div className="mb-5">
            <ScreenshotZone value={screenshot} onChange={setScreenshot} />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Row — Date / Pair */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input type="date" value={form.date} onChange={set('date')} />
              </Field>
              <Field label="Pair">
                <Select value={form.pair} onChange={set('pair')} options={PAIRS} />
              </Field>
            </div>

            {/* Direction */}
            <Field label="Direction">
              <ToggleGroup<TradeDirection>
                value={form.direction} onChange={set('direction')}
                options={['Long', 'Short']}
                colors={{ Long: 'var(--sage)', Short: 'var(--coral)' }}
              />
            </Field>

            {/* Entry / SL / TP */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Entry">
                <Input type="number" value={form.entry} onChange={set('entry')} placeholder="0.0000" />
              </Field>
              <Field label="Stop Loss">
                <Input type="number" value={form.sl} onChange={set('sl')} placeholder="0.0000" />
              </Field>
              <Field label="Take Profit">
                <Input type="number" value={form.tp} onChange={set('tp')} placeholder="0.0000" />
              </Field>
            </div>

            {/* Risk / RR / TF / Session */}
            <div className="grid grid-cols-4 gap-3">
              <Field label="Risk %">
                <Input type="number" value={form.riskPct} onChange={set('riskPct')} placeholder="1" />
              </Field>
              <Field label="RR">
                <Input type="number" value={form.rrPlanned} onChange={set('rrPlanned')} placeholder="2" />
              </Field>
              <Field label="Timeframe">
                <Select value={form.timeframe} onChange={v => set('timeframe')(v as Timeframe)} options={TIMEFRAMES} />
              </Field>
              <Field label="Session">
                <Select value={form.session} onChange={v => set('session')(v as Session)} options={SESSIONS} />
              </Field>
            </div>

            {/* Result */}
            <Field label="Result">
              <ToggleGroup<TradeResult>
                value={form.result} onChange={set('result')}
                options={['Win', 'Loss', 'BE']}
                colors={{ Win: 'var(--sage)', Loss: 'var(--coral)', BE: 'var(--taupe)' }}
              />
            </Field>

            {/* Notes */}
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={e => set('notes')(e.target.value)}
                placeholder="What did you see? What went right or wrong?"
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--t3)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--line)')}
              />
            </Field>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer outline-none transition-all"
              style={{ background: 'var(--t1)', color: 'var(--base)', border: 'none' }}
            >
              Log Trade →
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
