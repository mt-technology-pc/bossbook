import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Info, Download, Printer, AlertCircle, TrendingUp,
} from 'lucide-react'
import { useGainLossReport } from '../../hooks/useGainLossReport'
import { formatCurrency } from '../../lib/currency'
import { exportToCsv } from '../../lib/exportTable'
import { periodRange } from '../../lib/dateBuckets'
import { VALUATION_METHODS } from '../../lib/inventoryValuation'

const PERIOD_PRESETS = [
  { value: 'month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
]

function formatPercent(n) {
  return `${n.toFixed(1)}%`
}

const columns = [
  { key: 'category', label: 'Category' },
  { key: 'itemNo', label: 'Item No' },
  { key: 'itemName', label: 'Item Name' },
  { key: 'qtySold', label: 'Qty Sold' },
  { key: 'avgSalePrice', label: 'Avg Sale Price' },
  { key: 'avgUnitCost', label: 'Avg Cost' },
  { key: 'salesVal', label: 'Sales Value' },
  { key: 'costVal', label: 'Cost Value' },
  { key: 'gainLoss', label: 'Gain/Loss' },
  { key: 'pctOfCost', label: 'Gain % (of Cost)' },
  { key: 'pctOfSales', label: 'Gain % (of Sales)' },
  { key: 'shareOfTotal', label: 'Share of Total Gain/Loss' },
]

export default function GainLossReport() {
  const navigate = useNavigate()
  const [preset, setPreset] = useState('month')
  const [customStart, setCustomStart] = useState(periodRange('month')[0])
  const [customEnd, setCustomEnd] = useState(periodRange('month')[1])
  const [method, setMethod] = useState('fifo')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')

  const [startDate, endDate] = preset === 'custom' ? [customStart, customEnd] : periodRange(preset === 'all' ? 'all' : preset)

  const { rows, loading, error } = useGainLossReport({ startDate, endDate, method })

  const methodLabel = VALUATION_METHODS.find((m) => m.value === method)?.label

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false
      if (q && !r.itemName.toLowerCase().includes(q) && !r.itemNo.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, categoryFilter, search])

  const grandSalesVal = filtered.reduce((s, r) => s + r.salesVal, 0)
  const grandCostVal = filtered.reduce((s, r) => s + r.costVal, 0)
  const grandGainLoss = filtered.reduce((s, r) => s + r.gainLoss, 0)
  const grandPctOfCost = grandCostVal > 0 ? (grandGainLoss / grandCostVal) * 100 : 0
  const grandPctOfSales = grandSalesVal > 0 ? (grandGainLoss / grandSalesVal) * 100 : 0

  const groups = useMemo(() => {
    const cats = [...new Set(filtered.map((r) => r.category))].sort()
    return cats.map((category) => {
      const items = filtered.filter((r) => r.category === category).sort((a, b) => b.gainLoss - a.gainLoss)
      const salesVal = items.reduce((s, i) => s + i.salesVal, 0)
      const costVal = items.reduce((s, i) => s + i.costVal, 0)
      const gainLoss = items.reduce((s, i) => s + i.gainLoss, 0)
      return {
        category,
        items,
        salesVal,
        costVal,
        gainLoss,
        pctOfCost: costVal > 0 ? (gainLoss / costVal) * 100 : 0,
        pctOfSales: salesVal > 0 ? (gainLoss / salesVal) * 100 : 0,
      }
    })
  }, [filtered])

  const shareOfTotal = (gainLoss) => (grandGainLoss !== 0 ? (gainLoss / grandGainLoss) * 100 : 0)

  const exportRows = () =>
    filtered.map((r) => ({
      category: r.category,
      itemNo: r.itemNo,
      itemName: r.itemName,
      qtySold: r.qtySold,
      avgSalePrice: r.avgSalePrice.toFixed(2),
      avgUnitCost: r.avgUnitCost.toFixed(2),
      salesVal: r.salesVal.toFixed(2),
      costVal: r.costVal.toFixed(2),
      gainLoss: r.gainLoss.toFixed(2),
      pctOfCost: formatPercent(r.pctOfCost),
      pctOfSales: formatPercent(r.pctOfSales),
      shareOfTotal: formatPercent(shareOfTotal(r.gainLoss)),
    }))

  const handleExportCsv = (filename) => {
    exportToCsv({ columns, rows: exportRows(), filename })
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
            onClick={() => handleExportCsv('gain-and-loss.csv')}
            className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => handleExportCsv('gain-and-loss.xls')}
            className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
          >
            <Download size={13} /> Excel
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
        Gain and Loss Report
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {startDate ? new Date(startDate).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : 'All time'}
        {endDate ? ` – ${new Date(endDate).toLocaleDateString('en-LK', { dateStyle: 'medium' })}` : ''} · {methodLabel}
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-ink-400/15 bg-cream-200/60 px-4 py-3 text-xs leading-relaxed text-ink-500 print:hidden">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Cost Value uses the same cost-layer engine (FIFO, weighted average, or standard cost)
          as the Inventory Valuation and Income Statement reports, so the grand total here
          reconciles with Income Statement&apos;s gross profit for the same period and method.
          Only products sold in the selected period are listed.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <span className="text-xs font-medium text-ink-500">Period</span>
          <div className="mt-1.5 flex gap-1.5">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  preset === p.value ? 'border-clay-500 bg-clay-500/10 text-clay-600' : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {preset === 'custom' && (
          <>
            <label className="block">
              <span className="text-xs font-medium text-ink-500">From</span>
              <input
                type="date"
                value={customStart || ''}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-500">To</span>
              <input
                type="date"
                value={customEnd || ''}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </label>
          </>
        )}

        <label className="block">
          <span className="text-xs font-medium text-ink-500">Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="block flex-1 min-w-[160px]">
          <span className="text-xs font-medium text-ink-500">Search item</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or code…"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
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
                  method === m.value ? 'border-clay-500 bg-clay-500/10 text-clay-600' : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6 print:border-0 print:p-0">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
              <TrendingUp size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              No sales in this period
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Nothing was sold in the selected date range, so there&apos;s no gain or loss to show.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  {columns.map((c) => (
                    <th key={c.key} className={`pb-3 font-medium ${c.key !== 'category' && c.key !== 'itemNo' && c.key !== 'itemName' ? 'text-right' : ''}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.category}>
                    {group.items.map((r, i) => (
                      <motion.tr
                        key={r.productId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                        className="border-b border-ink-400/5 last:border-0 hover:bg-cream-100"
                      >
                        <td className="py-2.5 pr-3 text-ink-500">{r.category}</td>
                        <td className="py-2.5 pr-3 font-mono text-xs text-ink-600">{r.itemNo}</td>
                        <td className="py-2.5 pr-3 font-medium text-ink-900">{r.itemName}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{r.qtySold}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{formatCurrency(r.avgSalePrice)}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{formatCurrency(r.avgUnitCost)}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{formatCurrency(r.salesVal)}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{formatCurrency(r.costVal)}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-ink-900">{formatCurrency(r.gainLoss)}</td>
                        <td className="py-2.5 pr-3 text-right text-clay-600">{formatPercent(r.pctOfCost)}</td>
                        <td className="py-2.5 pr-3 text-right text-clay-600">{formatPercent(r.pctOfSales)}</td>
                        <td className="py-2.5 text-right text-ink-500">{formatPercent(shareOfTotal(r.gainLoss))}</td>
                      </motion.tr>
                    ))}
                    <tr className="border-b border-ink-400/10 bg-cream-200/50 text-xs font-semibold">
                      <td className="py-2 pr-3" colSpan={6}>
                        Total Gain/Loss for {group.category}
                      </td>
                      <td className="py-2 pr-3 text-right text-ink-700">{formatCurrency(group.salesVal)}</td>
                      <td className="py-2 pr-3 text-right text-ink-700">{formatCurrency(group.costVal)}</td>
                      <td className="py-2 pr-3 text-right text-ink-900">{formatCurrency(group.gainLoss)}</td>
                      <td className="py-2 pr-3 text-right text-clay-600">{formatPercent(group.pctOfCost)}</td>
                      <td className="py-2 pr-3 text-right text-clay-600">{formatPercent(group.pctOfSales)}</td>
                      <td className="py-2 text-right text-ink-500">{formatPercent(shareOfTotal(group.gainLoss))}</td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-400/20 text-sm font-bold">
                  <td className="pt-3 pr-3" colSpan={6}>Grand total</td>
                  <td className="pt-3 pr-3 text-right text-ink-900">{formatCurrency(grandSalesVal)}</td>
                  <td className="pt-3 pr-3 text-right text-ink-900">{formatCurrency(grandCostVal)}</td>
                  <td className="pt-3 pr-3 text-right text-ink-900">{formatCurrency(grandGainLoss)}</td>
                  <td className="pt-3 pr-3 text-right text-ink-900">{formatPercent(grandPctOfCost)}</td>
                  <td className="pt-3 pr-3 text-right text-ink-900">{formatPercent(grandPctOfSales)}</td>
                  <td className="pt-3 text-right text-ink-900">100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
