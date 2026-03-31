'use client'

import { useState } from 'react'
import { OverviewLeft } from '@/components/home/OverviewLeft'
import { SidePanel }    from '@/components/home/SidePanel'
import { AuthGuard }    from '@/components/shell/AuthGuard'

export default function DashboardPage() {
  const [activeTicker, setActiveTicker] = useState('SPY')

  return (
    <AuthGuard>
      <div className="flex pt-[64px] min-h-screen" style={{ background: 'var(--base)' }}>

        {/* ── Left: systems + macro + chart ── */}
        <div
          className="flex-1 px-8 py-6 min-w-0 border-r overflow-hidden"
          style={{ borderColor: 'var(--line)' }}
        >
          <OverviewLeft
            activeTicker={activeTicker}
            onTickerSelect={setActiveTicker}
          />
        </div>

        {/* ── Right: markets + events + news ── */}
        <SidePanel
          activeTicker={activeTicker}
          onTickerSelect={setActiveTicker}
        />

      </div>
    </AuthGuard>
  )
}
