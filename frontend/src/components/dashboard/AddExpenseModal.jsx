import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import SearchSelect from '../ui/SearchSelect'
import { useAccounts } from '../../hooks/useAccounts'
import { formatCurrency } from '../../lib/currency'

const commonCategories = [
  'Rent', 'Utilities', 'Salaries & Wages', 'Marketing', 'Office Supplies',
  'Transport', 'Bank Fees', 'Professional Fees', 'Repairs & Maintenance', 'Other',
]

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function AddExpenseModal({ open, onClose, onSubmit }) {
  const { accounts, addAccount, refetch: refetchAccounts } = useAccounts()
  const [accountId, setAccountId] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(todayISO())
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
    setCategory('')
    setDescription('')
    setAmount('')
    setExpenseDate(todayISO())
    setError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!accountId) {
      setError('Choose which account this expense is paid from.')
      return
    }
    if (!category.trim()) {
      setError('Enter a category.')
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
      accountId,
      category: category.trim(),
      description: description.trim() || null,
      amount: value,
      expenseDate,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchAccounts()
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Record an expense"
      subtitle="Money paid out for rent, utilities, salaries and the like — deducted from an account right away."
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Category *</span>
          <input
            list="expense-categories"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Rent"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
          <datalist id="expense-categories">
            {commonCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-medium text-ink-500">Amount *</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink-500">Date</span>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-500">Paid from *</span>
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
          <span className="text-xs font-medium text-ink-500">Description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : 'Record expense'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
