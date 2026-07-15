import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { formatCurrency } from '../../lib/currency'

export default function AddTransactionModal({ open, onClose, onSubmit, customer, defaultType = 'charge' }) {
  const [type, setType] = useState(defaultType)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setType(defaultType)
    setAmount('')
    setNote('')
    setError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    setError(null)
    setLoading(true)

    const { error: submitError } = await onSubmit({
      customerId: customer.customer_id,
      type,
      amount: value,
      note: note.trim() || null,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    close()
  }

  if (!customer) return null

  return (
    <Modal
      open={open}
      onClose={close}
      title={customer.name}
      subtitle={`Current balance: ${formatCurrency(customer.balance)} ${customer.balance > 0 ? 'owed to you' : ''}`}
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('charge')}
            className={optionClass(type === 'charge')}
          >
            Charge (they owe more)
          </button>
          <button
            type="button"
            onClick={() => setType('payment')}
            className={optionClass(type === 'payment')}
          >
            Payment received
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Amount *</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — what was this for?"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
          />
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function optionClass(active) {
  return `rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
    active
      ? 'border-clay-500 bg-clay-500/10 text-clay-600 dark:text-clay-400'
      : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40 dark:border-cream-100/15 dark:text-cream-400'
  }`
}
