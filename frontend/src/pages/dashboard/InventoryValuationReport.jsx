import { Fragment, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Info, ArrowUpDown, Download, Printer, AlertCircle, Boxes,
} from 'lucide-react'
import { useInventoryValuation } from '../../hooks/useInventoryValuation'
import { useSuppliers } from '../../hooks/useSuppliers'
import { formatCurrency } from '../../lib/currency'
import { exportToCsv } from '../../lib/exportTable'
import { VALUATION_METHODS } from '../../lib/inventoryValuation'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const columns = [
  { key: 'itemCode', label: 'Item Code', sortable: true, align: 'left' },
  { key: 'itemName', label: 'Item Name', sortable: true, align: 'left' },
  { key: 'category', label: 'Category', sortable: true, align: 'left' },
  { key: 'quantityOnHand', label: 'Qty on Hand', sortable: true, align: 'right' },
  { key: 'unitCost', label: 'Unit Cost', sortable: true, align: 'right' },
  { key: 'totalValue', label: 'Total Value', sortable: true, align: 'right' },
  { key: 'method', label: 'Valuation Method', sortable: false, align: 'left' },
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

export default function InventoryValuationReport() {
  const navigate = useNavigate()
  const [asOfDate, setAsOfDate] = useState(todayISO())
  const [method, setMethod] = useState('fifo')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ field: 'itemName', dir: 'asc' })

  const { rows, loading, error } = useInventoryValuation({ asOfDate, method })
  const { suppliers } = useSuppliers()

  const methodLabel = VALUATION_METHODS.find((m) => m.value === method)?.label

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false
      if (supplierFilter && !r.supplierIds.has(supplierFilter)) return false
      if (q && !r.itemName.toLowerCase().includes(q) && !r.itemCode.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, categoryFilter, supplierFilter, search])

  const groups = useMemo(() => {
    const cats = [...new Set(filtered.map((r) => r.category))].sort()
    return cats.map((category) => {
      const items = filtered.filter((r) => r.category === category).sort((a, b) => compareRows(a, b, sort.field, sort.dir))
      return {
        category,
        items,
        qty: items.reduce((s, i) => s + i.quantityOnHand, 0),
        value: items.reduce((s, i) => s + i.totalValue, 0),
      }
    })
  }, [filtered, sort])

  const grandQty = filtered.reduce((s, r) => s + r.quantityOnHand, 0)
  const grandValue = filtered.reduce((s, r) => s + r.totalValue, 0)

  const toggleSort = (field) => {
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' },
    )
  }

  const exportRows = () =>
    filtered.map((r) => ({
      itemCode: r.itemCode,
      itemName: r.itemName,
      category: r.category,
      quantityOnHand: r.quantityOnHand,
      unitCost: r.unitCost.toFixed(2),
      totalValue: r.totalValue.toFixed(2),
      method: methodLabel,
    }))

  const handleExportCsv = (filename) => {
    exportToCsv({
      columns: columns.map((c) => ({ key: c.key, label: c.label })),
      rows: exportRows(),
      filename,
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
            onClick={() => handleExportCsv('inventory-valuation.csv')}
            className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={() => handleExportCsv('inventory-valuation.xls')}
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
        Inventory Valuation Summary
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        As of {new Date(asOfDate).toLocaleDateString('en-LK', { dateStyle: 'long' })} · {methodLabel}
      </p>

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-ink-400/15 bg-cream-200/60 px-4 py-3 text-xs leading-relaxed text-ink-500 print:hidden">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Quantities and costs are computed from purchases and sales actually
          recorded here — not a stored balance. Stock adjustments, transfers,
          returns, assemblies and multi-warehouse tracking aren&apos;t built
          yet, so they aren&apos;t reflected. Opening stock entered directly
          on a product (before any purchase bill) is valued at its recorded
          cost, since no earlier cost exists to draw from. Negative stock is
          already blocked at the point of sale.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 print:hidden">
        <label className="block">
          <span className="text-xs font-medium text-ink-500">As of date</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>

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

        <label className="block">
          <span className="text-xs font-medium text-ink-500">Supplier</span>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          >
            <option value="">All suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
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
              <Boxes size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              No inventory to value
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Add products and record purchases to see them here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  {columns.map((c) => (
                    <th key={c.key} className={`pb-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.sortable ? (
                        <button
                          onClick={() => toggleSort(c.key)}
                          className={`flex items-center gap-1 hover:text-ink-700 ${c.align === 'right' ? 'ml-auto' : ''}`}
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
                {groups.map((group) => (
                  <Fragment key={group.category}>
                    {group.items.map((r, i) => (
                      <motion.tr
                        key={r.productId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                        onClick={() =>
                          navigate(`/dashboard/reports/inventory-valuation/${r.productId}?asOf=${asOfDate}&method=${method}`)
                        }
                        className="cursor-pointer border-b border-ink-400/5 last:border-0 hover:bg-cream-100"
                      >
                        <td className="py-2.5 pr-3 font-mono text-xs text-ink-600">{r.itemCode}</td>
                        <td className="py-2.5 pr-3 font-medium text-ink-900">{r.itemName}</td>
                        <td className="py-2.5 pr-3 text-ink-500">{r.category}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{r.quantityOnHand}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700">{formatCurrency(r.unitCost)}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-ink-900">{formatCurrency(r.totalValue)}</td>
                        <td className="py-2.5 text-xs text-ink-400">{methodLabel}</td>
                      </motion.tr>
                    ))}
                    <tr key={`${group.category}-subtotal`} className="border-b border-ink-400/10 bg-cream-200/50 text-xs font-semibold">
                      <td className="py-2 pr-3" colSpan={3}>
                        Subtotal · {group.category}
                      </td>
                      <td className="py-2 pr-3 text-right text-ink-700">{group.qty}</td>
                      <td className="py-2 pr-3" />
                      <td className="py-2 pr-3 text-right text-ink-900">{formatCurrency(group.value)}</td>
                      <td className="py-2" />
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-400/20 text-sm font-bold">
                  <td className="pt-3 pr-3" colSpan={3}>Grand total</td>
                  <td className="pt-3 pr-3 text-right text-ink-900">{grandQty}</td>
                  <td className="pt-3 pr-3" />
                  <td className="pt-3 pr-3 text-right text-ink-900">{formatCurrency(grandValue)}</td>
                  <td className="pt-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
