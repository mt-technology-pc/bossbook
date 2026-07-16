import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Bills for a given supplier that still have a balance owed, computed
// from real payment allocations (purchase_balances view).
export function useOutstandingPurchases(supplierId) {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supplierId) {
      setPurchases([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('purchase_balances')
      .select('*')
      .eq('supplier_id', supplierId)
      .gt('outstanding', 0)
      .order('bill_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setPurchases(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [supplierId])

  return { purchases, loading }
}
