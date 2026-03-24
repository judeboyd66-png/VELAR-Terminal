import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { NavWrapper } from './NavWrapper'

export const metadata: Metadata = {
  title: 'VELAR — Macro Research Terminal',
  description: 'Premium macro research terminal. Real-time data, economic calendar, and market context for traders who read the chart — not the chatroom.',
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
