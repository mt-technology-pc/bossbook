import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setTransactions(data ?? [])
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

  const balance = transactions.reduce(
    (sum, t) => sum + (t.type === 'charge' ? Number(t.amount) : -Number(t.amount)),
    0,
  )

  return { transactions, balance, loading, error, addTransaction, refetch: fetchTransactions }
}
