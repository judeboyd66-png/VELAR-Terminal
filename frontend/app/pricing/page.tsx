'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const FEATURES = [
  'Live market ticker (10 symbols)',
  'Macro dashboard — FRED live data',
  'Economic calendar',
  'Curated news feed',
  'COT signals',
  'Trade journal',
]

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '$15',
    period: '/mo',
    note: 'Billed monthly',
    badge: null,
    featured: false,
    cta: 'Get Access',
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '$150',
    period: '/yr',
    note: '$12.50 per month',
    badge: 'Save 17%',
    featured: true,
    cta: 'Get Access',
  },
  {
    id: 'lifetime',
    label: 'Lifetime',
    price: '$750',
    period: '',
    note: 'One-time · never pay again',
    badge: 'Best Value',
    featured: false,
    cta: 'Get Lifetime',
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen pt-[64px]" style={{ background: 'var(--base)' }}>

      {/* Header */}
      <div className="pt-24 pb-16 text-center px-8">
        <motion.div
          className="section-label mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          Pricing
        </motion.div>
        <motion.h1
          className="font-bold mb-4"
          style={{ fontSize: 'clamp(36px, 4vw, 58px)', letterSpacing: '-0.04em', color: 'var(--t1)', lineHeight: 1.05 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.06 }}
        >
          Simple pricing.
        </motion.h1>
        <motion.p
          style={{ fontSize: '14px', color: 'var(--t3)', lineHeight: 1.65 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
        >
          Full access to every feature. One flat rate.
        </motion.p>
      </div>

      {/* Cards */}
      <div className="max-w-3xl mx-auto px-8 pb-32">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 border rounded-xl overflow-hidden"
          style={{ borderColor: 'var(--line)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.16 }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col p-8 border-r last:border-r-0"
              style={{
                borderColor: 'var(--line)',
                background: plan.featured ? 'rgba(255,255,255,0.025)' : 'transparent',
              }}
            >
              {/* Label + discount badge */}
              <div className="flex items-center gap-2.5 mb-8">
                <span className="section-label">{plan.label}</span>
                {plan.badge && (
                  <span
                    className="text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(138,170,142,0.12)',
                      color: 'var(--sage)',
                      border: '1px solid rgba(138,170,142,0.2)',
                    }}
                  >
                    {plan.badge}
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="mb-1.5">
                <span
                  className="font-bold tabular-nums"
                  style={{ fontSize: '44px', letterSpacing: '-0.04em', color: 'var(--t1)', lineHeight: 1 }}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-[14px] ml-1" style={{ color: 'var(--t3)' }}>
                    {plan.period}
                  </span>
                )}
              </div>
              <p className="text-[11px] mb-9" style={{ color: 'var(--t4)' }}>
                {plan.note}
              </p>

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-10">
                {FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[12px]" style={{ color: 'var(--t2)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 shrink-0">
                      <path d="M2 6L4.5 8.5L10 3" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/signup"
                className="no-underline flex items-center justify-center py-2.5 rounded-md text-[12.5px] font-semibold transition-opacity"
                style={{
                  background: plan.featured ? 'var(--t1)' : 'rgba(255,255,255,0.06)',
                  color: plan.featured ? 'var(--base)' : 'var(--t1)',
                  border: plan.featured ? 'none' : '1px solid var(--line)',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {plan.cta} →
              </Link>
            </div>
          ))}
        </motion.div>

        <motion.p
          className="text-center mt-8 text-[11px]"
          style={{ color: 'var(--t4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Already have access?{' '}
          <Link
            href="/signin"
            className="no-underline transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
          >
            Sign in
          </Link>
        </motion.p>
      </div>

    </div>
  )
}
