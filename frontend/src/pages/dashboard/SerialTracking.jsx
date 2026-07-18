import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Search, ScanLine, PackageCheck, PackageX, AlertCircle, Download,
} from 'lucide-react'
import { useProductUnits } from '../../hooks/useProductUnits'
import { exportToCsv } from '../../lib/exportTable'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'sold', label: 'Sold' },
]

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function SerialTracking() {
  const { units, loading, error } = useProductUnits()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')

  const products = useMemo(() => {
    const map = new Map()
    units.forEach((u) => {
      if (u.products) map.set(u.products.id, u.products.name)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [units])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return units.filter((u) => {
      if (statusFilter && u.status !== statusFilter) return false
      if (productFilter && u.products?.id !== productFilter) return false
      if (q) {
        const haystack = `${u.serial_number} ${u.products?.name ?? ''} ${u.sales?.customers?.name ?? ''} ${u.purchases?.suppliers?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [units, query, statusFilter, productFilter])

  const inStockCount = units.filter((u) => u.status === 'in_stock').length
  const soldCount = units.filter((u) => u.status === 'sold').length

  const stats = [
    { icon: ScanLine, label: 'Total units tracked', value: units.length },
    { icon: PackageCheck, label: 'In stock', value: inStockCount },
    { icon: PackageX, label: 'Sold', value: soldCount },
  ]

  const handleExportCsv = () => {
    exportToCsv({
      columns: [
        { key: 'serial', label: 'Serial / IMEI' },
        { key: 'product', label: 'Product' },
        { key: 'status', label: 'Status' },
        { key: 'purchaseRef', label: 'Purchased on bill' },
        { key: 'purchaseDate', label: 'Bill date' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'saleRef', label: 'Sold on' },
        { key: 'saleDate', label: 'Sale date' },
        { key: 'customer', label: 'Customer' },
      ],
      rows: filtered.map((u) => ({
        serial: u.serial_number,
        product: u.products?.name ?? '',
        status: u.status === 'in_stock' ? 'In stock' : 'Sold',
        purchaseRef: u.purchases?.reference ?? '',
        purchaseDate: u.purchases?.bill_date ?? '',
        supplier: u.purchases?.suppliers?.name ?? '',
        saleRef: u.sales?.reference ?? '',
        saleDate: u.sales?.sale_date ?? '',
        customer: u.sales?.customers?.name ?? '',
      })),
      filename: `serial-imei-tracking-${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Serial / IMEI Tracking
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Every individually tracked unit, where it came from, and where it went.
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600 disabled:opacity-40"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05 }}
            className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
              <s.icon size={17} />
            </span>
            <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">
              {s.value}
            </p>
            <p className="mt-0.5 text-xs text-ink-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Search</span>
          <div className="relative mt-1.5">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Serial/IMEI, product, customer or supplier…"
              className="w-72 max-w-full rounded-xl border border-ink-400/20 bg-cream-50 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Product</span>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          >
            <option value="">All products</option>
            {products.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="text-xs font-medium text-ink-500">Status</span>
          <div className="mt-1.5 flex gap-1.5">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  statusFilter === s.value
                    ? 'border-clay-500 bg-clay-500/10 text-clay-600'
                    : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
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
              <ScanLine size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {units.length === 0 ? 'No serial/IMEI units tracked yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {units.length === 0
                ? 'Turn on serial/IMEI tracking for a product, then enter serials when you record a bill for it.'
                : 'Try a different search term or filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  <th className="pb-3 font-medium">Serial / IMEI</th>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Purchased</th>
                  <th className="pb-3 font-medium">Sold to</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => {
                  const inStock = u.status === 'in_stock'
                  return (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                      className="border-b border-ink-400/5 last:border-0"
                    >
                      <td className="py-2.5 pr-3 font-mono text-xs text-ink-700">{u.serial_number}</td>
                      <td className="py-2.5 pr-3 font-medium text-ink-900">{u.products?.name ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        {inStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-clay-500/10 px-2.5 py-1 text-xs font-medium text-clay-600">
                            In stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-ink-400/10 px-2.5 py-1 text-xs font-medium text-ink-500">
                            Sold
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-ink-500">
                        {u.purchases ? (
                          <>
                            <span className="text-ink-700">{u.purchases.reference || 'Bill'}</span>
                            {' · '}{formatDate(u.purchases.bill_date)}
                            {u.purchases.suppliers?.name && <> · {u.purchases.suppliers.name}</>}
                          </>
                        ) : '—'}
                      </td>
                      <td className="py-2.5 text-ink-500">
                        {u.sales ? (
                          <>
                            <span className="text-ink-700">{u.sales.reference || (u.sales.type === 'invoice' ? 'Invoice' : 'Receipt')}</span>
                            {' · '}{formatDate(u.sales.sale_date)}
                            {u.sales.customers?.name && <> · {u.sales.customers.name}</>}
                          </>
                        ) : '—'}
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
