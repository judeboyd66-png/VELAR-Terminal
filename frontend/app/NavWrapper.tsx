'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/components/shell/TopNav'

// Only hide on auth forms — everywhere else (landing, pricing, dashboard) gets the nav
const HIDE_NAV = ['/signin', '/signup']

export function NavWrapper() {
  const pathname = usePathname()
  if (HIDE_NAV.includes(pathname)) return null
  return <TopNav />
}
