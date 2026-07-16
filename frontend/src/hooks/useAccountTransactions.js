import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { withRunningBalance } from '../lib/ledger'

export function useAccountTransactions(accountId) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTransactions = useCallback(async () => {
    if (!user || !accountId) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [txRes, accRes] = await Promise.all([
      supabase
        .from('account_transactions')
        .select('*, sales(type, reference), expenses(category, description)')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true }),
      supabase.from('accounts').select('opening_balance').eq('id', accountId).single(),
    ])

    if (txRes.error) setError(txRes.error.message)
    else {
      const withBalance = withRunningBalance(txRes.data ?? [], {
        debit: (t) => (t.type === 'deposit' ? t.amount : 0),
        credit: (t) => (t.type === 'withdrawal' ? t.amount : 0),
        opening: accRes.data?.opening_balance ?? 0,
      })
      setTransactions(withBalance.reverse())
      setError(null)
    }
    setLoading(false)
  }, [user, accountId])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async ({ type, amount, note }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: insertError } = await supabase
      .from('account_transactions')
      .insert({ owner_id: user.id, account_id: accountId, type, amount, note: note || null })

    if (insertError) return { error: insertError }

    await fetchTransactions()
    return { data: true }
  }

  return { transactions, loading, error, addTransaction, refetch: fetchTransactions }
}
