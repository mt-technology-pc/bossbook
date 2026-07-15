import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCustomerBalances() {
  const { user } = useAuth()
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBalances = useCallback(async () => {
    if (!user) {
      setBalances([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('customer_balances')
      .select('*')

    if (fetchError) setError(fetchError.message)
    else {
      setBalances(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  const recordTransaction = async ({ customerId, type, amount, note }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: insertError } = await supabase
      .from('customer_transactions')
      .insert({ owner_id: user.id, customer_id: customerId, type, amount, note: note || null })

    if (insertError) return { error: insertError }

    await fetchBalances()
    return { data: true }
  }

  const balanceFor = (customerId) =>
    balances.find((b) => b.customer_id === customerId)?.balance ?? 0

  return { balances, loading, error, recordTransaction, balanceFor, refetch: fetchBalances }
}
