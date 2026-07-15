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

export default function AccountStatusCard({ user }) {
  const elapsed = daysSince(user?.created_at)
  const daysLeft = Math.max(TRIAL_DAYS - elapsed, 0)

  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-400/15 bg-cream-50 p-6 dark:border-cream-100/10 dark:bg-dark-800">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          Account status
        </p>
        <span className="flex items-center gap-1 rounded-full bg-clay-500/10 px-2.5 py-1 text-[11px] font-semibold text-clay-600 dark:text-clay-400">
          <ShieldCheck size={12} /> Owner
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600 dark:text-clay-400">
          <Clock size={19} />
        </span>
        <div>
          <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">
            {daysLeft > 0 ? `${daysLeft} days left` : 'Trial ended'}
          </p>
          <p className="text-xs text-ink-400">on your free trial</p>
        </div>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream-200 dark:bg-dark-700">
        <div
          className="h-full rounded-full bg-clay-500 transition-all duration-700"
          style={{ width: `${(Math.min(elapsed, TRIAL_DAYS) / TRIAL_DAYS) * 100}%` }}
        />
      </div>

      <div className="mt-5 space-y-3 border-t border-ink-400/10 pt-4 text-sm dark:border-cream-100/10">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-ink-400">
            <CalendarClock size={13} /> Member since
          </span>
          <span className="font-medium text-ink-700 dark:text-cream-200">
            {formatDate(user?.created_at)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-ink-400">
            <Clock size={13} /> Last sign-in
          </span>
          <span className="font-medium text-ink-700 dark:text-cream-200">
            {formatDate(user?.last_sign_in_at)}
          </span>
        </div>
      </div>
    </div>
  )
}
