import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Search, ScanLine, Package, Layers, Trash2, AlertCircle,
} from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import AddProductModal from '../../components/inventory/AddProductModal'

export default function Inventory() {
  const { products, loading, error, addProduct, deleteProduct } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.state?.autoOpen) {
      setModalOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = products.filter((p) => {
    const q = query.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
  })

  const serialTrackedCount = products.filter((p) => p.tracks_serial).length
  const totalStockValue = products.reduce((sum, p) => sum + p.price * p.stock_quantity, 0)

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from your inventory?`)) return
    await deleteProduct(id)
  }

  const stats = [
    { icon: Package, label: 'Total products', value: products.length },
    { icon: Layers, label: 'Stock value', value: formatCurrency(totalStockValue) },
    { icon: ScanLine, label: 'Serial/IMEI tracked', value: serialTrackedCount },
    { icon: Package, label: 'Standard stock', value: products.length - serialTrackedCount },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
            Inventory
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
            Manage your product catalog and serial-tracked stock.
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

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full rounded-xl border border-ink-400/20 bg-cream-100 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
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
                : 'Try a different search term.'}
            </p>
            {products.length === 0 && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
                <Plus size={15} /> Add product
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Tracking</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">Stock</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    className="border-b border-ink-400/10 last:border-0 dark:border-cream-100/10"
                  >
                    <td className="py-3.5 pr-3">
                      <p className="font-medium text-ink-900 dark:text-cream-50">{p.name}</p>
                      {p.sku && <p className="text-xs text-ink-400">SKU: {p.sku}</p>}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-500 dark:text-cream-400">
                      {p.category || '—'}
                    </td>
                    <td className="py-3.5 pr-3">
                      {p.tracks_serial ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-clay-500/10 px-2.5 py-1 text-xs font-medium text-clay-600 dark:text-clay-400">
                          <ScanLine size={12} /> Serial/IMEI
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ink-400/10 px-2.5 py-1 text-xs font-medium text-ink-500 dark:bg-cream-100/10 dark:text-cream-400">
                          Quantity
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pr-3 font-medium text-ink-700 dark:text-cream-200">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="py-3.5 pr-3 text-ink-700 dark:text-cream-200">
                      {p.stock_quantity}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        aria-label={`Remove ${p.name}`}
                        className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={addProduct}
      />
    </div>
  )
}
