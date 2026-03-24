import { AuthGuard } from '@/components/shell/AuthGuard'
import { CalendarView } from '@/components/calendar/CalendarView'

export const metadata = { title: 'Calendar — Velar' }

export default function CalendarPage() {
  return (
    <AuthGuard>
      <CalendarView />
    </AuthGuard>
  )
}
