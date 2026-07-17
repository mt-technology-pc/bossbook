import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Phone, Mail, MapPin, HandCoins, Trash2, AlertCircle,
  Receipt, ChevronDown,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useSupplierLedger } from '../../hooks/useSupplierLedger'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import RecordPaymentModal from '../../components/suppliers/RecordPaymentModal'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [supplier, setSupplier] = useState(null)
  const [loadingSupplier, setLoadingSupplier] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const { ledger, balance, loading, error, addPayment } = useSupplierLedger(id)

  useEffect(() => {
    let cancelled = false
    setLoadingSupplier(true)
    supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError || !data) setNotFound(true)
        else setSupplier(data)
        setLoadingSupplier(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${supplier.name}" from your suppliers?`)) return
    await supabase.from('suppliers').delete().eq('id', id)
    navigate('/dashboard/suppliers')
  }

  if (loadingSupplier) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-ink-600">Supplier not found</p>
        <Link to="/dashboard/suppliers" className="mt-4 text-sm font-medium text-clay-600 hover:text-clay-700">
          Back to suppliers
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/dashboard/suppliers"
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
      >
        <ArrowLeft size={15} /> Suppliers
      </Link>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 font-heading text-xl font-semibold text-cream-50">
            {supplier.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="font-heading text-xl font-semibold text-ink-900 sm:text-2xl">
              {supplier.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-400">
              {supplier.phone && (
                <span className="flex items-center gap-1"><Phone size={12} /> {supplier.phone}</span>
              )}
              {supplier.email && (
                <span className="flex items-center gap-1"><Mail size={12} /> {supplier.email}</span>
              )}
              {supplier.address && (
                <span className="flex items-center gap-1"><MapPin size={12} /> {supplier.address}</span>
              )}
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
              {balance > 0 ? `${formatCurrency(balance)} owed` : 'Settled'}
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} variant="primary" disabled={balance <= 0}>
            <HandCoins size={16} /> Pay bill
          </Button>
        </div>
      </div>

      {supplier.notes && (
        <p className="mt-3 rounded-xl bg-cream-200/60 px-4 py-3 text-sm text-ink-500">
          {supplier.notes}
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
            <Trash2 size={13} /> Remove supplier
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
        ) : ledger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
              <Receipt size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              No bills or payments yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Bills recorded against this supplier from Purchases will show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex justify-end gap-2 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              <span className="w-[76px]">Debit</span>
              <span className="w-[76px]">Credit</span>
              <span className="w-[92px]">Balance</span>
              <span className="w-[15px]" />
            </div>
            <ul className="divide-y divide-ink-400/10">
            {ledger.map((entry, i) => {
              const isBill = entry.kind === 'bill'
              const isOpen = expanded === entry.id
              return (
                <motion.li
                  key={`${entry.kind}-${entry.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                  className="py-3.5"
                >
                  <button
                    onClick={() => isBill && setExpanded(isOpen ? null : entry.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          isBill
                            ? 'bg-clay-500/10 text-clay-600'
                            : 'bg-ink-400/10 text-ink-500'
                        }`}
                      >
                        {isBill ? <Receipt size={16} /> : <HandCoins size={16} />}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {isBill ? (entry.reference || 'Bill') : 'Payment made'}
                        </p>
                        <p className="text-xs text-ink-400">
                          {formatDate(entry.date)}{!isBill && entry.note ? ` · ${entry.note}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex justify-end gap-2 text-right text-xs sm:text-sm">
                        <span className={`w-[76px] ${entry.debit ? 'font-semibold text-clay-600' : 'text-ink-300'}`}>
                          {entry.debit ? formatCurrency(entry.debit) : '—'}
                        </span>
                        <span className={`w-[76px] ${entry.credit ? 'font-semibold text-ink-700' : 'text-ink-300'}`}>
                          {entry.credit ? formatCurrency(entry.credit) : '—'}
                        </span>
                        <span className="w-[92px] font-semibold text-ink-900">
                          {formatCurrency(entry.balance)}
                        </span>
                      </div>
                      <span className="w-[15px]">
                        {isBill && (
                          <ChevronDown
                            size={15}
                            className={`text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        )}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isBill && isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 overflow-hidden rounded-xl bg-cream-100 p-3"
                      >
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-ink-400">
                              <th className="pb-2 font-medium">Qty</th>
                              <th className="pb-2 font-medium">Unit cost</th>
                              <th className="pb-2 font-medium">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.items.map((item) => (
                              <tr key={item.id} className="text-ink-700">
                                <td className="py-1">{item.quantity}</td>
                                <td className="py-1">{formatCurrency(item.unit_cost)}</td>
                                <td className="py-1">{formatCurrency(item.subtotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {entry.notes && (
                          <p className="mt-2 border-t border-ink-400/10 pt-2 text-xs text-ink-400">
                            {entry.notes}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              )
            })}
            </ul>
          </>
        )}
      </div>

      <RecordPaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addPayment}
        supplier={{ supplier_id: id, name: supplier.name, balance }}
      />
    </div>
  )
}
