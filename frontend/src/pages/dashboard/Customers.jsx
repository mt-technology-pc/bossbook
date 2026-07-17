import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, Contact, Wallet, Trash2, AlertCircle, ChevronRight } from 'lucide-react'
import { useCustomers } from '../../hooks/useCustomers'
import { useCustomerBalances } from '../../hooks/useCustomerBalances'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import AddCustomerModal from '../../components/customers/AddCustomerModal'

export default function Customers() {
  const { customers, loading, error, addCustomer, deleteCustomer } = useCustomers()
  const { balances, balanceFor, refetch: refetchBalances } = useCustomerBalances()
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

  const filtered = customers.filter((c) => {
    const q = query.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  const totalOwedToYou = balances.reduce((sum, b) => sum + Math.max(0, Number(b.balance)), 0)

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Remove "${name}" from your customers?`)) return
    await deleteCustomer(id)
  }

  const handleAddCustomer = async (payload) => {
    const result = await addCustomer(payload)
    if (!result.error) refetchBalances()
    return result
  }

  const stats = [
    { icon: Contact, label: 'Total customers', value: customers.length },
    { icon: Wallet, label: 'Total owed to you', value: formatCurrency(totalOwedToYou) },
  ]

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Customers
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Keep track of who you sell to and what they owe you.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} variant="primary">
          <Plus size={16} /> Add customer
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, phone or email…"
            className="w-full rounded-xl border border-ink-400/20 bg-cream-100 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
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
              <Contact size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {customers.length === 0 ? 'No customers yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {customers.length === 0
                ? 'Add your first customer to start keeping track of who you sell to.'
                : 'Try a different search term.'}
            </p>
            {customers.length === 0 && (
              <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
                <Plus size={15} /> Add customer
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  <th className="pb-3 font-medium">Code</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Balance</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const balance = balanceFor(c.id)
                  return (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                      onClick={() => navigate(`/dashboard/customers/${c.id}`)}
                      className="cursor-pointer border-b border-ink-400/10 last:border-0 hover:bg-cream-100"
                    >
                      <td className="py-3.5 pr-3 font-mono text-xs text-ink-400">
                        {c.code || '—'}
                      </td>
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 text-xs font-semibold text-cream-50">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-medium text-ink-900">{c.name}</p>
                            {c.email && <p className="text-xs text-ink-400">{c.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 text-ink-500">
                        {c.phone || '—'}
                      </td>
                      <td className="py-3.5 pr-3">
                        {balance > 0 ? (
                          <span className="font-medium text-clay-600">
                            {formatCurrency(balance)} owed
                          </span>
                        ) : balance < 0 ? (
                          <span className="font-medium text-ink-500">
                            {formatCurrency(Math.abs(balance))} credit
                          </span>
                        ) : (
                          <span className="text-ink-400">Settled</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDelete(e, c.id, c.name)}
                            aria-label={`Remove ${c.name}`}
                            className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                          <ChevronRight size={15} className="text-ink-300" />
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

      <AddCustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddCustomer}
      />
    </div>
  )
}
