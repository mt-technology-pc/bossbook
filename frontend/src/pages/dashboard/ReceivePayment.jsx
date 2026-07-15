import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, AlertCircle, HandCoins } from 'lucide-react'
import { useReceivePayment } from '../../hooks/useReceivePayment'
import { useCustomers } from '../../hooks/useCustomers'
import { useCustomerBalances } from '../../hooks/useCustomerBalances'
import { useAccounts } from '../../hooks/useAccounts'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReceivePayment() {
  const navigate = useNavigate()
  const { receivePayment } = useReceivePayment()
  const { customers, addCustomer } = useCustomers()
  const { balanceFor, refetch: refetchBalances } = useCustomerBalances()
  const { accounts, addAccount, refetch: refetchAccounts } = useAccounts()

  const [customerId, setCustomerId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const balance = customerId ? balanceFor(customerId) : 0

  useEffect(() => {
    if (customerId && balance > 0) setAmount(String(balance))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: (() => {
      const b = balanceFor(c.id)
      return b > 0 ? `${formatCurrency(b)} owed` : 'Settled'
    })(),
  }))

  const accountOptions = accounts.map((a) => ({
    id: a.account_id,
    label: a.name,
    sublabel: `${a.type === 'bank' ? 'Bank' : 'Cash'} · ${formatCurrency(a.balance)}`,
  }))

  const handleCreateCustomer = async (name) => {
    const { data, error: createError } = await addCustomer({ name })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  const handleCreateAccount = async (name) => {
    const { data, error: createError } = await addAccount({ name, type: 'cash', openingBalance: 0 })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  const resetForm = () => {
    setCustomerId('')
    setAccountId('')
    setAmount('')
    setPaymentDate(todayISO())
    setNote('')
    setError(null)
  }

  const submit = async ({ andNew }) => {
    if (!customerId) {
      setError('Select a customer.')
      return
    }
    if (!accountId) {
      setError('Choose which account this payment is deposited to.')
      return
    }
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }

    setError(null)
    setLoading(true)

    const { error: submitError } = await receivePayment({
      customerId,
      accountId,
      amount: value,
      note: note.trim() || null,
      paymentDate: paymentDate || null,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchBalances()
    refetchAccounts()

    if (andNew) resetForm()
    else navigate('/dashboard/sales')
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100 dark:bg-dark-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
            <HandCoins size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
            Receive payment
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/sales')}
          aria-label="Cancel"
          className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 dark:hover:bg-dark-700 dark:hover:text-cream-200"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full max-w-sm">
              <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Customer *</span>
              <div className="mt-1.5">
                <SearchSelect
                  value={customerId}
                  onChange={setCustomerId}
                  options={customerOptions}
                  placeholder="Select a customer"
                  createLabel="Add new"
                  onCreate={handleCreateCustomer}
                />
              </div>
            </div>

            {customerId && (
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Current balance
                </p>
                <p className="font-heading text-3xl font-semibold text-ink-900 dark:text-cream-50">
                  {formatCurrency(balance)}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Amount received *</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Payment date</span>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
              />
            </label>
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Deposit to *</span>
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
          </div>

          <label className="mt-6 block">
            <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Memo</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional"
              className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
            />
          </label>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-400/10 bg-cream-50 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/sales')}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled={loading} onClick={() => submit({ andNew: true })}>
            {loading ? 'Saving…' : 'Save and new'}
          </Button>
          <Button variant="primary" disabled={loading} onClick={() => submit({ andNew: false })}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </footer>
    </div>
  )
}
