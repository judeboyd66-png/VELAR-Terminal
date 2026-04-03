'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { useAuth } from '@/app/providers'
import { ThemeSwitcher } from './ThemeSwitcher'
import { VelarMark } from '@/components/ui/VelarMark'
import { NavDock } from './NavDock'

export function TopNav() {
  const router = useRouter()
  const { user } = useAuth()

  async function handleSignOut() {
    await auth.signOut()
    router.push('/')
  }
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b px-4 py-3 md:grid md:items-center md:h-[64px] md:px-8 md:py-0"
      style={{
        gridTemplateColumns: '1fr auto 1fr',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(32px) saturate(200%)',
        borderColor: 'var(--line)',
      }}
    >
      <div className="flex items-center justify-between gap-3 md:contents">
        {/* Left — Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-3.5 shrink-0 no-underline">
            <VelarMark width={34} color="var(--t1)" />
            <span className="text-[13px] md:text-[15px] font-bold tracking-[0.24em] md:tracking-[0.3em] uppercase" style={{ color: 'var(--t1)' }}>
              Velar
            </span>
          </Link>
          <div className="hidden md:block w-px h-6 mx-3 shrink-0" style={{ background: 'var(--line)' }} />
        </div>

        {/* Center — Section dock */}
        <div className="hidden md:flex justify-center">
          <NavDock />
        </div>

        {/* Right — Controls */}
        <div className="flex items-center gap-2 md:gap-3 justify-end min-w-0">

          {/* Search */}
          <div
            className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-md text-[12px] cursor-pointer"
            style={{
              background: 'var(--control-bg)',
              border: '1px solid var(--line)',
              color: 'var(--t4)',
              minWidth: '130px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
              <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Search</span>
            <kbd
              className="ml-auto text-[11px] px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--t4)' }}
            >
              ⌘K
            </kbd>
          </div>

          <ThemeSwitcher />

          <span className="hidden lg:block text-[12px] tabular-nums" style={{ color: 'var(--t4)' }} suppressHydrationWarning>
            {new Date().getHours().toString().padStart(2, '0')}:
            {new Date().getMinutes().toString().padStart(2, '0')} ET
          </span>

          <div className="hidden md:block w-px h-5" style={{ background: 'var(--line)' }} />

          {user ? (
            <>
              <span className="hidden lg:block text-[11px] max-w-[120px] truncate" style={{ color: 'var(--t3)' }}>
                {user.user_metadata?.name || user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="hidden md:block text-[12px] transition-colors outline-none cursor-pointer"
                style={{ color: 'var(--t4)', background: 'transparent', border: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/signin"
              className="hidden md:block text-[12px] transition-colors no-underline"
              style={{ color: 'var(--t3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      <div className="mt-3 md:hidden">
        <NavDock />
      </div>
    </nav>
  )
}
