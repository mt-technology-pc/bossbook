import { Fragment, useState } from 'react'
import { AlertCircle, RefreshCw, Info } from 'lucide-react'
import { useTrialBalance } from '../../hooks/useTrialBalance'
import { formatCurrency } from '../../lib/currency'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'

const TYPE_LABELS = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expenses',
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function TrialBalance() {
  const [asOfDate, setAsOfDate] = useState(todayISO())
  const [backfilling, setBackfilling] = useState(false)
  const [backfillMessage, setBackfillMessage] = useState(null)
  const { rowsByType, totalDebits, totalCredits, loading, error, refetch } = useTrialBalance(asOfDate)

  const balanced = Math.abs(totalDebits - totalCredits) < 0.01

  const runBackfill = async () => {
    if (!window.confirm('Post journal entries for every existing sale, purchase, payment, and expense that predates double-entry bookkeeping? This is safe to run more than once — it skips anything already posted.')) return
    setBackfilling(true)
    setBackfillMessage(null)
    const { error: rpcError } = await supabase.rpc('backfill_journal_entries')
    setBackfilling(false)
    if (rpcError) {
      setBackfillMessage({ type: 'error', text: rpcError.message })
      return
    }
    setBackfillMessage({ type: 'success', text: 'Backfill complete.' })
    refetch()
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
            Trial Balance
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
            Every account's balance as of a date, in its normal Debit or Credit column.
          </p>
        </div>
        <Button onClick={runBackfill} variant="outline" disabled={backfilling}>
          <RefreshCw size={15} className={backfilling ? 'animate-spin' : ''} />
          {backfilling ? 'Backfilling…' : 'Backfill existing data'}
        </Button>
      </div>

      {backfillMessage && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${
            backfillMessage.type === 'error'
              ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
              : 'border-clay-500/20 bg-clay-500/10 text-clay-700 dark:text-clay-300'
          }`}
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {backfillMessage.text}
        </div>
      )}

      <div className="mt-6 flex items-start gap-2 rounded-xl border border-ink-400/15 bg-cream-100 px-3.5 py-2.5 text-xs text-ink-500 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-400">
        <Info size={14} className="mt-0.5 shrink-0" />
        Cost of Goods Sold entries use each item's cost at time of sale (standard/latest-cost
        method, the same one offered in the Inventory Valuation report). This can differ from the
        Income Statement report if it's viewed with FIFO or Weighted Average selected instead.
      </div>

      <label className="mt-6 block max-w-xs">
        <span className="text-xs font-medium text-ink-500 dark:text-cream-400">As of</span>
        <input
          type="date"
          value={asOfDate}
          onChange={(e) => setAsOfDate(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
        />
      </label>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : rowsByType.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-400/20 bg-cream-50 py-16 text-center dark:border-cream-100/15 dark:bg-dark-800">
          <p className="text-sm font-medium text-ink-600 dark:text-cream-300">Nothing posted yet</p>
          <p className="mt-1 max-w-xs text-xs text-ink-400">
            Record a sale, purchase, payment, or expense — or run the backfill above if you
            already have historical data.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                  <th className="pb-2.5 font-medium">Account</th>
                  <th className="pb-2.5 text-right font-medium">Debit</th>
                  <th className="pb-2.5 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {rowsByType.map((group) => (
                  <Fragment key={group.type}>
                    <tr>
                      <td colSpan={3} className="pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                        {TYPE_LABELS[group.type]}
                      </td>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={row.id} className="border-b border-ink-400/10 last:border-0 dark:border-cream-100/10">
                        <td className="py-2 pr-3 text-ink-900 dark:text-cream-50">{row.name}</td>
                        <td className="py-2 pr-3 text-right text-ink-700 dark:text-cream-200">
                          {row.debitColumn ? formatCurrency(row.debitColumn) : '—'}
                        </td>
                        <td className="py-2 text-right text-ink-700 dark:text-cream-200">
                          {row.creditColumn ? formatCurrency(row.creditColumn) : '—'}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-400/20 font-semibold text-ink-900 dark:border-cream-100/20 dark:text-cream-50">
                  <td className="pt-3">Total</td>
                  <td className="pt-3 text-right">{formatCurrency(totalDebits)}</td>
                  <td className="pt-3 text-right">{formatCurrency(totalCredits)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className={`mt-4 text-center text-sm font-medium ${balanced ? 'text-clay-600 dark:text-clay-400' : 'text-red-600 dark:text-red-400'}`}>
            {balanced ? 'Books balance — total debits equal total credits.' : 'Books do not balance. This should never happen — please report it.'}
          </p>
        </div>
      )}
    </div>
  )
}
