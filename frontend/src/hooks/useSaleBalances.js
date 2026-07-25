import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Real per-sale paid/outstanding amounts (sale_balances view, computed from
// actual linked payments) keyed by sale_id, for printable documents that
// need to show whether a customer has settled the amount.
export function useSaleBalances() {
  const { user } = useAuth()
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchBalances = useCallback(async () => {
    if (!user) {
      setBalances({})
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('sale_balances').select('sale_id, paid_amount, outstanding')
    const map = {}
    for (const row of data ?? []) {
      map[row.sale_id] = { paidAmount: Number(row.paid_amount), outstanding: Number(row.outstanding) }
    }
    setBalances(map)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  return { balances, loading, refetch: fetchBalances }
}
