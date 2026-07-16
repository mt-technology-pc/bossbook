import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Info, Download, Printer, AlertCircle, BookOpen, ArrowUpDown,
} from 'lucide-react'
import { useSalesDayBook } from '../../hooks/useSalesDayBook'
import { formatCurrency } from '../../lib/currency'
import { exportToCsv } from '../../lib/exportTable'

function firstOfMonthISO() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

const columns = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'invoiceNo', label: 'Invoice/Bill No.', sortable: true },
  { key: 'customerName', label: 'Customer Name', sortable: true },
  { key: 'description', label: 'Product/Service', sortable: false },
  { key: 'quantity', label: 'Qty', sortable: false, align: 'right' },
  { key: 'unitPrice', label: 'Unit Price', sortable: false, align: 'right' },
  { key: 'grossAmount', label: 'Gross Amount', sortable: true, align: 'right' },
  { key: 'discount', label: 'Discount', sortable: false, align: 'right' },
  { key: 'netAmount', label: 'Net Amount', sortable: true, align: 'right' },
  { key: 'depositTo', label: 'Deposit To', sortable: false },
  { key: 'amountReceived', label: 'Amount Received', sortable: false, align: 'right' },
  { key: 'outstandingBalance', label: 'Outstanding Balance', sortable: false, align: 'right' },
  { key: 'salesperson', label: 'Salesperson', sortable: false },
  { key: 'remarks', label: 'Remarks', sortable: false },
]

function compareRows(a, b, field, dir) {
  let av = a[field]
  let bv = b[field]
  if (typeof av === 'string') {
    av = av.toLowerCase()
    bv = bv.toLowerCase()
  }
  if (av < bv) return dir === 'asc' ? -1 : 1
  if (av > bv) return dir === 'asc' ? 1 : -1
  return 0
}

