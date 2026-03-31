import { OverviewLeft } from '@/components/home/OverviewLeft'
import { SidePanel }    from '@/components/home/SidePanel'
import { AuthGuard }    from '@/components/shell/AuthGuard'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="flex pt-[64px] min-h-screen" style={{ background: 'var(--base)' }}>

        {/* ── Left: systems + context + agenda + news + macro ── */}
        <div
          className="flex-1 px-8 py-6 min-w-0 border-r overflow-hidden"
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
