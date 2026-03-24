'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { auth } from '@/lib/auth'
import { VelarMark } from '@/components/ui/VelarMark'

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (auth.isAuthenticated()) router.replace('/dashboard')
  }, [router])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!email.trim() || !email.includes('@')) { setError('Please enter a valid email'); return }
    setLoading(true)
    setTimeout(() => {
      auth.signUp(name.trim(), email.trim())
      router.replace('/dashboard')
    }, 700)
  }

  return (
    <div className="h-screen flex items-center justify-center px-6" style={{ background: 'var(--base)' }}>

      {/* Back */}
      <Link
        href="/"
        className="fixed top-6 left-8 text-[12px] no-underline transition-colors"
        style={{ color: 'var(--t4)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
      >
        ← Back
      </Link>

      <motion.div
        className="w-full max-w-[360px]"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12">
          <div className="live-dot" />
          <VelarMark width={20} color="var(--t1)" />
          <span className="text-[11px] font-bold tracking-[0.32em] uppercase" style={{ color: 'var(--t1)' }}>
            Velar
          </span>
        </div>

        {/* Heading */}
        <div className="mb-9">
          <h1
            className="font-bold mb-2.5"
            style={{ fontSize: '28px', letterSpacing: '-0.03em', color: 'var(--t1)', lineHeight: 1.1 }}
          >
            Get access.
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--t3)', lineHeight: 1.55 }}>
            Create your account to access the terminal.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="section-label block mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              className="w-full px-4 py-3 rounded-md text-[13px] outline-none transition-all"
              style={{
                background: 'var(--raised)',
                border: '1px solid var(--line)',
                color: 'var(--t1)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
              onBlur={e =>  (e.currentTarget.style.borderColor = 'var(--line)')}
            />
          </div>

          <div>
            <label className="section-label block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-md text-[13px] outline-none transition-all"
              style={{
                background: 'var(--raised)',
                border: '1px solid var(--line)',
                color: 'var(--t1)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
              onBlur={e =>  (e.currentTarget.style.borderColor = 'var(--line)')}
            />
          </div>

          {error && (
            <p className="text-[12px]" style={{ color: 'var(--coral)' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-md text-[13px] font-semibold transition-all"
            style={{
              background: loading ? 'rgba(240,237,232,0.35)' : 'var(--t1)',
              color: 'var(--base)',
              cursor: loading ? 'default' : 'pointer',
              marginTop: '4px',
            }}
          >
            {loading ? 'Creating account…' : 'Get Access →'}
          </button>
        </form>

        <p className="mt-7 text-[12px]" style={{ color: 'var(--t4)' }}>
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
        </p>
      </motion.div>
    </div>
  )
}
