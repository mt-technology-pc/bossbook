import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, FileText, Receipt, TrendingUp, AlertCircle, ChevronDown, Wallet, Landmark, HandCoins,
  Pencil, Trash2, ListChecks,
} from 'lucide-react'
import { useSales } from '../../hooks/useSales'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function Sales() {
  const { sales, loading, error, deleteSale } = useSales()
  const [expanded, setExpanded] = useState(null)
  const navigate = useNavigate()

  const editPathFor = (s) => (s.type === 'invoice' ? `/dashboard/sales/new-invoice/${s.id}` : `/dashboard/sales/new-receipt/${s.id}`)

  const handleDelete = async (e, s) => {
    e.stopPropagation()
    const label = s.reference || (s.type === 'invoice' ? 'this invoice' : 'this receipt')
    if (!window.confirm(`Delete ${label}? This reverses its effect on stock and account balances.`)) return
    const { error: deleteError } = await deleteSale(s.id)
    if (deleteError) window.alert(deleteError.message)
  }

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0)
  const invoiceCount = sales.filter((s) => s.type === 'invoice').length
  const receiptCount = sales.filter((s) => s.type === 'receipt').length

  const stats = [
    { icon: TrendingUp, label: 'Total sales', value: formatCurrency(totalSales) },
    { icon: FileText, label: 'Invoices', value: invoiceCount },
    { icon: Receipt, label: 'Sales receipts', value: receiptCount },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
            Sales
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
            Invoices for credit sales, receipts for cash &amp; bank sales.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/dashboard/sales/payments-received')} variant="ghost">
            <ListChecks size={16} /> Payments received
          </Button>
          <Button onClick={() => navigate('/dashboard/sales/receive-payment')} variant="outline">
            <HandCoins size={16} /> Receive payment
          </Button>
          <Button onClick={() => navigate('/dashboard/sales/new-receipt')} variant="outline">
            <Receipt size={16} /> Sales receipt
          </Button>
          <Button onClick={() => navigate('/dashboard/sales/new-invoice')} variant="primary">
            <Plus size={16} /> Invoice
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
              <s.icon size={17} />
            </span>
            <p className="mt-3 font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
              <TrendingUp size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
              No sales recorded yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Create an invoice for a credit sale, or a sales receipt when you&apos;re paid on the spot.
            </p>
            <div className="mt-5 flex gap-2">
              <Button onClick={() => navigate('/dashboard/sales/new-receipt')} variant="outline">
                <Receipt size={15} /> Sales receipt
              </Button>
              <Button onClick={() => navigate('/dashboard/sales/new-invoice')} variant="primary">
                <Plus size={15} /> Invoice
              </Button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-ink-400/10 dark:divide-cream-100/10">
            {sales.map((s, i) => {
              const itemCount = s.sale_items.reduce((sum, it) => sum + it.quantity, 0)
              const isOpen = expanded === s.id
              const isInvoice = s.type === 'invoice'
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                  className="py-3.5"
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
                        {isInvoice ? <FileText size={16} /> : <Receipt size={16} />}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium text-ink-900 dark:text-cream-50">
                          {s.reference || `${isInvoice ? 'Invoice' : 'Receipt'} · ${formatDate(s.sale_date)}`}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isInvoice
                                ? 'bg-clay-500/15 text-clay-600 dark:text-clay-400'
                                : 'bg-ink-400/10 text-ink-500 dark:bg-cream-100/10 dark:text-cream-400'
                            }`}
                          >
                            {isInvoice ? 'Invoice' : 'Receipt'}
                          </span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
                          {s.customers?.name || 'Walk-in customer'} · {itemCount} unit{itemCount === 1 ? '' : 's'} · {formatDate(s.sale_date)}
                          {isInvoice && s.due_date ? ` · Due ${formatDate(s.due_date)}` : ''}
                          {!isInvoice && s.accounts && (
                            <span className="ml-1 flex items-center gap-1">
                              {s.accounts.type === 'bank' ? <Landmark size={11} /> : <Wallet size={11} />}
                              {s.accounts.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="mr-1.5 text-sm font-semibold text-ink-700 dark:text-cream-200">
                        {formatCurrency(s.total_amount)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(editPathFor(s)) }}
                        aria-label="Edit sale"
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-clay-500/10 hover:text-clay-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, s)}
                        aria-label="Delete sale"
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronDown
                        size={16}
                        className={`text-ink-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 overflow-hidden rounded-xl bg-cream-100 p-3 dark:bg-dark-700"
                    >
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-ink-400">
                            <th className="pb-2 font-medium">Qty</th>
                            <th className="pb-2 font-medium">Rate</th>
                            <th className="pb-2 font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.sale_items.map((item) => (
                            <tr key={item.id} className="text-ink-700 dark:text-cream-200">
                              <td className="py-1">{item.quantity}</td>
                              <td className="py-1">{formatCurrency(item.unit_price)}</td>
                              <td className="py-1">{formatCurrency(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {s.notes && (
                        <p className="mt-2 border-t border-ink-400/10 pt-2 text-xs text-ink-400 dark:border-cream-100/10">
                          {s.notes}
                        </p>
                      )}
                    </motion.div>
                  )}
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
