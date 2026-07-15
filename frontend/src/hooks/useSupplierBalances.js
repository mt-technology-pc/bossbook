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

  const balanceFor = (supplierId) =>
    balances.find((b) => b.supplier_id === supplierId)?.balance ?? 0

  return { balances, loading, error, balanceFor, refetch: fetchBalances }
}
