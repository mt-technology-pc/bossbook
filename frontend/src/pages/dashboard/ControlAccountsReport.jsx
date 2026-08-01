import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Printer } from 'lucide-react'
import { useControlAccountsReport } from '../../hooks/useControlAccountsReport'
import { formatCurrency } from '../../lib/currency'
import PrintFrame from '../../components/print/PrintFrame'

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
  })
}

function TAccountTable({ title, data }) {
  if (!data) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-400/20 bg-cream-50 py-10 text-center print:border-black">
        <p className="text-sm font-medium text-ink-500">{title}</p>
        <p className="mt-1 text-xs text-ink-400">No journal entries posted to this account yet.</p>
      </div>
    )
  }

  const { drEntries, crEntries, grandTotal, closingBalance } = data
  const len = Math.max(drEntries.length, crEntries.length, 1)
  const dr = [...drEntries, ...Array(len - drEntries.length).fill(null)]
  const cr = [...crEntries, ...Array(len - crEntries.length).fill(null)]

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-400/15 bg-cream-50 print:border-black">
      {/* Title bar */}
      <div className="border-b border-ink-400/15 bg-cream-100 py-3 text-center print:bg-white">
        <h3 className="font-heading text-base font-semibold text-ink-900">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-ink-400/10 text-xs font-medium">
              <th className="w-[11%] py-2.5 pl-4 text-left text-clay-600">Dr</th>
              <th className="py-2.5 text-left text-ink-400">Details</th>
              <th className="py-2.5 pr-3 text-right text-ink-400">LKR</th>
              <th className="w-px bg-ink-400/20 p-0" />
              <th className="w-[11%] py-2.5 pl-4 text-left text-clay-600">Cr</th>
              <th className="py-2.5 text-left text-ink-400">Details</th>
              <th className="py-2.5 pr-4 text-right text-ink-400">LKR</th>
            </tr>
          </thead>
          <tbody>
            {dr.map((drRow, i) => {
              const crRow = cr[i]
              return (
                <tr key={i} className="border-b border-ink-400/10 last:border-0">
                  {/* Dr side */}
                  <td className="py-2.5 pl-4 text-xs text-ink-400">
                    {drRow ? fmtDate(drRow.date) : ''}
                  </td>
                  <td className={`py-2.5 pr-2 ${drRow?.isBalance || drRow?.isClosing ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                    {drRow?.desc ?? ''}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-ink-700">
                    {drRow ? formatCurrency(drRow.amount) : ''}
                  </td>
                  {/* Vertical rule */}
                  <td className="w-px bg-ink-400/20 p-0" />
                  {/* Cr side */}
                  <td className="py-2.5 pl-4 text-xs text-ink-400">
                    {crRow ? fmtDate(crRow.date) : ''}
                  </td>
                  <td className={`py-2.5 pr-2 ${crRow?.isBalance || crRow?.isClosing ? 'font-semibold text-ink-900' : 'text-ink-700'}`}>
                    {crRow?.desc ?? ''}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-ink-700">
                    {crRow ? formatCurrency(crRow.amount) : ''}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            {/* Totals row — double-underline on both sides */}
            <tr className="border-t-2 border-ink-900/20 font-semibold text-ink-900">
              <td className="py-2.5 pl-4 text-xs text-ink-400" />
              <td className="py-2.5">Total</td>
              <td className="border-b-2 border-ink-900/20 py-2.5 pr-3 text-right">{formatCurrency(grandTotal)}</td>
              <td className="w-px bg-ink-400/20 p-0" />
              <td className="py-2.5 pl-4 text-xs text-ink-400" />
              <td className="py-2.5">Total</td>
              <td className="border-b-2 border-ink-900/20 py-2.5 pr-4 text-right">{formatCurrency(grandTotal)}</td>
            </tr>
            {/* Balance b/d carried forward */}
            {Math.abs(closingBalance) > 0.005 && (
              <tr className="border-t border-ink-400/10 text-ink-700">
                <td className="py-2.5 pl-4 text-xs text-ink-400" />
                <td className="py-2.5 font-semibold text-ink-900">
                  {closingBalance > 0 ? 'Balance b/d' : ''}
                </td>
                <td className="py-2.5 pr-3 text-right font-semibold text-ink-900">
                  {closingBalance > 0 ? formatCurrency(closingBalance) : ''}
                </td>
                <td className="w-px bg-ink-400/20 p-0" />
                <td className="py-2.5 pl-4 text-xs text-ink-400" />
                <td className="py-2.5 font-semibold text-ink-900">
                  {closingBalance < 0 ? 'Balance b/d' : ''}
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold text-ink-900">
                  {closingBalance < 0 ? formatCurrency(Math.abs(closingBalance)) : ''}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default function ControlAccountsReport() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { ar, ap, loading, error } = useControlAccountsReport(
    startDate || undefined,
    endDate || undefined,
  )

  const periodLabel = startDate || endDate
    ? `${startDate || 'Start'} to ${endDate || 'End'}`
    : 'All transactions'

  return (
    <div>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate('/dashboard/reports')}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
        >
          <ArrowLeft size={15} /> Reports
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
        >
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      <h1 className="mt-4 font-heading text-2xl font-semibold text-ink-900 sm:text-3xl print:hidden">
        Control Accounts
      </h1>
      <p className="mt-1 text-sm text-ink-500 print:hidden">
        T-account ledger view of Trade Receivables and Trade Payables — showing every posting with opening and closing balances.
      </p>

      {/* Date filter */}
      <div className="mt-5 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">From</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">To</label>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>
        {(startDate || endDate) && (
          <button
            onClick={() => { setStartDate(''); setEndDate('') }}
            className="text-xs text-ink-400 hover:text-ink-700"
          >
            Clear (show all)
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : (
        <PrintFrame title="Control Accounts" subtitle={periodLabel}>
          <div className="mt-6 space-y-6">
            <TAccountTable title="Trade Receivables Control Account" data={ar} />
            <TAccountTable title="Trade Payables Control Account" data={ap} />
          </div>
        </PrintFrame>
      )}
    </div>
  )
}
