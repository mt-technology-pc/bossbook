import { motion } from 'framer-motion'

const SIZE = 64
const STROKE = 6
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function RadialStat({ icon: Icon, label, value, target, caption }) {
  const pct = target ? Math.min(value / target, 1) : 0

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800">
      <div className="relative h-16 w-16 shrink-0">
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-cream-200 dark:stroke-dark-600"
          />
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            className="stroke-clay-500"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - pct) }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-clay-600 dark:text-clay-400">
          <Icon size={18} />
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50">
          {value}
        </p>
        <p className="text-xs font-medium text-ink-500 dark:text-cream-400">{label}</p>
        {caption && <p className="mt-0.5 text-[11px] text-ink-400">{caption}</p>}
      </div>
    </div>
  )
}
