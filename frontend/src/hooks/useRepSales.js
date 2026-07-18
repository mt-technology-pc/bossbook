import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Every sale that's attributed to a rep, just the fields needed to filter
// by date range and total up per rep — powers the Sales Reps list page's
// period filter without needing a new SQL view per granularity.
export function useRepSales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSales = useCallback(async () => {
    if (!user) {
      setSales([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('sales')
      .select('id, sales_rep_id, sale_date, total_amount')
      .not('sales_rep_id', 'is', null)
      .order('sale_date', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setSales(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSales()
  }, [fetchSales])

  return { sales, loading, error, refetch: fetchSales }
}
