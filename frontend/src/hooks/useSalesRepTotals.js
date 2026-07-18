import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSalesRepTotals() {
  const { user } = useAuth()
  const [totals, setTotals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTotals = useCallback(async () => {
    if (!user) {
      setTotals([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('sales_rep_totals')
      .select('*')
      .order('total_sales', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setTotals(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchTotals()
  }, [fetchTotals])

  return { totals, loading, error, refetch: fetchTotals }
}
