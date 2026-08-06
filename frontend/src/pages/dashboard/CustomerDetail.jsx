import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MapPin, HandCoins, Trash2, AlertCircle,
  ArrowDownRight, ArrowUpRight, MessageSquare, Check, Pencil, ExternalLink,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCustomerTransactions } from '../../hooks/useCustomerTransactions'
import { formatCurrency } from '../../lib/currency'
import { SRI_LANKA_DISTRICTS } from '../../lib/districts'
import { apiFetch } from '../../lib/api'
import Button from '../../components/ui/Button'
import AddTransactionModal from '../../components/customers/AddTransactionModal'
import AddCustomerModal from '../../components/customers/AddCustomerModal'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

// Auto-generated transactions carry a sale_id and/or credit_note_id back
// to the document that created them — this resolves which editor to send
// the user to, or null for a standalone entry (e.g. a plain payment) with
// nothing further to edit here.
function editPathFor(t) {
  if (t.credit_note_id) return `/dashboard/sales/credit-notes/${t.credit_note_id}`
  if (t.sale_id) {
    // Prefer the human-readable reference over the raw UUID in the URL —
    // falls back to the id for the rare sale with no reference at all.
    const urlId = t.sales?.reference || t.sale_id
    return t.sales?.type === 'receipt'
      ? `/dashboard/sales/new-receipt/${urlId}`
      : `/dashboard/sales/new-invoice/${urlId}`
  }
  return null
}

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [loadingCustomer, setLoadingCustomer] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [reminderStatus, setReminderStatus] = useState(null)

  const { transactions, balance, totalCharged, totalPaid, loading, error, addTransaction } = useCustomerTransactions(id)

  const sendReminder = async () => {
    if (reminderStatus === 'sending') return
    setReminderStatus('sending')
    try {
      await apiFetch('/api/sms/payment-reminder', {
        method: 'POST',
        body: JSON.stringify({ customerId: id }),
      })
      setReminderStatus('sent')
      setTimeout(() => setReminderStatus(null), 3000)
    } catch (err) {
      setReminderStatus(null)
      window.alert(err.message || 'Could not send the reminder.')
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoadingCustomer(true)
    supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError || !data) setNotFound(true)
        else setCustomer(data)
        setLoadingCustomer(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${customer.name}" from your customers?`)) return
    await supabase.from('customers').delete().eq('id', id)
    navigate('/dashboard/customers')
  }

  const handleDistrictChange = async (e) => {
    const district = e.target.value || null
    const { data } = await supabase
      .from('customers')
      .update({ district })
      .eq('id', id)
      .select()
      .single()
    if (data) setCustomer(data)
  }

  const handleEditCustomer = async (payload) => {
    const { data, error: updateError } = await supabase
      .from('customers')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (updateError) return { error: updateError }
    setCustomer(data)
    return { data }
  }

  if (loadingCustomer) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-ink-600">Customer not found</p>
        <Link to="/dashboard/customers" className="mt-4 text-sm font-medium text-clay-600 hover:text-clay-700">
          Back to customers
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/dashboard/customers"
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
      >
        <ArrowLeft size={15} /> Customers
      </Link>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 font-heading text-xl font-semibold text-cream-50">
            {customer.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-heading text-xl font-semibold text-ink-900 sm:text-2xl">
              {customer.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
              {customer.phone && (
                <span className="flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1"><Mail size={12} /> {customer.email}</span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1"><MapPin size={12} /> {customer.address}</span>
              )}
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                <select
                  value={customer.district || ''}
                  onChange={handleDistrictChange}
                  className="rounded border-none bg-transparent text-xs text-ink-400 outline-none focus:text-ink-700"
                >
                  <option value="">Unspecified district</option>
                  {SRI_LANKA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-ink-400">Balance</p>
            <p
              className={`font-heading text-xl font-semibold ${
                balance > 0
                  ? 'text-clay-600'
                  : 'text-ink-700'
              }`}
            >
              {balance > 0
                ? `${formatCurrency(balance)} owed`
                : balance < 0
                  ? `${formatCurrency(Math.abs(balance))} credit`
                  : 'Settled'}
            </p>
            {totalCharged > 0 && (
              <p className="mt-0.5 text-xs text-ink-400">
                {formatCurrency(totalCharged)} billed · {formatCurrency(totalPaid)} paid
              </p>
            )}
          </div>
          {balance > 0 && (
            <Button onClick={sendReminder} variant="outline" disabled={reminderStatus === 'sending'}>
              {reminderStatus === 'sent' ? (
                <><Check size={16} className="text-emerald-600" /> Sent</>
              ) : reminderStatus === 'sending' ? (
                'Sending…'
              ) : (
                <><MessageSquare size={16} /> Send reminder</>
              )}
            </Button>
          )}
          <Button onClick={() => setEditOpen(true)} variant="outline">
            <Pencil size={16} /> Edit
          </Button>
          <Button onClick={() => setModalOpen(true)} variant="primary">
            <HandCoins size={16} /> Add transaction
          </Button>
        </div>
      </div>

      {customer.notes && (
        <p className="mt-3 rounded-xl bg-cream-200/60 px-4 py-3 text-sm text-ink-500">
          {customer.notes}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ink-900">
            Transaction history
          </h2>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-red-500"
          >
            <Trash2 size={13} /> Remove customer
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
              <HandCoins size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              No transactions yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Log a charge or a payment to start building this customer&apos;s balance.
            </p>
            <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
              <HandCoins size={15} /> Add transaction
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-5 flex justify-end gap-1.5 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-400 sm:gap-2">
              <span className="w-[52px] sm:w-[76px]">Debit</span>
              <span className="w-[52px] sm:w-[76px]">Credit</span>
              <span className="w-[64px] sm:w-[92px]">Balance</span>
            </div>
            <ul className="divide-y divide-ink-400/10">
            {transactions.map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      t.type === 'charge'
                        ? 'bg-clay-500/10 text-clay-600'
                        : 'bg-ink-400/10 text-ink-500'
                    }`}
                  >
                    {t.type === 'charge' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">
                      {t.type === 'charge' ? 'Charge' : t.type === 'credit_note' ? 'Credit note' : 'Payment received'}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {formatDate(t.created_at)}{t.note ? ` · ${t.note}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end gap-1.5 text-right text-xs sm:gap-2 sm:text-sm">
                  <span className={`w-[52px] sm:w-[76px] ${t.debit ? 'font-semibold text-clay-600' : 'text-ink-300'}`}>
                    {t.debit ? formatCurrency(t.debit) : '—'}
                  </span>
                  <span className={`w-[52px] sm:w-[76px] ${t.credit ? 'font-semibold text-ink-700' : 'text-ink-300'}`}>
                    {t.credit ? formatCurrency(t.credit) : '—'}
                  </span>
                  <span className="w-[64px] font-semibold text-ink-900 sm:w-[92px]">
                    {formatCurrency(t.balance)}
                  </span>
                  {editPathFor(t) && (
                    <button
                      onClick={() => navigate(editPathFor(t))}
                      aria-label="Edit"
                      title={t.type === 'credit_note' ? 'Edit credit note' : 'Edit sale'}
                      className="rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-clay-500/10 hover:text-clay-600"
                    >
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </motion.li>
            ))}
            </ul>
          </>
        )}
      </div>

      <AddTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addTransaction}
        customer={{ customer_id: id, name: customer.name, balance }}
      />

      <AddCustomerModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditCustomer}
        customer={customer}
      />
    </div>
  )
}
