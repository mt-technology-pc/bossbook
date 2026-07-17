import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

const sizes = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
}

export default function Modal({ open, onClose, title, subtitle, size = 'md', children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={`max-h-[90vh] w-full ${sizes[size]} overflow-y-auto rounded-2xl border border-ink-400/15 bg-cream-50 p-6 shadow-2xl`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h2 className="font-heading text-lg font-semibold text-ink-900">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-full p-1.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
