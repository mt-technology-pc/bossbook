import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Search, ScanLine, Package, Layers, Trash2, AlertCircle, ArrowUpDown, ArrowRight,
} from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { useInventoryValuation } from '../../hooks/useInventoryValuation'
import { formatCurrency } from '../../lib/currency'
import { VALUATION_METHODS } from '../../lib/inventoryValuation'
import Button from '../../components/ui/Button'
import AddProductModal from '../../components/inventory/AddProductModal'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

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

const columns = [
  { key: 'itemCode', label: 'Item Code', sortable: true },
  { key: 'itemName', label: 'Item Name', sortable: true },
  { key: 'tracking', label: 'Tracking', sortable: false },
  { key: 'quantityOnHand', label: 'Qty on Hand', sortable: true, align: 'right' },
  { key: 'unitCost', label: 'Unit Cost', sortable: true, align: 'right' },
  { key: 'totalValue', label: 'Total Value', sortable: true, align: 'right' },
]

export default function Inventory() {
  const { products, loading, error, addProduct, deleteProduct } = useProducts()
  const [method, setMethod] = useState('fifo')
  const { rows: valuationRows, refetch: refetchValuation } = useInventoryValuation({
    asOfDate: todayISO(), method,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sort, setSort] = useState({ field: 'itemName', dir: 'asc' })
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.state?.autoOpen) {
      setModalOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const valuationMap = useMemo(() => {
    const m = new Map()
    valuationRows.forEach((r) => m.set(r.productId, r))
    return m
  }, [valuationRows])

  const merged = useMemo(
    () =>
      products.map((p) => {
        const v = valuationMap.get(p.id)
        return {
          productId: p.id,
          itemCode: p.sku || '—',
          itemName: p.name,
          category: p.category || 'Uncategorized',
          tracksSerial: p.tracks_serial,
          quantityOnHand: v?.quantityOnHand ?? p.stock_quantity,
          unitCost: v?.unitCost ?? Number(p.cost),
          totalValue: v?.totalValue ?? Number(p.cost) * p.stock_quantity,
        }
      }),
    [products, valuationMap],
  )

  const categories = useMemo(() => [...new Set(merged.map((r) => r.category))].sort(), [merged])
  const methodLabel = VALUATION_METHODS.find((m) => m.value === method)?.label

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return merged.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false
      if (q && !r.itemName.toLowerCase().includes(q) && !r.itemCode.toLowerCase().includes(q)) return false
      return true
    })
  }, [merged, categoryFilter, query])

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
  const serialTrackedCount = filtered.filter((r) => r.tracksSerial).length

  const toggleSort = (field) => {
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' },
    )
  }

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Remove "${name}" from your inventory?`)) return
    await deleteProduct(id)
    refetchValuation()
  }

  const handleAddProduct = async (payload) => {
    const result = await addProduct(payload)
    if (!result.error) refetchValuation()
    return result
  }

  const stats = [
    { icon: Package, label: 'Total products', value: filtered.length },
    { icon: Layers, label: `Total value (${methodLabel})`, value: formatCurrency(grandValue) },
    { icon: ScanLine, label: 'Serial/IMEI tracked', value: serialTrackedCount },
    { icon: Package, label: 'Standard stock', value: filtered.length - serialTrackedCount },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
            Manage your product catalog — value computed the same way as the Inventory Valuation Summary.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} variant="primary">
          <Plus size={16} /> Add product
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
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

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Search</span>
            <div className="relative mt-1.5">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or SKU…"
                className="w-full rounded-xl border border-ink-400/20 bg-cream-50 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1.5 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
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

        <button
          onClick={() => navigate('/dashboard/reports/inventory-valuation')}
          className="flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-700 dark:text-clay-400"
        >
          Full valuation report <ArrowRight size={14} />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
              <Package size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
              {products.length === 0 ? 'No products yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {products.length === 0
                ? 'Add your first product to start building your catalog.'
                : 'Try a different search term or category.'}
            </p>
            {products.length === 0 && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
                <Plus size={15} /> Add product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                  {columns.map((c) => (
                    <th key={c.key} className={`pb-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
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
                  <th className="pb-3 font-medium" />
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
                        onClick={() => navigate(`/dashboard/reports/inventory-valuation/${r.productId}?method=${method}`)}
                        className="cursor-pointer border-b border-ink-400/5 last:border-0 hover:bg-cream-100 dark:border-cream-100/5 dark:hover:bg-dark-700"
                      >
                        <td className="py-2.5 pr-3 font-mono text-xs text-ink-600 dark:text-cream-300">{r.itemCode}</td>
                        <td className="py-2.5 pr-3 font-medium text-ink-900 dark:text-cream-50">{r.itemName}</td>
                        <td className="py-2.5 pr-3">
                          {r.tracksSerial ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-clay-500/10 px-2.5 py-1 text-xs font-medium text-clay-600 dark:text-clay-400">
                              <ScanLine size={12} /> Serial/IMEI
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink-400/10 px-2.5 py-1 text-xs font-medium text-ink-500 dark:bg-cream-100/10 dark:text-cream-400">
                              Quantity
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-right text-ink-700 dark:text-cream-200">{r.quantityOnHand}</td>
                        <td className="py-2.5 pr-3 text-right text-ink-700 dark:text-cream-200">{formatCurrency(r.unitCost)}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-ink-900 dark:text-cream-50">{formatCurrency(r.totalValue)}</td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={(e) => handleDelete(e, r.productId, r.itemName)}
                            aria-label={`Remove ${r.itemName}`}
                            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                    <tr className="border-b border-ink-400/10 bg-cream-200/50 text-xs font-semibold dark:border-cream-100/10 dark:bg-dark-700/50">
                      <td className="py-2 pr-3" colSpan={3}>
                        Subtotal · {group.category}
                      </td>
                      <td className="py-2 pr-3 text-right text-ink-700 dark:text-cream-200">{group.qty}</td>
                      <td className="py-2 pr-3" />
                      <td className="py-2 pr-3 text-right text-ink-900 dark:text-cream-50">{formatCurrency(group.value)}</td>
                      <td className="py-2" />
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-400/20 text-sm font-bold dark:border-cream-100/20">
                  <td className="pt-3 pr-3" colSpan={3}>Grand total</td>
                  <td className="pt-3 pr-3 text-right text-ink-900 dark:text-cream-50">{grandQty}</td>
                  <td className="pt-3 pr-3" />
                  <td className="pt-3 pr-3 text-right text-ink-900 dark:text-cream-50">{formatCurrency(grandValue)}</td>
                  <td className="pt-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <AddProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddProduct}
      />
    </div>
  )
}
