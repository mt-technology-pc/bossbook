import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Landmark, Wallet, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useAccounts } from '../../hooks/useAccounts'
import { formatCurrency } from '../../lib/currency'
import AddAccountModal from './AddAccountModal'

export default function AccountsPanel() {
  const { accounts, loading, addAccount, deleteAccount, totalBalance } = useAccounts()
  const [modalOpen, setModalOpen] = useState(false)
  const navigate = useNavigate()

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Remove account "${name}"? This won't undo any sales or payments already recorded.`)) return
    await deleteAccount(id)
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-400/15 bg-cream-50 p-6 dark:border-cream-100/10 dark:bg-dark-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Cash &amp; bank accounts
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-400">
            <RefreshCw size={11} /> As of today
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-ink-400">Total balance</p>
        <p className="font-heading text-3xl font-semibold text-ink-900 dark:text-cream-50">
          {formatCurrency(totalBalance)}
        </p>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : accounts.length > 0 ? (
        <ul className="mt-5 flex-1 space-y-1">
          {accounts.map((a, i) => (
            <motion.li
              key={a.account_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              onClick={() => navigate(`/dashboard/accounts/${a.account_id}`)}
              className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-cream-200 dark:hover:bg-dark-700"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
                {a.type === 'bank' ? <Landmark size={16} /> : <Wallet size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900 dark:text-cream-50">
                  {a.name}
                </p>
                <p className="text-xs capitalize text-ink-400">
                  {a.type}{a.code ? ` · ${a.code}` : ''}
                </p>
              </span>
              <span className="text-sm font-semibold text-ink-700 dark:text-cream-200">
                {formatCurrency(a.balance)}
              </span>
              <button
                onClick={(e) => handleDelete(e, a.account_id, a.name)}
                aria-label={`Remove ${a.name}`}
                className="rounded-lg p-1.5 text-ink-400 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            </motion.li>
          ))}
        </ul>
      ) : (
        <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-ink-400/25 py-10 text-center dark:border-cream-100/15">
          <Landmark size={20} className="text-ink-400" />
          <p className="mt-3 text-sm font-medium text-ink-600 dark:text-cream-300">
            No accounts connected
          </p>
          <p className="mt-1 max-w-[220px] text-xs text-ink-400">
            Add a cash or bank account to start tracking balances here.
          </p>
        </div>
      )}

      <button
        onClick={() => setModalOpen(true)}
        className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-ink-400/20 py-2.5 text-sm font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600 dark:border-cream-100/15 dark:text-cream-300"
      >
        <Plus size={15} /> Add account
      </button>

      <AddAccountModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={addAccount} />
    </div>
  )
}
