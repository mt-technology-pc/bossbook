import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSupplierBalances() {
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
      .from('supplier_balances')
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

  const recordPayment = async ({ supplierId, amount, note }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: insertError } = await supabase
      .from('supplier_payments')
      .insert({ owner_id: user.id, supplier_id: supplierId, amount, note: note || null })

    if (insertError) return { error: insertError }

    await fetchBalances()
    return { data: true }
  }

  const balanceFor = (supplierId) =>
    balances.find((b) => b.supplier_id === supplierId)?.balance ?? 0

  return { balances, loading, error, recordPayment, balanceFor, refetch: fetchBalances }
}
