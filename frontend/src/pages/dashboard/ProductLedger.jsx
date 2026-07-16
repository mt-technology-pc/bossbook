import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ArrowDownRight, ArrowUpRight, AlertCircle, ScanLine,
} from 'lucide-react'
import { useProductLedger } from '../../hooks/useProductLedger'
import { formatCurrency } from '../../lib/currency'
import { VALUATION_METHODS } from '../../lib/inventoryValuation'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function ProductLedger() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [asOfDate, setAsOfDate] = useState(searchParams.get('asOf') || todayISO())
  const [method, setMethod] = useState(searchParams.get('method') || 'fifo')

  const { product, valuation, loading, error, notFound } = useProductLedger(id, { asOfDate, method })
  const methodLabel = VALUATION_METHODS.find((m) => m.value === method)?.label

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-ink-600 dark:text-cream-300">Item not found</p>
        <Link to="/dashboard/reports/inventory-valuation" className="mt-4 text-sm font-medium text-clay-600 hover:text-clay-700">
          Back to report
        </Link>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/dashboard/reports/inventory-valuation')}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600 dark:text-cream-400"
      >
        <ArrowLeft size={15} /> Inventory Valuation Summary
      </button>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-6 dark:border-cream-100/10 dark:bg-dark-800 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-mono text-ink-400">{product.sku || '—'}</p>
          <h1 className="mt-0.5 font-heading text-xl font-semibold text-ink-900 dark:text-cream-50 sm:text-2xl">
            {product.name}
          </h1>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-400">
            <span>{product.category || 'Uncategorized'}</span>
            {product.tracks_serial && (
              <span className="flex items-center gap-1 rounded-full bg-clay-500/10 px-2 py-0.5 font-medium text-clay-600 dark:text-clay-400">
                <ScanLine size={11} /> Serial tracked
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-right sm:gap-6">
          <div>
            <p className="text-xs text-ink-400">Qty on hand</p>
            <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">
              {valuation?.qtyOnHand ?? 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Unit cost</p>
            <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">
              {formatCurrency(valuation?.unitCost ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-400">Total value</p>
            <p className="font-heading text-xl font-semibold text-clay-600 dark:text-clay-400">
              {formatCurrency(valuation?.totalValue ?? 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">As of date</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
          />
        </label>
        <div>
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Valuation method</span>
          <div className="mt-1.5 flex gap-1.5">
            {VALUATION_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  method === m.value
                    ? 'border-clay-500 bg-clay-500/10 text-clay-600 dark:text-clay-400'
                    : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40 dark:border-cream-100/15 dark:text-cream-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
          Transaction &amp; cost layer history
        </h2>
        <p className="mt-1 text-xs text-ink-400">
          Every event used to compute the {methodLabel.toLowerCase()} valuation above, oldest first.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!valuation || valuation.ledger.length === 0 ? (
          <p className="mt-8 text-center text-sm text-ink-400">No transactions as of this date.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Event</th>
                  <th className="pb-3 pr-3 text-right font-medium">Qty in</th>
                  <th className="pb-3 pr-3 text-right font-medium">Qty out</th>
                  <th className="pb-3 pr-3 text-right font-medium">Unit cost</th>
                  <th className="pb-3 pr-3 text-right font-medium">Balance qty</th>
                  <th className="pb-3 text-right font-medium">Balance value</th>
                </tr>
              </thead>
              <tbody>
                {valuation.ledger.map((entry, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4) }}
                    className="border-b border-ink-400/5 last:border-0 dark:border-cream-100/5"
                  >
                    <td className="py-2.5 pr-3 text-ink-500 dark:text-cream-400">{formatDate(entry.date)}</td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-1.5 text-ink-900 dark:text-cream-50">
                        {entry.type === 'in' ? (
                          <ArrowUpRight size={13} className="text-clay-500" />
                        ) : (
                          <ArrowDownRight size={13} className="text-ink-400" />
                        )}
                        {entry.label}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-clay-600 dark:text-clay-400">
                      {entry.type === 'in' ? entry.qty : ''}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-500 dark:text-cream-400">
                      {entry.type === 'out' ? entry.qty : ''}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-ink-500 dark:text-cream-400">
                      {entry.type === 'in' ? formatCurrency(entry.unitCost) : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium text-ink-900 dark:text-cream-50">
                      {entry.balanceQty}
                    </td>
                    <td className="py-2.5 text-right font-medium text-ink-900 dark:text-cream-50">
                      {formatCurrency(entry.balanceValue)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
