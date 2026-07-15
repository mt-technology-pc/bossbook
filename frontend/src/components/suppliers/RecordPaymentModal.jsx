import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import SearchSelect from '../ui/SearchSelect'
import { useAccounts } from '../../hooks/useAccounts'
import { formatCurrency } from '../../lib/currency'

export default function RecordPaymentModal({ open, onClose, onSubmit, supplier }) {
  const { accounts, addAccount, refetch: refetchAccounts } = useAccounts()
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const accountOptions = accounts.map((a) => ({
    id: a.account_id,
    label: a.name,
    sublabel: `${a.type === 'bank' ? 'Bank' : 'Cash'} · ${formatCurrency(a.balance)}`,
  }))

  const handleCreateAccount = async (name) => {
    const { data, error: createError } = await addAccount({ name, type: 'cash', openingBalance: 0 })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  const close = () => {
    setAccountId('')
    setAmount('')
    setNote('')
    setError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!accountId) {
      setError('Choose which account this payment is paid from.')
      return
    }
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    setError(null)
    setLoading(true)

    const { error: submitError } = await onSubmit({
      supplierId: supplier.supplier_id,
      accountId,
      amount: value,
      note: note.trim() || null,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchAccounts()
    close()
  }

  if (!supplier) return null

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Pay ${supplier.name}`}
      subtitle={`Current balance owed: ${formatCurrency(supplier.balance)}`}
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Amount paid *</span>
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
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Pay from *</span>
          <div className="mt-1.5">
            <SearchSelect
              value={accountId}
              onChange={setAccountId}
              options={accountOptions}
              placeholder="Choose an account"
              createLabel="Add new cash account"
              onCreate={handleCreateAccount}
            />
          </div>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Note</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional — e.g. bank transfer, cash"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
          />
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : 'Pay bill'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
