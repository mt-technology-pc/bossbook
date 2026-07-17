import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Info, Download, Printer, AlertCircle, TrendingUp,
} from 'lucide-react'
import { useIncomeStatement } from '../../hooks/useIncomeStatement'
import { formatCurrency } from '../../lib/currency'
import { exportToCsv } from '../../lib/exportTable'
import { VALUATION_METHODS } from '../../lib/inventoryValuation'

function firstOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatPercent(n) {
  return `${n.toFixed(1)}%`
}

export default function IncomeStatementReport() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [method, setMethod] = useState('fifo')

  const {
    categories, totalRevenue, totalCogs, grossProfit, grossMargin,
    expenseCategories, totalExpenses, netIncome, netMargin,
    loading, error,
  } = useIncomeStatement({ startDate, endDate, method })

  const methodLabel = VALUATION_METHODS.find((m) => m.value === method)?.label
  const hasData = totalRevenue > 0 || categories.length > 0 || totalExpenses > 0

  const handleExportCsv = () => {
    const rows = categories.map((c) => ({
      section: 'Revenue',
      category: c.category,
      revenue: c.revenue.toFixed(2),
      cogs: c.cogs.toFixed(2),
      grossProfit: c.grossProfit.toFixed(2),
    }))
    rows.push({ section: 'Revenue', category: 'TOTAL', revenue: totalRevenue.toFixed(2), cogs: totalCogs.toFixed(2), grossProfit: grossProfit.toFixed(2) })
    expenseCategories.forEach((e) => {
      rows.push({ section: 'Operating Expense', category: e.category, revenue: '', cogs: '', grossProfit: `(${e.amount.toFixed(2)})` })
    })
    rows.push({ section: 'Operating Expense', category: 'TOTAL', revenue: '', cogs: '', grossProfit: `(${totalExpenses.toFixed(2)})` })
    rows.push({ section: 'Result', category: 'Net Income', revenue: '', cogs: '', grossProfit: netIncome.toFixed(2) })

    exportToCsv({
      columns: [
        { key: 'section', label: 'Section' },
        { key: 'category', label: 'Category' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'cogs', label: 'Cost of Goods Sold' },
        { key: 'grossProfit', label: 'Amount' },
      ],
      rows,
      filename: `income-statement-${startDate}-to-${endDate}.csv`,
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate('/dashboard/reports')}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
        >
          <ArrowLeft size={15} /> Reports
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
          >
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </div>

      <h1 className="mt-4 font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
        Income Statement
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {new Date(startDate).toLocaleDateString('en-LK', { dateStyle: 'medium' })} – {new Date(endDate).toLocaleDateString('en-LK', { dateStyle: 'medium' })} · {methodLabel} · Accrual basis
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-ink-400/15 bg-cream-200/60 px-4 py-3 text-xs leading-relaxed text-ink-500 print:hidden">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Revenue is recognized when a sale is recorded (invoices count when
          issued, not when eventually paid). Cost of Goods Sold uses the
          same real cost-layer engine as the Inventory Valuation report.
          Operating expenses only include what&apos;s been recorded under
          Expenses — if something was paid outside this system, Net Income
          here won&apos;t reflect it.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 print:hidden">
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <div>
          <span className="text-xs font-medium text-ink-500">Valuation method</span>
          <div className="mt-1.5 flex gap-1.5">
            {VALUATION_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  method === m.value
                    ? 'border-clay-500 bg-clay-500/10 text-clay-600'
                    : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex justify-center py-16">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : !hasData ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-ink-400/15 bg-cream-50 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
            <TrendingUp size={20} />
          </span>
          <p className="mt-4 text-sm font-medium text-ink-600">
            Nothing recorded in this period
          </p>
          <p className="mt-1 max-w-xs text-xs text-ink-400">
            Record a sale or an expense to see them reflected here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 max-w-lg rounded-2xl border border-ink-400/15 bg-cream-50 p-6">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-ink-600">Revenue</span>
              <span className="font-heading text-lg font-semibold text-ink-900">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-ink-400/10 py-2">
              <span className="text-sm font-medium text-ink-600">Cost of Goods Sold</span>
              <span className="font-heading text-lg font-semibold text-ink-900">
                ({formatCurrency(totalCogs)})
              </span>
            </div>
            <div className="flex items-center justify-between border-t-2 border-ink-400/20 py-3">
              <span className="text-sm font-bold text-ink-900">Gross Profit</span>
              <span className="font-heading text-xl font-bold text-ink-900">
                {formatCurrency(grossProfit)}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-ink-400">Gross margin</span>
              <span className="text-xs font-medium text-ink-500">{formatPercent(grossMargin)}</span>
            </div>

            <div className="flex items-center justify-between border-t border-ink-400/10 py-2">
              <span className="text-sm font-medium text-ink-600">Operating Expenses</span>
              <span className="font-heading text-lg font-semibold text-ink-900">
                ({formatCurrency(totalExpenses)})
              </span>
            </div>

            <div className="flex items-center justify-between border-t-2 border-clay-500/40 py-3">
              <span className="text-sm font-bold text-ink-900">Net Income</span>
              <span className={`font-heading text-2xl font-bold ${netIncome >= 0 ? 'text-clay-600' : 'text-red-500'}`}>
                {formatCurrency(netIncome)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-ink-400">Net margin</span>
              <span className="text-xs font-medium text-ink-500">{formatPercent(netMargin)}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                Revenue &amp; COGS by category
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 pr-3 text-right font-medium">Revenue</th>
                      <th className="pb-3 pr-3 text-right font-medium">COGS</th>
                      <th className="pb-3 text-right font-medium">Gross Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c, i) => (
                      <motion.tr
                        key={c.category}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                        className="border-b border-ink-400/5 last:border-0"
                      >
                        <td className="py-2.5 pr-3 font-medium text-ink-900">{c.category}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{formatCurrency(c.revenue)}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-500">{formatCurrency(c.cogs)}</td>
                        <td className="py-2.5 text-right font-semibold text-ink-900">{formatCurrency(c.grossProfit)}</td>
                      </motion.tr>
                    ))}
                    {categories.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-xs text-ink-400">No sales in this period.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink-400/20 text-sm font-bold">
                      <td className="pt-3">Total</td>
                      <td className="pt-3 pr-3 text-right text-ink-900">{formatCurrency(totalRevenue)}</td>
                      <td className="pt-3 pr-3 text-right text-ink-900">{formatCurrency(totalCogs)}</td>
                      <td className="pt-3 text-right text-ink-900">{formatCurrency(grossProfit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
              <h2 className="font-heading text-lg font-semibold text-ink-900">
                Operating expenses by category
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[280px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                      <th className="pb-3 font-medium">Category</th>
                      <th className="pb-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenseCategories.map((e, i) => (
                      <motion.tr
                        key={e.category}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                        className="border-b border-ink-400/5 last:border-0"
                      >
                        <td className="py-2.5 font-medium text-ink-900">{e.category}</td>
                        <td className="py-2.5 text-right text-ink-700">{formatCurrency(e.amount)}</td>
                      </motion.tr>
                    ))}
                    {expenseCategories.length === 0 && (
                      <tr><td colSpan={2} className="py-6 text-center text-xs text-ink-400">No expenses in this period.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-ink-400/20 text-sm font-bold">
                      <td className="pt-3">Total</td>
                      <td className="pt-3 text-right text-ink-900">{formatCurrency(totalExpenses)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
