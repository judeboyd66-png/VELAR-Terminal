'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type NewsArticle } from '@/lib/api'
import { motion } from 'framer-motion'

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

const FALLBACK: NewsArticle[] = [
  { title: 'Fed signals extended pause as core inflation re-accelerates toward 3.2%', source: 'Reuters', tag: 'Fed / Rates', ts: Date.now()/1000 - 7200, published: '', summary: '', url: '#' },
  { title: 'OPEC+ extends production cuts through Q3 as demand outlook weakens', source: 'Financial Times', tag: 'Oil / Energy', ts: Date.now()/1000 - 14400, published: '', summary: '', url: '#' },
  { title: 'BOJ hike speculation grows — JPY surges on yield differential narrowing', source: 'Bloomberg', tag: 'FX / Japan', ts: Date.now()/1000 - 3600, published: '', summary: '', url: '#' },
  { title: 'Jobless claims tick to 234K — fourth consecutive weekly increase', source: 'CNBC', tag: 'Labor', ts: Date.now()/1000 - 21600, published: '', summary: '', url: '#' },
  { title: 'Private credit spreads widen as leveraged loan market shows first stress signs', source: 'WSJ', tag: 'Credit', ts: Date.now()/1000 - 28800, published: '', summary: '', url: '#' },
  { title: 'Dollar weakens as traders price in earlier Fed pivot amid labor softening', source: 'Reuters', tag: 'Fed / Rates', ts: Date.now()/1000 - 32400, published: '', summary: '', url: '#' },
]

function NewsRow({ article, index, featured }: { article: NewsArticle; index: number; featured?: boolean }) {
  return (
    <motion.a
      href={article.url || '#'}
      target={article.url && article.url !== '#' ? '_blank' : undefined}
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.055, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="group flex items-start gap-8 py-6 border-b no-underline block"
      style={{ borderColor: 'var(--line2)' }}
    >
      {/* Tag */}
      <div className="shrink-0 w-[96px] pt-0.5">
        <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: 'var(--taupe)' }}>
          {article.tag}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className="font-medium leading-[1.5] tracking-[-0.01em] mb-2 transition-colors duration-200"
          style={{
            fontSize: featured ? '16px' : '14px',
            color: 'var(--t1)',
          }}
        >
          {article.title}
        </div>
        <div className="text-[11px]" style={{ color: 'var(--t4)' }}>
          {article.source}
          {article.ts ? ` · ${timeAgo(article.ts)}` : ''}
        </div>
      </div>

      {/* Arrow */}
      <div
        className="shrink-0 text-[13px] pt-0.5 transition-all duration-200 opacity-0 group-hover:opacity-100"
        style={{ color: 'var(--t3)' }}
      >
        ↗
      </div>
    </motion.a>
  )
}

export function NewsFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['news-feed'],
    queryFn: () => api.news.feed(14).then(r => r.data),
    staleTime: 15 * 60 * 1000,
    retry: 1,
  })

  const articles = data && data.length > 0 ? data : FALLBACK

  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-2 pb-5 border-b" style={{ borderColor: 'var(--line)' }}>
        <span className="section-label">Latest</span>
        <span
          className="text-[11px] cursor-pointer transition-colors"
          style={{ color: 'var(--t4)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
        >
          View all →
        </span>
      </div>

      {isLoading ? (
        <div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex gap-8 py-6 border-b" style={{ borderColor: 'var(--line2)' }}>
              <div className="w-24 h-2.5 shimmer rounded shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <div className="h-4 shimmer rounded" />
                <div className="h-3 shimmer rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          {articles.map((a, i) => (
            <NewsRow key={i} article={a} index={i} featured={i === 0} />
          ))}
        </div>
      )}
    </div>
  )
}
