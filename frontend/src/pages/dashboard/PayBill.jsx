import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, AlertCircle, HandCoins } from 'lucide-react'
import { useSupplierPayments } from '../../hooks/useSupplierPayments'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useSupplierBalances } from '../../hooks/useSupplierBalances'
import { useAccounts } from '../../hooks/useAccounts'
import { useOutstandingPurchases } from '../../hooks/useOutstandingPurchases'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function PayBill() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { payments, payBill, updatePayment } = useSupplierPayments()
  const { suppliers, addSupplier } = useSuppliers()
  const { balanceFor, refetch: refetchBalances } = useSupplierBalances()
  const { accounts, addAccount, refetch: refetchAccounts } = useAccounts()

  const [supplierId, setSupplierId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)

  const { purchases: outstandingPurchases } = useOutstandingPurchases(supplierId)
  const [linkedPurchase, setLinkedPurchase] = useState(null)
  const balance = supplierId ? balanceFor(supplierId) : 0

  useEffect(() => {
    if (!purchaseId || outstandingPurchases.some((p) => p.purchase_id === purchaseId)) {
      setLinkedPurchase(null)
      return
    }
    let cancelled = false
    supabase.from('purchases').select('id, reference, bill_date').eq('id', purchaseId).single()
      .then(({ data }) => {
        if (!cancelled && data) setLinkedPurchase(data)
      })
    return () => {
      cancelled = true
    }
  }, [purchaseId, outstandingPurchases])

  useEffect(() => {
    if (!isEdit || loaded || payments.length === 0) return
    const existing = payments.find((p) => p.id === id)
    if (existing) {
      setSupplierId(existing.supplier_id)
      setAmount(String(existing.amount))
      setPaymentDate(existing.created_at.slice(0, 10))
      setNote(existing.note || '')
      setPurchaseId(existing.purchase_id || '')
      setLoaded(true)
    }
  }, [isEdit, loaded, payments, id])

  useEffect(() => {
    if (isEdit) return
    if (supplierId && balance > 0 && !amount) setAmount(String(balance))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    label: s.name,
    sublabel: (() => {
      const b = balanceFor(s.id)
      return b > 0 ? `${formatCurrency(b)} owed` : 'Settled'
    })(),
  }))

  const accountOptions = accounts.map((a) => ({
    id: a.account_id,
    label: a.name,
    sublabel: `${a.type === 'bank' ? 'Bank' : 'Cash'} · ${formatCurrency(a.balance)}`,
  }))

  const billOptions = [
    { id: '', label: 'General payment (not tied to one bill)' },
    ...outstandingPurchases.map((p) => ({
      id: p.purchase_id,
      label: p.reference || `Bill · ${p.bill_date}`,
      sublabel: `${formatCurrency(p.outstanding)} outstanding`,
    })),
    ...(linkedPurchase ? [{
      id: linkedPurchase.id,
      label: linkedPurchase.reference || `Bill · ${linkedPurchase.bill_date}`,
      sublabel: 'currently linked',
    }] : []),
  ]

  const handleCreateSupplier = async (name) => {
    const { data, error: createError } = await addSupplier({ name })
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

  const submit = async ({ andNew }) => {
    if (!supplierId) {
      setError('Select a supplier.')
      return
    }
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

    const payload = {
      supplierId, accountId, amount: value, note: note.trim() || null,
      paymentDate: paymentDate || null, purchaseId: purchaseId || null,
    }

    const { error: submitError } = isEdit
      ? await updatePayment(id, payload)
      : await payBill(payload)

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchBalances()
    refetchAccounts()

    if (andNew && !isEdit) {
      setSupplierId('')
      setAccountId('')
      setAmount('')
      setPaymentDate(todayISO())
      setNote('')
      setPurchaseId('')
    } else {
      navigate('/dashboard/purchases/payments-made')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100 dark:bg-dark-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
            <HandCoins size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
            {isEdit ? 'Edit payment' : 'Pay a bill'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/purchases/payments-made')}
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
              <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Supplier *</span>
              <div className="mt-1.5">
                <SearchSelect
                  value={supplierId}
                  onChange={(val) => { setSupplierId(val); setPurchaseId('') }}
                  options={supplierOptions}
                  placeholder="Select a supplier"
                  createLabel="Add new"
                  onCreate={handleCreateSupplier}
                />
              </div>
            </div>

            {supplierId && (
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Balance owed
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
              <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Amount paid *</span>
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
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Apply to bill</span>
            <select
              value={purchaseId}
              onChange={(e) => setPurchaseId(e.target.value)}
              disabled={!supplierId}
              className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 disabled:opacity-50 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
            >
              {billOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}{o.sublabel ? ` — ${o.sublabel}` : ''}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-ink-400">
              Optional — links this payment to a specific outstanding bill so its balance reflects it.
            </span>
          </label>

          <label className="mt-6 block">
            <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional — e.g. bank transfer, cash"
              className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
            />
          </label>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-400/10 bg-cream-50 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/purchases/payments-made')}>
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {!isEdit && (
            <Button variant="outline" disabled={loading} onClick={() => submit({ andNew: true })}>
              {loading ? 'Saving…' : 'Save and new'}
            </Button>
          )}
          <Button variant="primary" disabled={loading} onClick={() => submit({ andNew: false })}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </footer>
    </div>
  )
}
