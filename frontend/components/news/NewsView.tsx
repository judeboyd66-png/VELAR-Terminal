'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type NewsArticle, type EarningsEntry } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Macro', 'Markets', 'Commodities', 'Conflicts', 'AI', 'Crypto', 'Earnings'] as const
type Category = typeof CATEGORIES[number]

const IMPACT_FILTERS = ['Any', 'High', 'Medium', 'Low'] as const
type ImpactFilter = typeof IMPACT_FILTERS[number]

const CATEGORY_TAGS: Record<string, string[]> = {
  Macro:       ['Fed / Rates', 'Labor', 'Inflation', 'Global Macro', 'Credit / Rates'],
  Markets:     ['Equities', 'Markets', 'FX / Japan'],
  Commodities: ['Commodities', 'Oil / Energy'],
  Conflicts:   ['Conflicts'],
  AI:          ['AI'],
  Crypto:      ['Crypto'],
  Earnings:    ['Earnings'],
}

const TAG_COLOR: Record<string, string> = {
  'Fed / Rates':    '#8aaa8e',
  'Labor':          '#8aaa8e',
  'Inflation':      '#c88878',
  'Credit / Rates': '#8aaa8e',
  'Global Macro':   '#8a7a68',
  'FX / Japan':     '#c49858',
  'Oil / Energy':   '#c49858',
  'Commodities':    '#c49858',
  'Equities':       '#7a9cc4',
  'Markets':        '#9098a0',
  'Conflicts':      '#c88878',
  'AI':             '#7a9cc4',
  'Crypto':         '#9e8ac4',
  'Earnings':       '#c4a87a',
}

