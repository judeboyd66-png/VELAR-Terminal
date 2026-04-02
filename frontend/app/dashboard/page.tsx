import { OverviewLeft } from '@/components/home/OverviewLeft'
import { SidePanel }    from '@/components/home/SidePanel'
import { AuthGuard }    from '@/components/shell/AuthGuard'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="flex flex-col lg:flex-row min-h-screen" style={{ paddingTop: 'var(--nav-h)', background: 'var(--base)' }}>

        {/* ── Left: systems + context + agenda + news + macro ── */}
        <div
          className="flex-1 px-4 py-4 md:px-8 md:py-6 min-w-0 lg:border-r overflow-hidden"
          style={{ borderColor: 'var(--line)' }}
        >
          <OverviewLeft />
        </div>

        {/* ── Right: markets watchlist with sparklines ── */}
        <SidePanel />

      </div>
    </AuthGuard>
  )
}
