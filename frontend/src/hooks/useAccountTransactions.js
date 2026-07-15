import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
    const { data, error: fetchError } = await supabase
      .from('account_transactions')
      .select('*, sales(type, reference)')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setTransactions(data ?? [])
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
