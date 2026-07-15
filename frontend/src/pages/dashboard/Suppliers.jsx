import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, Truck, Wallet, Trash2, AlertCircle, ChevronRight } from 'lucide-react'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useSupplierBalances } from '../../hooks/useSupplierBalances'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import AddSupplierModal from '../../components/suppliers/AddSupplierModal'

export default function Suppliers() {
  const { suppliers, loading, error, addSupplier, deleteSupplier } = useSuppliers()
  const { balances, balanceFor, refetch: refetchBalances } = useSupplierBalances()
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

  const filtered = suppliers.filter((s) => {
    const q = query.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    )
  })

  const totalOwed = balances.reduce((sum, b) => sum + Math.max(0, Number(b.balance)), 0)

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Remove "${name}" from your suppliers?`)) return
    await deleteSupplier(id)
  }

  const handleAddSupplier = async (payload) => {
    const result = await addSupplier(payload)
    if (!result.error) refetchBalances()
    return result
  }

  const stats = [
    { icon: Truck, label: 'Total suppliers', value: suppliers.length },
    { icon: Wallet, label: 'Total owed to suppliers', value: formatCurrency(totalOwed) },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
            Suppliers
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
            Keep track of who you buy stock from and what you owe them.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} variant="primary">
          <Plus size={16} /> Add supplier
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            placeholder="Search by name, phone or email…"
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
              <Truck size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
              {suppliers.length === 0 ? 'No suppliers yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {suppliers.length === 0
                ? 'Add your first supplier to start recording bills against them.'
                : 'Try a different search term.'}
            </p>
            {suppliers.length === 0 && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
                <Plus size={15} /> Add supplier
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                  <th className="pb-3 font-medium">Supplier</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const balance = balanceFor(s.id)
                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                      onClick={() => navigate(`/dashboard/suppliers/${s.id}`)}
                      className="cursor-pointer border-b border-ink-400/10 last:border-0 hover:bg-cream-100 dark:border-cream-100/10 dark:hover:bg-dark-700"
                    >
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 text-xs font-semibold text-cream-50">
                            {s.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-ink-900 dark:text-cream-50">{s.name}</p>
                            {s.email && <p className="text-xs text-ink-400">{s.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 text-ink-500 dark:text-cream-400">
                        {s.phone || '—'}
                      </td>
                      <td className="py-3.5 pr-3">
                        {balance > 0 ? (
                          <span className="font-medium text-clay-600 dark:text-clay-400">
                            {formatCurrency(balance)} owed
                          </span>
                        ) : (
                          <span className="text-ink-400">Settled</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDelete(e, s.id, s.name)}
                            aria-label={`Remove ${s.name}`}
                            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                          <ChevronRight size={15} className="text-ink-300 dark:text-cream-100/30" />
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSupplierModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddSupplier}
      />
    </div>
  )
}
