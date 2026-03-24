'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type ThemeId = 'obsidian' | 'walnut' | 'ash' | 'coffee' | 'parchment' | 'sand'

export const THEMES: { id: ThemeId; label: string; swatch: string; dark: boolean }[] = [
  { id: 'obsidian',  label: 'Obsidian',  swatch: '#0c0c0f', dark: true  },
  { id: 'walnut',    label: 'Walnut',    swatch: '#100d09', dark: true  },
  { id: 'ash',       label: 'Ash',       swatch: '#111111', dark: true  },
  { id: 'coffee',    label: 'Coffee',    swatch: '#2c2824', dark: true  },
  { id: 'parchment', label: 'Parchment', swatch: '#f0e8d4', dark: false },
  { id: 'sand',      label: 'Sand',      swatch: '#e8dfc8', dark: false },
]

const Ctx = createContext<{
  theme: ThemeId
  setTheme: (t: ThemeId) => void
}>({ theme: 'obsidian', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('obsidian')

  useEffect(() => {
    const saved = localStorage.getItem('velar-theme') as ThemeId | null
    if (saved && THEMES.find(t => t.id === saved)) apply(saved)
  }, [])

  function apply(t: ThemeId) {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('velar-theme', t)
  }

  return <Ctx.Provider value={{ theme, setTheme: apply }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
