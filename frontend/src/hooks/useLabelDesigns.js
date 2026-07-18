import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useLabelDesigns() {
  const { user } = useAuth()
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDesigns = useCallback(async () => {
    if (!user) {
      setDesigns([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('label_designs')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setDesigns(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchDesigns()
  }, [fetchDesigns])

  const saveDesign = async (design) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: insertError } = await supabase
      .from('label_designs')
      .insert({ ...design, owner_id: user.id })
      .select()
      .single()

    if (insertError) return { error: insertError }

    setDesigns((prev) => [data, ...prev])
    return { data }
  }

  const deleteDesign = async (id) => {
    const { error: deleteError } = await supabase.from('label_designs').delete().eq('id', id)
    if (!deleteError) setDesigns((prev) => prev.filter((d) => d.id !== id))
    return { error: deleteError }
  }

  return { designs, loading, error, saveDesign, deleteDesign, refetch: fetchDesigns }
}
