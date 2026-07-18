import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSalesReps() {
  const { user } = useAuth()
  const [salesReps, setSalesReps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSalesReps = useCallback(async () => {
    if (!user) {
      setSalesReps([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('sales_reps')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setSalesReps(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSalesReps()
  }, [fetchSalesReps])

  const addSalesRep = async (rep) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: insertError } = await supabase
      .from('sales_reps')
      .insert({ ...rep, owner_id: user.id })
      .select()
      .single()

    if (insertError) return { error: insertError }

    setSalesReps((prev) => [data, ...prev])
    return { data }
  }

  const deleteSalesRep = async (id) => {
    const { error: deleteError } = await supabase.from('sales_reps').delete().eq('id', id)
    if (!deleteError) setSalesReps((prev) => prev.filter((r) => r.id !== id))
    return { error: deleteError }
  }

  return { salesReps, loading, error, addSalesRep, deleteSalesRep, refetch: fetchSalesReps }
}
