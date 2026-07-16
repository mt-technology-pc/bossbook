import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Wallet, Landmark, Plus, Trash2, AlertCircle,
  ArrowDownRight, ArrowUpRight, FileText, Receipt,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAccountTransactions } from '../../hooks/useAccountTransactions'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import AddAccountTransactionModal from '../../components/dashboard/AddAccountTransactionModal'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [account, setAccount] = useState(null)
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const { transactions, loading, error, addTransaction } = useAccountTransactions(id)

  useEffect(() => {
    let cancelled = false
    setLoadingAccount(true)
    supabase
      .from('account_balances')
      .select('*')
      .eq('account_id', id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError || !data) setNotFound(true)
        else setAccount(data)
        setLoadingAccount(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleAddTransaction = async (payload) => {
    const result = await addTransaction(payload)
    if (!result.error) {
      const { data } = await supabase
        .from('account_balances')
        .select('*')
        .eq('account_id', id)
        .single()
      if (data) setAccount(data)
    }
    return result
  }

  const handleDelete = async () => {
    if (!window.confirm(`Remove account "${account.name}"? This won't undo any sales or payments already recorded.`)) return
    await supabase.from('accounts').delete().eq('id', id)
    navigate('/dashboard')
  }

  if (loadingAccount) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-medium text-ink-600 dark:text-cream-300">Account not found</p>
        <Link to="/dashboard" className="mt-4 text-sm font-medium text-clay-600 hover:text-clay-700">
          Back to overview
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Link
        to="/dashboard"
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600 dark:text-cream-400"
      >
        <ArrowLeft size={15} /> Overview
      </Link>

      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-ink-400/15 bg-cream-50 p-6 dark:border-cream-100/10 dark:bg-dark-800 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-clay-400 to-clay-600 text-cream-50">
            {account.type === 'bank' ? <Landmark size={22} /> : <Wallet size={22} />}
          </span>
          <div>
            <h1 className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50 sm:text-2xl">
              {account.name}
            </h1>
            <p className="mt-1 text-xs capitalize text-ink-400">{account.type} account</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-ink-400">Balance</p>
            <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">
              {formatCurrency(account.balance)}
            </p>
          </div>
          <Button onClick={() => setModalOpen(true)} variant="primary">
            <Plus size={16} /> Add transaction
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
            Transaction history
          </h2>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-400 hover:text-red-500"
          >
            <Trash2 size={13} /> Remove account
          </button>
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
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
              {account.type === 'bank' ? <Landmark size={20} /> : <Wallet size={20} />}
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
              No transactions yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-ink-400">
              Sales receipts and payments that deposit here will show up
              automatically, or add one manually.
            </p>
            <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-5">
              <Plus size={15} /> Add transaction
            </Button>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-ink-400/10 dark:divide-cream-100/10">
            {transactions.map((t, i) => (
              <motion.li
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.4) }}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      t.type === 'deposit'
                        ? 'bg-clay-500/10 text-clay-600 dark:text-clay-400'
                        : 'bg-ink-400/10 text-ink-500 dark:bg-cream-100/10 dark:text-cream-300'
                    }`}
                  >
                    {t.type === 'deposit' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900 dark:text-cream-50">
                      {t.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      {t.sales && (
                        <span className="flex items-center gap-1 rounded-full bg-ink-400/10 px-2 py-0.5 text-[10px] font-semibold text-ink-500 dark:bg-cream-100/10 dark:text-cream-400">
                          {t.sales.type === 'invoice' ? <FileText size={10} /> : <Receipt size={10} />}
                          {t.sales.reference || (t.sales.type === 'invoice' ? 'Invoice' : 'Receipt')}
                        </span>
                      )}
                      {t.expenses && (
                        <span className="flex items-center gap-1 rounded-full bg-ink-400/10 px-2 py-0.5 text-[10px] font-semibold text-ink-500 dark:bg-cream-100/10 dark:text-cream-400">
                          <Receipt size={10} /> {t.expenses.category}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatDate(t.created_at)}{t.note ? ` · ${t.note}` : ''}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    t.type === 'deposit'
                      ? 'text-clay-600 dark:text-clay-400'
                      : 'text-ink-700 dark:text-cream-200'
                  }`}
                >
                  {t.type === 'deposit' ? '+' : '−'}{formatCurrency(t.amount)}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      <AddAccountTransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddTransaction}
        account={account}
      />
    </div>
  )
}
