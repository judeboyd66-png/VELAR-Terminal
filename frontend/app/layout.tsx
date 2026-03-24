import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { NavWrapper } from './NavWrapper'

export const metadata: Metadata = {
  title: 'SIGNAL — Macro Research Terminal',
  description: 'Private macro research terminal. Real-time data, economic calendar, and market context.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NavWrapper />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
