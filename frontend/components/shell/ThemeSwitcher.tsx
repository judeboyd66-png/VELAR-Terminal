'use client'

import * as Popover from '@radix-ui/react-popover'
import { useTheme, THEMES, type ThemeId } from './ThemeProvider'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const active = THEMES.find(t => t.id === theme) ?? THEMES[0]

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all outline-none"
          style={{
            background: 'var(--control-bg)',
            border: '1px solid var(--line)',
            cursor: 'pointer',
          }}
        >
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ background: active.swatch, border: '1px solid var(--line)' }}
          />
          <span className="text-[11px]" style={{ color: 'var(--t3)' }}>{active.label}</span>
          <svg width="7" height="5" viewBox="0 0 8 5" fill="none" style={{ color: 'var(--t4)' }}>
            <path d="M1 1L4 4L7 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="outline-none"
          style={{
            background: 'var(--float)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '6px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            minWidth: '150px',
            zIndex: 200,
          }}
        >
          {THEMES.map(t => {
            const isActive = t.id === theme
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as ThemeId)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-left outline-none transition-all"
                style={{
                  background: isActive ? 'var(--item-active)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{
                    background: t.swatch,
                    border: isActive ? '1.5px solid var(--t3)' : '1px solid var(--line)',
                  }}
                />
                <span className="text-[12px] flex-1" style={{ color: isActive ? 'var(--t1)' : 'var(--t2)' }}>
                  {t.label}
                </span>
                {isActive && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--t3)' }}>
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )
          })}
          <Popover.Arrow style={{ fill: 'var(--float)' }} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
