import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { withRunningBalance } from '../lib/ledger'

export function useCustomerTransactions(customerId) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTransactions = useCallback(async () => {
    if (!user || !customerId) {
      setTransactions([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('customer_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else {
      const withBalance = withRunningBalance(data ?? [], {
        debit: (t) => (t.type === 'charge' ? t.amount : 0),
        credit: (t) => (t.type === 'payment' ? t.amount : 0),
      })
      setTransactions(withBalance.reverse())
      setError(null)
    }
    setLoading(false)
  }, [user, customerId])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const addTransaction = async ({ type, amount, note }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: insertError } = await supabase
      .from('customer_transactions')
      .insert({ owner_id: user.id, customer_id: customerId, type, amount, note: note || null })

    if (insertError) return { error: insertError }

    await fetchTransactions()
    return { data: true }
  }

  const balance = transactions[0]?.balance ?? 0

  return { transactions, balance, loading, error, addTransaction, refetch: fetchTransactions }
}
