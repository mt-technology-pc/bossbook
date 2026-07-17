import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function ComingSoon({ title = 'This section' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-400/25 bg-cream-50 py-24 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
        <Sparkles size={20} />
      </span>
      <h1 className="mt-4 font-heading text-xl font-semibold text-ink-900">
        {title} is on the way
      </h1>
      <p className="mt-1.5 max-w-xs text-sm text-ink-500">
        We&apos;re building this next. Check back soon.
      </p>
    </motion.div>
  )
}
