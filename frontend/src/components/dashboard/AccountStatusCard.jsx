import { ShieldCheck, Clock, CalendarClock } from 'lucide-react'

const TRIAL_DAYS = 14

function daysSince(dateStr) {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

// Compact account-status block for the navbar's profile dropdown — trial
// countdown, member-since, and last sign-in, without a standalone card
// wrapper since it now lives inside DashboardLayout's existing menu.
export default function AccountStatusCard({ user }) {
  const elapsed = daysSince(user?.created_at)
  const daysLeft = Math.max(TRIAL_DAYS - elapsed, 0)

  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
          <Clock size={13} className="text-clay-600" />
          {daysLeft > 0 ? `${daysLeft} days left on trial` : 'Trial ended'}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-clay-500/10 px-2 py-0.5 text-[10px] font-semibold text-clay-600">
          <ShieldCheck size={10} /> Owner
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full bg-clay-500 transition-all duration-700"
          style={{ width: `${(Math.min(elapsed, TRIAL_DAYS) / TRIAL_DAYS) * 100}%` }}
        />
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-ink-400">
            <CalendarClock size={12} /> Member since
          </span>
          <span className="font-medium text-ink-700">
            {formatDate(user?.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-ink-400">
            <Clock size={12} /> Last sign-in
          </span>
          <span className="font-medium text-ink-700">
            {formatDate(user?.last_sign_in_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
