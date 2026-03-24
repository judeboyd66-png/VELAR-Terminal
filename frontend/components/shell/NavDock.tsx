'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, CalendarDays, BarChart2, FileBarChart2, BookOpen, Newspaper } from 'lucide-react'

const SECTIONS = [
  { href: '/dashboard', label: 'Overview',  Icon: Activity       },
  { href: '/calendar',  label: 'Calendar',  Icon: CalendarDays   },
  { href: '/macro',     label: 'Macro',     Icon: BarChart2      },
  { href: '/cot',       label: 'COT',       Icon: FileBarChart2  },
  { href: '/journal',   label: 'Journal',   Icon: BookOpen       },
  { href: '/news',      label: 'News',      Icon: Newspaper      },
]

export function NavDock() {
  const pathname = usePathname()
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)

  function handleNav(href: string) {
    router.push(href)
  }

  return (
    <div className="flex items-center gap-1">
      {SECTIONS.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
        const isHov = hovered === href

        return (
          <div key={href} className="relative">
            <motion.button
              onClick={() => handleNav(href)}
              onHoverStart={() => setHovered(href)}
              onHoverEnd={() => setHovered(null)}
              whileHover={{ scale: 1.35 }}
              transition={{ type: 'spring', stiffness: 380, damping: 20 }}
              className="flex items-center justify-center w-12 h-12 rounded-xl outline-none cursor-pointer"
              style={{
                background: active ? 'var(--item-active)' : 'transparent',
                border: 'none',
                color: active ? 'var(--t1)' : isHov ? 'var(--t2)' : 'var(--t3)',
              }}
            >
              <Icon size={20} strokeWidth={active ? 1.75 : 1.4} />
            </motion.button>

            {/* Label tooltip below nav */}
            <AnimatePresence>
              {isHov && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.13 }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap pointer-events-none z-40"
                >
                  <div
                    className="px-2 py-1 rounded-md text-[10px] font-medium tracking-[0.07em] uppercase"
                    style={{
                      background: 'var(--float)',
                      border: '1px solid var(--line)',
                      color: 'var(--t2)',
                    }}
                  >
                    {label}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
