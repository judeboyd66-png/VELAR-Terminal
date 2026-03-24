import { AuthGuard } from '@/components/shell/AuthGuard'
import { CotTable } from '@/components/cot/CotTable'

export default function CotPage() {
  return (
    <AuthGuard>
      <div className="pt-[64px] min-h-screen" style={{ background: 'var(--base)' }}>
        <CotTable />
      </div>
    </AuthGuard>
  )
}
