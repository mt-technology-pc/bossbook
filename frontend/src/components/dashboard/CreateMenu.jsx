import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus, ShoppingBag, Receipt, FileText, Package, Contact, Truck, HandCoins, Wallet,
} from 'lucide-react'

const actions = [
  { label: 'Create invoice', desc: 'Bill a customer on credit', icon: FileText, to: '/dashboard/sales/new-invoice', direct: true },
  { label: 'Create sales receipt', desc: 'Record a cash or bank sale', icon: Receipt, to: '/dashboard/sales/new-receipt', direct: true },
  { label: 'Receive payment', desc: 'Collect against a customer balance', icon: HandCoins, to: '/dashboard/sales/receive-payment', direct: true },
  { label: 'Create purchase', desc: 'Record a supplier bill', icon: ShoppingBag, to: '/dashboard/purchases/new', direct: true },
  { label: 'Pay a bill', desc: 'Pay down a supplier balance', icon: HandCoins, to: '/dashboard/suppliers', plain: true },
  { label: 'Record expense', desc: 'Rent, utilities, salaries and the like', icon: Wallet, to: '/dashboard/expenses' },
  { label: 'Add product', desc: 'Add to your catalog', icon: Package, to: '/dashboard/inventory' },
  { label: 'Add customer', desc: 'Save a new customer', icon: Contact, to: '/dashboard/customers' },
  { label: 'Add supplier', desc: 'Save a new supplier', icon: Truck, to: '/dashboard/suppliers' },
]

export default function CreateMenu({ className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleSelect = (action) => {
    setOpen(false)
    if (action.soon || action.direct || action.plain) navigate(action.to)
    else navigate(action.to, { state: { autoOpen: true } })
  }

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-500 px-3.5 py-2.5 text-sm font-semibold text-cream-50 shadow-md shadow-clay-500/25 transition-colors hover:bg-clay-600"
      >
        <Plus size={16} /> Create new
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-ink-400/15 bg-cream-50 py-1.5 shadow-xl dark:border-cream-100/10 dark:bg-dark-800"
          >
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSelect(action)}
                className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-cream-200 dark:hover:bg-dark-700"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
                  <action.icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-ink-900 dark:text-cream-50">
                      {action.label}
                    </span>
                    {action.soon && (
                      <span className="rounded-full bg-ink-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-ink-400 dark:bg-cream-100/10">
                        Soon
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-ink-400">{action.desc}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
