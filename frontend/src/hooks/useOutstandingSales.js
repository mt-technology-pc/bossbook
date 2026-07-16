import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Invoices/receipts for a given customer that still have a balance owed,
// computed from real payment allocations (sale_balances view).
export function useOutstandingSales(customerId) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!customerId) {
      setSales([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('sale_balances')
      .select('*')
      .eq('customer_id', customerId)
      .gt('outstanding', 0)
      .order('sale_date', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setSales(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  return { sales, loading }
}
