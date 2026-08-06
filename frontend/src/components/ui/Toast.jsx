import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, X } from 'lucide-react'

// Bottom-center confirmation banner — for actions that stay on the current
// page (so a navigate-away wouldn't already make the outcome obvious) and
// still want to confirm the action landed. Auto-dismisses on its own but
// stays closable, in case the user wants it gone sooner.
export default function Toast({ open, message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-ink-400/15 bg-ink-900 px-4 py-3 text-sm font-medium text-cream-50 shadow-2xl print:hidden"
        >
          <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
          {message}
          <button
            onClick={onClose}
            aria-label="Dismiss"
            className="ml-1 shrink-0 rounded-full p-0.5 text-cream-50/60 hover:text-cream-50"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