export default function SalesDayBookReport() {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState(firstOfMonthISO())
  const [endDate, setEndDate] = useState(todayISO())
  const [customerFilter, setCustomerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ field: 'date', dir: 'asc' })

  const {
    rows, totalSales, netSales, totalCashSales, totalCreditSales,
    totalReceived, totalOutstanding, loading, error,
  } = useSalesDayBook({ startDate, endDate })

  const filtered = rows.filter((r) => {
    if (customerFilter && r.customerName !== customerFilter) return false
    if (typeFilter && r.saleType !== typeFilter) return false
    const q = search.trim().toLowerCase()
    if (q) {
      const hay = `${r.invoiceNo} ${r.customerName} ${r.description}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => compareRows(a, b, sort.field, sort.dir))
  const customerNames = [...new Set(rows.map((r) => r.customerName))].sort()

  const toggleSort = (field) => {
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' },
    )
  }

  const handleExportCsv = () => {
    exportToCsv({
      columns: columns.map((c) => ({ key: c.key, label: c.label })),
      rows: sorted.map((r) => ({
        ...r,
        date: formatDate(r.date),
        unitPrice: r.unitPrice.toFixed(2),
        grossAmount: r.grossAmount.toFixed(2),
        discount: r.discount.toFixed(2),
        netAmount: r.netAmount.toFixed(2),
        amountReceived: r.amountReceived.toFixed(2),
        outstandingBalance: r.outstandingBalance.toFixed(2),
      })),
      filename: `sales-day-book-${startDate}-to-${endDate}.csv`,
    })
  }

  const summaryStats = [
    { label: 'Total Sales', value: totalSales },
    { label: 'Net Sales', value: netSales },
    { label: 'Total Cash Sales', value: totalCashSales },
    { label: 'Total Credit Sales', value: totalCreditSales },
    { label: 'Total Amount Received', value: totalReceived },
    { label: 'Total Outstanding Balance', value: totalOutstanding },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate('/dashboard/reports')}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600 dark:text-cream-400"
        >
          <ArrowLeft size={15} /> Reports
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600 dark:border-cream-100/15 dark:text-cream-300"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600 dark:border-cream-100/15 dark:text-cream-300"
          >
            <Printer size={13} /> Print / PDF
          </button>
        </div>
      </div>

      <h1 className="mt-4 font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
        Sales Day Book
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
        {new Date(startDate).toLocaleDateString('en-LK', { dateStyle: 'medium' })} – {new Date(endDate).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-ink-400/15 bg-cream-200/60 px-4 py-3 text-xs leading-relaxed text-ink-500 dark:border-cream-100/10 dark:bg-dark-800/60 dark:text-cream-400 print:hidden">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Each line reflects the sale as it happened, not its status today —
          invoices show the full line as outstanding at the point of sale
          since nothing was collected yet; sales receipts show the full line
          as received. Payments collected later against an invoice belong to
          Customer Balances, not here. Discount always shows as 0 (Ledgerly
          doesn&apos;t track a separate discount field — a lower price is
          simply entered directly), and Salesperson shows as &mdash; since
          staff attribution isn&apos;t tracked yet.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 print:hidden">
        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">End date</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Customer</span>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
          >
            <option value="">All customers</option>
            {customerNames.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Type</span>
          <div className="mt-1.5 flex gap-1.5">
            {[
              { value: '', label: 'All' },
              { value: 'receipt', label: 'Cash' },
              { value: 'invoice', label: 'Credit' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  typeFilter === t.value
                    ? 'border-clay-500 bg-clay-500/10 text-clay-600 dark:text-clay-400'
                    : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40 dark:border-cream-100/15 dark:text-cream-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block min-w-[160px] flex-1">
          <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Invoice, customer or item…"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
          />
        </label>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6 print:border-0 print:p-0">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
              <BookOpen size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
              No sales in this period
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Record an invoice or sales receipt to see it listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                  {columns.map((c) => (
                    <th key={c.key} className={`pb-3 pr-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.sortable ? (
                        <button
                          onClick={() => toggleSort(c.key)}
                          className={`flex items-center gap-1 hover:text-ink-700 dark:hover:text-cream-200 ${c.align === 'right' ? 'ml-auto' : ''}`}
                        >
                          {c.label}
                          <ArrowUpDown size={11} className={sort.field === c.key ? 'text-clay-500' : 'opacity-40'} />
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <motion.tr
                    key={r.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                    className="border-b border-ink-400/5 last:border-0 dark:border-cream-100/5"
                  >
                    <td className="py-2.5 pr-3 text-ink-500 dark:text-cream-400">{formatDate(r.date)}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-ink-600 dark:text-cream-300">{r.invoiceNo}</td>
                    <td className="py-2.5 pr-3 font-medium text-ink-900 dark:text-cream-50">{r.customerName}</td>
                    <td className="py-2.5 pr-3 text-ink-700 dark:text-cream-200">{r.description}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-700 dark:text-cream-200">{r.quantity}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-700 dark:text-cream-200">{formatCurrency(r.unitPrice)}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-700 dark:text-cream-200">{formatCurrency(r.grossAmount)}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-400">{formatCurrency(r.discount)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-ink-900 dark:text-cream-50">{formatCurrency(r.netAmount)}</td>
                    <td className="py-2.5 pr-3 text-ink-500 dark:text-cream-400">{r.depositTo}</td>
                    <td className="py-2.5 pr-3 text-right text-clay-600 dark:text-clay-400">{formatCurrency(r.amountReceived)}</td>
                    <td className="py-2.5 pr-3 text-right text-ink-500 dark:text-cream-400">{formatCurrency(r.outstandingBalance)}</td>
                    <td className="py-2.5 pr-3 text-ink-400">{r.salesperson}</td>
                    <td className="py-2.5 text-ink-400">{r.remarks || '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && sorted.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {summaryStats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-2xl border border-ink-400/15 bg-cream-50 p-4 dark:border-cream-100/10 dark:bg-dark-800"
            >
              <p className="text-xs text-ink-400">{s.label}</p>
              <p className="mt-1 font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
                {formatCurrency(s.value)}
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