const IMPACT_COLOR = { high: '#c88878', medium: '#c49858', low: '#444448' }
const IMPACT_BG    = { high: 'rgba(200,136,120,0.14)', medium: 'rgba(196,152,88,0.14)', low: 'rgba(68,68,72,0.4)' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() / 1000 - ts
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function fmtNum(n: number | null, decimals = 2, prefix = ''): string {
  if (n == null) return '—'
  return `${prefix}${n.toFixed(decimals)}`
}

function fmtBig(n: number | null): string {
  if (n == null) return '—'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`
  return `$${n.toFixed(0)}`
}

// ─── FilterDock ────────────────────────────────────────────────────────────────

function FilterDock({ activeCategory, setCategory, activeImpact, setImpact }: {
  activeCategory: Category
  setCategory: (c: Category) => void
  activeImpact: ImpactFilter
  setImpact: (i: ImpactFilter) => void
}) {
  return (
    <div className="sticky z-10" style={{ top: 'var(--nav-h)', background: 'var(--base)', borderBottom: '1px solid var(--line)' }}>
      {/* Category row */}
      <div className="flex items-center gap-1.5 px-6 overflow-x-auto" style={{ height: '44px', scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="shrink-0 px-3 h-7 rounded-full text-[11px] font-semibold tracking-[0.08em] uppercase transition-all duration-150 cursor-pointer outline-none"
            style={{
              background: cat === activeCategory ? 'var(--item-active)' : 'transparent',
              color: cat === activeCategory ? 'var(--t1)' : 'var(--t3)',
              border: cat === activeCategory ? '1px solid var(--line)' : '1px solid transparent',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Impact row — hidden on Earnings tab */}
      {activeCategory !== 'Earnings' && (
        <div className="flex items-center gap-3 px-6" style={{ height: '34px', borderTop: '1px solid var(--line2)' }}>
          <span className="text-[10px] font-semibold tracking-[0.1em] uppercase shrink-0" style={{ color: 'var(--t4)' }}>Impact</span>
          <div className="flex items-center gap-1.5">
            {IMPACT_FILTERS.map(imp => {
              const isActive = imp === activeImpact
              const col = imp === 'High' ? IMPACT_COLOR.high : imp === 'Medium' ? IMPACT_COLOR.medium : imp === 'Low' ? IMPACT_COLOR.low : 'var(--t3)'
              return (
                <button
                  key={imp}
                  onClick={() => setImpact(imp)}
                  className="flex items-center gap-1.5 px-2.5 h-5 rounded-full text-[10px] font-medium transition-all duration-150 cursor-pointer outline-none"
                  style={{
                    background: isActive ? 'var(--item-active)' : 'transparent',
                    color: isActive ? 'var(--t1)' : 'var(--t4)',
                    border: isActive ? '1px solid var(--line)' : '1px solid transparent',
                  }}
                >
                  {imp !== 'Any' && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col }} />}
                  {imp}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NewsCard ──────────────────────────────────────────────────────────────────

function NewsCard({ article, index }: { article: NewsArticle; index: number }) {
  const impact  = article.impact ?? 'low'
  const tagCol  = TAG_COLOR[article.tag] || 'var(--t3)'
  const impCol  = IMPACT_COLOR[impact]
  const impBg   = IMPACT_BG[impact]

  return (
    <motion.a
      href={article.url && article.url !== '#' ? article.url : undefined}
      target={article.url && article.url !== '#' ? '_blank' : undefined}
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.35), duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col gap-2.5 p-4 rounded-lg no-underline transition-all duration-200 cursor-pointer"
      style={{
        background: 'var(--raised)',
        border: `1px solid ${impact === 'high' ? 'rgba(200,136,120,0.22)' : 'var(--line2)'}`,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--float)'
        el.style.borderColor = impact === 'high' ? 'rgba(200,136,120,0.38)' : 'var(--line)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--raised)'
        el.style.borderColor = impact === 'high' ? 'rgba(200,136,120,0.22)' : 'var(--line2)'
      }}
    >
      {/* Row 1: tag + impact pill + time */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Tag */}
          <span className="shrink-0 text-[9px] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded"
            style={{ color: tagCol, background: `${tagCol}18`, border: `1px solid ${tagCol}28` }}>
            {article.tag}
          </span>
          {/* Impact pill */}
          <span className="shrink-0 text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded"
            style={{ color: impCol, background: impBg, border: `1px solid ${impCol}30` }}>
            {impact.toUpperCase()}
          </span>
          {/* Pinned indicator for important older articles */}
          {article.pinned && (
            <span className="shrink-0 text-[9px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 rounded"
              style={{ color: 'var(--t4)', background: 'var(--raised)', border: '1px solid var(--line)' }}>
              📌
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px]" style={{ color: 'var(--t4)' }}>{article.source}</span>
          {article.ts ? <span className="text-[10px] tabular-nums" style={{ color: 'var(--t4)' }}>{timeAgo(article.ts)}</span> : null}
          <span className="text-[12px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--t3)' }}>↗</span>
        </div>
      </div>

      {/* Title */}
      <div className="font-medium leading-[1.5] tracking-[-0.01em] text-[13px]"
        style={{ color: 'var(--t1)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {article.title}
      </div>

      {/* Summary */}
      {article.summary && (
        <div className="text-[12px] leading-[1.65]"
          style={{ color: 'var(--t3)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {article.summary.replace(/<[^>]*>/g, '')}
        </div>
      )}
    </motion.a>
  )
}

// ─── EarningsTable ────────────────────────────────────────────────────────────

type EarningsSort = 'mcap' | 'surprise' | 'nextDate' | 'lastDate'

function EarningsTable() {
  const [sort, setSort] = useState<EarningsSort>('mcap')
  const [filter, setFilter] = useState<'all' | 'beat' | 'miss' | 'upcoming'>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['earnings-calendar'],
    queryFn: () => api.news.earnings().then(r => r.data),
    staleTime: 4 * 60 * 60 * 1000,
    retry: 1,
  })

  const isPopulating = false

  const rows = useMemo(() => {
    if (!data) return []
    let filtered = [...data]
    if (filter === 'beat')     filtered = filtered.filter(r => (r.surprise ?? 0) > 0)
    if (filter === 'miss')     filtered = filtered.filter(r => (r.surprise ?? 0) < 0)
    if (filter === 'upcoming') filtered = filtered.filter(r => r.nextDate != null)

    filtered.sort((a, b) => {
      if (sort === 'mcap')     return (b.mcap ?? 0) - (a.mcap ?? 0)
      if (sort === 'surprise') return (b.surprise ?? -999) - (a.surprise ?? -999)
      if (sort === 'nextDate') {
        if (!a.nextDate) return 1
        if (!b.nextDate) return -1
        return a.nextDate.localeCompare(b.nextDate)
      }
      if (sort === 'lastDate') {
        if (!a.lastDate) return 1
        if (!b.lastDate) return -1
        return b.lastDate.localeCompare(a.lastDate)
      }
      return 0
    })
    return filtered
  }, [data, sort, filter])

  const thStyle = (s: EarningsSort) => ({
    cursor: 'pointer' as const,
    color: sort === s ? 'var(--t1)' : 'var(--t4)',
    userSelect: 'none' as const,
  })

  if (isLoading) {
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className="w-32 h-5 shimmer rounded-full" />
          <div className="w-24 h-5 shimmer rounded-full" />
          <div className="w-28 h-5 shimmer rounded-full" />
        </div>
        {Array.from({length: 15}).map((_,i) => (
          <div key={i} className="flex gap-4 py-2.5 border-b" style={{ borderColor: 'var(--line2)' }}>
            <div className="w-12 h-3 shimmer rounded" />
            <div className="w-40 h-3 shimmer rounded" />
            <div className="w-16 h-3 shimmer rounded" />
            <div className="w-16 h-3 shimmer rounded" />
            <div className="w-16 h-3 shimmer rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="mt-2">
      {/* Populating indicator */}
      {isPopulating && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-[11px]"
          style={{ background: 'rgba(196,152,88,0.1)', border: '1px solid rgba(196,152,88,0.25)', color: '#c49858' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#c49858' }} />
          Fetching earnings data from Yahoo Finance — companies are shown now, EPS data loads in ~45s
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mb-5">
        {(['all','beat','miss','upcoming'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 h-6 rounded-full text-[10px] font-semibold tracking-[0.08em] uppercase cursor-pointer outline-none transition-all"
            style={{
              background: filter === f ? 'var(--item-active)' : 'transparent',
              color: filter === f ? 'var(--t1)' : 'var(--t4)',
              border: filter === f ? '1px solid var(--line)' : '1px solid transparent',
            }}>
            {f === 'all' ? 'All' : f === 'beat' ? '↑ Beat' : f === 'miss' ? '↓ Miss' : 'Upcoming'}
          </button>
        ))}
        <span className="text-[11px] ml-2" style={{ color: 'var(--t4)' }}>
          {rows.length} companies · refreshes every 2 hours
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {[
                ['Ticker',      null],
                ['Company',     null],
                ['Sector',      null],
                ['Mkt Cap',     'mcap'],
                ['Quarter',     null],
                ['Report Date', 'lastDate'],
                ['EPS Est',     null],
                ['EPS Actual',  null],
                ['Surprise %',  'surprise'],
                ['Next Date',   'nextDate'],
              ].map(([label, key]) => (
                <th key={label as string}
                  onClick={key ? () => setSort(key as EarningsSort) : undefined}
                  className="text-left pb-2.5 pr-4"
                  style={{
                    ...(key ? thStyle(key as EarningsSort) : { color: 'var(--t4)' }),
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.09em',
                    textTransform: 'uppercase', whiteSpace: 'nowrap',
                  }}>
                  {label}{key && sort === key ? ' ↓' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const surpriseColor = r.surprise == null ? 'var(--t3)'
                : r.surprise > 5  ? '#8aaa8e'
                : r.surprise > 0  ? '#9fb89f'
                : r.surprise < -5 ? '#c88878'
                : '#d4a090'

              return (
                <motion.tr key={r.ticker}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.5) }}
                  style={{ borderBottom: '1px solid var(--line2)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--raised)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="py-2.5 pr-4 font-bold tabular-nums" style={{ color: 'var(--t1)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {r.ticker}
                  </td>
                  <td className="py-2.5 pr-4 max-w-[180px] truncate" style={{ color: 'var(--t2)', whiteSpace: 'nowrap' }}>
                    {r.name}
                  </td>
                  <td className="py-2.5 pr-4" style={{ color: 'var(--t4)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                    {r.sector || '—'}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                    {fmtBig(r.mcap)}
                  </td>
                  <td className="py-2.5 pr-4" style={{ color: 'var(--t4)', whiteSpace: 'nowrap', fontSize: '11px' }}>
                    {r.fiscalQ ?? '—'}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                    {r.lastDate ?? '—'}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--t3)', whiteSpace: 'nowrap' }}>
                    {fmtNum(r.epsEst, 2, '$')}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums" style={{ color: 'var(--t2)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {fmtNum(r.epsActual, 2, '$')}
                  </td>
                  <td className="py-2.5 pr-4 tabular-nums font-semibold" style={{ color: surpriseColor, whiteSpace: 'nowrap' }}>
                    {r.surprise != null ? `${r.surprise > 0 ? '+' : ''}${r.surprise}%` : '—'}
                  </td>
                  <td className="py-2.5 tabular-nums" style={{ color: r.nextDate ? 'var(--t2)' : 'var(--t4)', whiteSpace: 'nowrap' }}>
                    {r.nextDate ?? 'TBA'}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Skeleton cards ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-lg" style={{ background: 'var(--raised)', border: '1px solid var(--line2)' }}>
      <div className="flex items-center gap-2">
        <div className="w-14 h-4 shimmer rounded-full" />
        <div className="w-10 h-4 shimmer rounded-full" />
        <div className="flex-1" />
        <div className="w-20 h-3 shimmer rounded" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3.5 shimmer rounded" />
        <div className="h-3.5 shimmer rounded w-4/5" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 shimmer rounded" />
        <div className="h-3 shimmer rounded w-2/3" />
      </div>
    </div>
  )
}

// ─── NewsView (main) ──────────────────────────────────────────────────────────

export function NewsView() {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [activeImpact,   setActiveImpact]   = useState<ImpactFilter>('Any')

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['news-feed-full'],
    queryFn: () => api.news.feed(200).then(r => r.data),
    staleTime: 3 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
    retry: 1,
  })

  const articles = useMemo(() => {
    const raw = data ?? []
    const norm = raw.map(a => ({ ...a, impact: a.impact ?? 'low' }))
    let filtered = activeCategory === 'All'
      ? norm
      : norm.filter(a => (CATEGORY_TAGS[activeCategory] ?? []).includes(a.tag))
    if (activeImpact !== 'Any')
      filtered = filtered.filter(a => a.impact === activeImpact.toLowerCase())
    return filtered
  }, [data, activeCategory, activeImpact])

  const highCount    = useMemo(() => articles.filter(a => a.impact === 'high').length, [articles])
  const updatedLabel = dataUpdatedAt ? `Updated ${timeAgo(dataUpdatedAt / 1000)}` : 'Loading...'

  return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'var(--base)' }}>
      <FilterDock
        activeCategory={activeCategory}
        setCategory={cat => { setActiveCategory(cat); setActiveImpact('Any') }}
        activeImpact={activeImpact}
        setImpact={setActiveImpact}
      />

      <div className="px-6 py-5 max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[16px] font-semibold tracking-[-0.02em] mb-1" style={{ color: 'var(--t1)' }}>
              {activeCategory === 'Earnings' ? 'S&P 100 Earnings Calendar' : 'Market News'}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {highCount > 0 && activeCategory !== 'Earnings' && (
              <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(200,136,120,0.1)', border: '1px solid rgba(200,136,120,0.25)', color: '#c88878' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#c88878' }} />
                {highCount} high impact
              </div>
            )}
            {activeCategory !== 'Earnings' && (
              <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--t3)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#8aaa8e' }} />
                {updatedLabel} · 3 min
              </div>
            )}
          </div>
        </div>

        {/* Earnings tab → dedicated table */}
        {activeCategory === 'Earnings' ? (
          <EarningsTable />
        ) : isLoading ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' }}>
            {Array.from({length: 9}).map((_,i) => <SkeletonCard key={i} />)}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="text-[32px]" style={{ opacity: 0.22 }}>📰</div>
            <div className="text-[13px]" style={{ color: 'var(--t3)' }}>
              No {activeCategory !== 'All' ? activeCategory : activeImpact} articles right now
            </div>
            <button onClick={() => { setActiveCategory('All'); setActiveImpact('Any') }}
              className="text-[11px] px-3 py-1.5 rounded-full cursor-pointer"
              style={{ background: 'var(--raised)', border: '1px solid var(--line)', color: 'var(--t2)' }}>
              Show all news
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`${activeCategory}-${activeImpact}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))' }}
            >
              {articles.map((article, i) => (
                <NewsCard key={`${article.title}-${i}`} article={article} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
