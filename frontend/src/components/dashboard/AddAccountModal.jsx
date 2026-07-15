import { useState } from 'react'
import { Wallet, Landmark, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const types = [
  { value: 'cash', label: 'Cash', icon: Wallet },
  { value: 'bank', label: 'Bank', icon: Landmark },
]

const initialForm = { name: '', type: 'cash', openingBalance: '' }

export default function AddAccountModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setForm(initialForm)
    setError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Give the account a name.')
      return
    }
    setError(null)
    setLoading(true)

    const { error: submitError } = await onSubmit({
      name: form.name.trim(),
      type: form.type,
      openingBalance: Number(form.openingBalance) || 0,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add an account"
      subtitle="Track a cash drawer or bank account so sales and payments can deposit into it."
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Account name *</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Cash drawer, HNB Current Account"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
          />
        </label>

        <div>
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Type</span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {types.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  form.type === t.value
                    ? 'border-clay-500 bg-clay-500/10 text-clay-600 dark:text-clay-400'
                    : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40 dark:border-cream-100/15 dark:text-cream-400'
                }`}
              >
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Opening balance</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.openingBalance}
            onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
            placeholder="0.00"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
          />
          <span className="mt-1 block text-xs text-ink-400">
            What&apos;s already in this account today, if anything.
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding…' : 'Add account'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
