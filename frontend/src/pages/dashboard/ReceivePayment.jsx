import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { X, AlertCircle, HandCoins, Search } from 'lucide-react'
import { useCustomerPayments } from '../../hooks/useCustomerPayments'
import { useCustomers } from '../../hooks/useCustomers'
import { useCustomerBalances } from '../../hooks/useCustomerBalances'
import { useAccounts } from '../../hooks/useAccounts'
import { useOutstandingSales } from '../../hooks/useOutstandingSales'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'

const GENERAL_KEY = 'general'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function ReceivePayment() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { payments, receivePayment, updatePayment } = useCustomerPayments()
  const { customers, addCustomer } = useCustomers()
  const { balanceFor, refetch: refetchBalances } = useCustomerBalances()
  const { accounts, addAccount, refetch: refetchAccounts } = useAccounts()

  const [customerId, setCustomerId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)
  const [search, setSearch] = useState('')

  // Create-mode only: per-invoice allocation table state.
  const [checked, setChecked] = useState({})
  const [amounts, setAmounts] = useState({})

  // Edit-mode only: this payment always applies to at most one invoice.
  const [editAmount, setEditAmount] = useState('')
  const [editSaleId, setEditSaleId] = useState('')

  const { sales: outstandingSales } = useOutstandingSales(customerId)
  const [linkedSale, setLinkedSale] = useState(null)
  const balance = customerId ? balanceFor(customerId) : 0

  useEffect(() => {
    if (!isEdit || !editSaleId || outstandingSales.some((s) => s.sale_id === editSaleId)) {
      setLinkedSale(null)
      return
    }
    let cancelled = false
    supabase.from('sales').select('id, reference, type, sale_date').eq('id', editSaleId).single()
      .then(({ data }) => {
        if (!cancelled && data) setLinkedSale(data)
      })
    return () => {
      cancelled = true
    }
  }, [isEdit, editSaleId, outstandingSales])

  useEffect(() => {
    if (!isEdit || loaded || payments.length === 0) return
    const existing = payments.find((p) => p.id === id)
    if (existing) {
      setCustomerId(existing.customer_id)
      setEditAmount(String(existing.amount))
      setPaymentDate(existing.created_at.slice(0, 10))
      setNote(existing.note || '')
      setEditSaleId(existing.sale_id || '')
      setLoaded(true)
    }
  }, [isEdit, loaded, payments, id])

  useEffect(() => {
    if (isEdit) return
    setChecked({})
    setAmounts({})
  }, [customerId, isEdit])

  useEffect(() => {
    if (isEdit || !location.state?.customerId) return
    setCustomerId(location.state.customerId)
    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const editInvoiceOptions = [
    { id: '', label: 'General payment (not tied to one invoice)' },
    ...outstandingSales.map((s) => ({
      id: s.sale_id,
      label: s.reference || `${s.type === 'invoice' ? 'Invoice' : 'Receipt'} · ${s.sale_date}`,
      sublabel: `${formatCurrency(s.outstanding)} outstanding`,
    })),
    ...(linkedSale ? [{
      id: linkedSale.id,
      label: linkedSale.reference || `${linkedSale.type === 'invoice' ? 'Invoice' : 'Receipt'} · ${linkedSale.sale_date}`,
      sublabel: 'currently linked',
    }] : []),
  ]

  const filteredSales = outstandingSales.filter((s) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (s.reference || '').toLowerCase().includes(q)
  })

  const setRowChecked = (key, isChecked, fullAmount) => {
    setChecked((prev) => ({ ...prev, [key]: isChecked }))
    setAmounts((prev) => {
      if (isChecked && !prev[key]) return { ...prev, [key]: fullAmount != null ? String(fullAmount) : prev[key] }
      if (!isChecked) return { ...prev, [key]: '' }
      return prev
    })
  }

  const setRowAmount = (key, value) => {
    setAmounts((prev) => ({ ...prev, [key]: value }))
    setChecked((prev) => ({ ...prev, [key]: Number(value) > 0 }))
  }

  const totalReceived = Object.keys(checked)
    .filter((k) => checked[k])
    .reduce((sum, k) => sum + (Number(amounts[k]) || 0), 0)

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

  const submitCreate = async () => {
    if (!customerId) {
      setError('Select a customer.')
      return
    }
    if (!accountId) {
      setError('Choose which account this payment is deposited to.')
      return
    }
    const rows = [
      ...outstandingSales
        .filter((s) => checked[s.sale_id] && Number(amounts[s.sale_id]) > 0)
        .map((s) => ({ saleId: s.sale_id, amount: Number(amounts[s.sale_id]) })),
      ...(checked[GENERAL_KEY] && Number(amounts[GENERAL_KEY]) > 0
        ? [{ saleId: null, amount: Number(amounts[GENERAL_KEY]) }]
        : []),
    ]
    if (rows.length === 0) {
      setError('Enter a payment amount for at least one invoice.')
      return
    }

    setError(null)
    setLoading(true)

    for (const row of rows) {
      const { error: submitError } = await receivePayment({
        customerId, accountId, amount: row.amount, note: note.trim() || null,
        paymentDate: paymentDate || null, saleId: row.saleId,
      })
      if (submitError) {
        setLoading(false)
        setError(submitError.message)
        return
      }
    }

    setLoading(false)
    refetchBalances()
    refetchAccounts()
    navigate('/dashboard/sales/payments-received')
  }

  const submitEdit = async () => {
    if (!customerId) {
      setError('Select a customer.')
      return
    }
    if (!accountId) {
      setError('Choose which account this payment is deposited to.')
      return
    }
    const value = Number(editAmount)
    if (!value || value <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }

    setError(null)
    setLoading(true)

    const { error: submitError } = await updatePayment(id, {
      accountId, amount: value, note: note.trim() || null,
      paymentDate: paymentDate || null, saleId: editSaleId || null,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchBalances()
    refetchAccounts()
    navigate('/dashboard/sales/payments-received')
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <HandCoins size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900">
            {isEdit ? 'Edit payment' : 'Receive payment'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/sales/payments-received')}
          aria-label="Cancel"
          className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className={`mx-auto px-4 py-8 sm:px-6 ${isEdit ? 'max-w-2xl' : 'max-w-4xl'}`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full max-w-sm">
              <span className="text-xs font-medium text-ink-500">Customer *</span>
              <div className="mt-1.5">
                <SearchSelect
                  value={customerId}
                  onChange={(val) => { setCustomerId(val); setEditSaleId('') }}
                  options={customerOptions}
                  placeholder="Select a customer"
                  createLabel="Add new"
                  onCreate={handleCreateCustomer}
                />
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                {isEdit ? 'Current balance' : 'Amount received'}
              </p>
              <p className="font-heading text-3xl font-semibold text-ink-900">
                {formatCurrency(isEdit ? balance : totalReceived)}
              </p>
              {!isEdit && customerId && (
                <p className="mt-0.5 text-xs text-ink-400">
                  {formatCurrency(balance)} owed
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {isEdit && (
              <label className="block">
                <span className="text-xs font-medium text-ink-500">Amount received *</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
                />
              </label>
            )}
            <label className="block">
              <span className="text-xs font-medium text-ink-500">Payment date</span>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </label>
            <div>
              <span className="text-xs font-medium text-ink-500">Deposit to *</span>
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
          </div>

          {isEdit ? (
            <label className="mt-4 block">
              <span className="text-xs font-medium text-ink-500">Apply to invoice</span>
              <select
                value={editSaleId}
                onChange={(e) => setEditSaleId(e.target.value)}
                disabled={!customerId}
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 disabled:opacity-50"
              >
                {editInvoiceOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}{o.sublabel ? ` — ${o.sublabel}` : ''}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-ink-400">
                Optional — links this payment to a specific outstanding invoice so its balance reflects it.
              </span>
            </label>
          ) : (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="font-heading text-base font-semibold text-ink-900">
                  Outstanding transactions
                </h2>
              </div>

              <div className="relative mt-3 max-w-xs">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find invoice no."
                  disabled={!customerId}
                  className="w-full rounded-xl border border-ink-400/20 bg-cream-50 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 disabled:opacity-50"
                />
              </div>

              {!customerId ? (
                <p className="mt-4 rounded-xl border border-dashed border-ink-400/20 bg-cream-50 px-4 py-6 text-center text-sm text-ink-400">
                  Select a customer to see their outstanding invoices.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-2xl border border-ink-400/15 bg-cream-50">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                        <th className="w-10 py-2.5 pl-4" />
                        <th className="py-2.5 font-medium">Description</th>
                        <th className="py-2.5 font-medium">Due date</th>
                        <th className="py-2.5 text-right font-medium">Original amount</th>
                        <th className="py-2.5 text-right font-medium">Open balance</th>
                        <th className="py-2.5 pr-4 text-right font-medium">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-sm text-ink-400">
                            {outstandingSales.length === 0 ? 'No outstanding invoices for this customer.' : 'No matches.'}
                          </td>
                        </tr>
                      ) : (
                        filteredSales.map((s) => (
                          <tr key={s.sale_id} className="border-b border-ink-400/10 last:border-0">
                            <td className="py-2.5 pl-4">
                              <input
                                type="checkbox"
                                checked={Boolean(checked[s.sale_id])}
                                onChange={(e) => setRowChecked(s.sale_id, e.target.checked, s.outstanding)}
                                className="h-4 w-4 rounded border-ink-400/30 text-clay-500 focus:ring-clay-500"
                              />
                            </td>
                            <td className="py-2.5 pr-3 font-medium text-ink-900">
                              {s.reference || `${s.type === 'invoice' ? 'Invoice' : 'Receipt'} · ${formatDate(s.sale_date)}`}
                            </td>
                            <td className="py-2.5 pr-3 text-ink-500">{formatDate(s.due_date)}</td>
                            <td className="py-2.5 pr-3 text-right text-ink-500">
                              {formatCurrency(s.total_amount)}
                            </td>
                            <td className="py-2.5 pr-3 text-right text-ink-500">
                              {formatCurrency(s.outstanding)}
                            </td>
                            <td className="py-2.5 pr-4">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amounts[s.sale_id] ?? ''}
                                onChange={(e) => setRowAmount(s.sale_id, e.target.value)}
                                placeholder="0.00"
                                className="w-32 rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-1.5 text-right text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                      <tr>
                        <td className="py-2.5 pl-4">
                          <input
                            type="checkbox"
                            checked={Boolean(checked[GENERAL_KEY])}
                            onChange={(e) => setRowChecked(GENERAL_KEY, e.target.checked)}
                            className="h-4 w-4 rounded border-ink-400/30 text-clay-500 focus:ring-clay-500"
                          />
                        </td>
                        <td className="py-2.5 pr-3 text-ink-500" colSpan={3}>
                          General payment <span className="text-xs text-ink-400">(not tied to an invoice)</span>
                        </td>
                        <td className="py-2.5 pr-3 text-right text-ink-400">—</td>
                        <td className="py-2.5 pr-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amounts[GENERAL_KEY] ?? ''}
                            onChange={(e) => setRowAmount(GENERAL_KEY, e.target.value)}
                            placeholder="0.00"
                            className="w-32 rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-1.5 text-right text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <label className="mt-6 block max-w-xl">
            <span className="text-xs font-medium text-ink-500">Memo</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional"
              className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
            />
          </label>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-400/10 bg-cream-50 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] sm:px-6">
        <Button variant="ghost" onClick={() => navigate('/dashboard/sales/payments-received')}>
          Cancel
        </Button>
        <Button
          variant="primary"
          disabled={loading}
          onClick={() => (isEdit ? submitEdit() : submitCreate())}
        >
          {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
        </Button>
      </footer>
    </div>
  )
}
