import { AuthGuard } from '@/components/shell/AuthGuard'
import { CotTable } from '@/components/cot/CotTable'

export default function CotPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ paddingTop: 'var(--nav-h)', background: 'var(--base)' }}>
        <CotTable />
      </div>
    </AuthGuard>
  )
}
