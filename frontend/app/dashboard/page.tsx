import { LiveTicker }  from '@/components/home/LiveTicker'
import { HeroStrip }   from '@/components/home/HeroStrip'
import { NewsFeed }    from '@/components/home/NewsFeed'
import { SidePanel }   from '@/components/home/SidePanel'
import { AuthGuard }   from '@/components/shell/AuthGuard'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="flex flex-col pt-[64px]">

        <LiveTicker />
        <HeroStrip />

        <div className="flex min-h-screen" style={{ background: 'var(--base)' }}>
          <div className="flex-1 px-14 py-12 min-w-0">
            <NewsFeed />
          </div>
          <SidePanel />
        </div>

      </div>
    </AuthGuard>
  )
}
