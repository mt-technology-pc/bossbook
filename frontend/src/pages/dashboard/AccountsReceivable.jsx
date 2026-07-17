import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Search, Wallet, Users, HandCoins, AlertCircle, ChevronRight,
} from 'lucide-react'
import { useCustomerBalances } from '../../hooks/useCustomerBalances'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

export default function AccountsReceivable() {
  const { balances, loading, error } = useCustomerBalances()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const owing = balances
    .filter((b) => Number(b.balance) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))

  const filtered = owing.filter((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))

  const totalReceivable = owing.reduce((sum, b) => sum + Number(b.balance), 0)

  const receiveFrom = (e, customerId) => {
    e.stopPropagation()
    navigate('/dashboard/sales/receive-payment', { state: { customerId } })
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Accounts Receivable
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Every customer who currently owes you money, and how much.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/sales/receive-payment')} variant="primary">
          <HandCoins size={16} /> Receive payment
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <Users size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">
            {owing.length}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">Customers who owe you</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <Wallet size={17} />
          </span>
          <p className="mt-3 font-heading text-2xl font-semibold text-ink-900">
            {formatCurrency(totalReceivable)}
          </p>
          <p className="mt-0.5 text-xs text-ink-400">Total receivable</p>
        </motion.div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6">
        <div className="relative max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer name…"
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
              <Wallet size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">
              {owing.length === 0 ? 'Nobody owes you right now' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              {owing.length === 0
                ? 'Every customer is settled — invoice a credit sale to see it appear here.'
                : 'Try a different search term.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 text-right font-medium">Balance owed</th>
                  <th className="pb-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <motion.tr
                    key={b.customer_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                    onClick={() => navigate(`/dashboard/customers/${b.customer_id}`)}
                    className="cursor-pointer border-b border-ink-400/10 last:border-0 hover:bg-cream-100"
                  >
                    <td className="py-3.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 text-xs font-semibold text-cream-50">
                          {b.name.charAt(0).toUpperCase()}
                        </span>
                        <p className="font-medium text-ink-900">{b.name}</p>
                      </div>
                    </td>
                    <td className="py-3.5 pr-3 text-right font-semibold text-clay-600">
                      {formatCurrency(b.balance)}
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => receiveFrom(e, b.customer_id)}
                        >
                          <HandCoins size={13} /> Receive
                        </Button>
                        <ChevronRight size={15} className="text-ink-300" />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
