import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSuppliers() {
  const { user } = useAuth()
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSuppliers = useCallback(async () => {
    if (!user) {
      setSuppliers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setSuppliers(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const addSupplier = async (supplier) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: insertError } = await supabase
      .from('suppliers')
      .insert({ ...supplier, owner_id: user.id })
      .select()
      .single()

    if (insertError) return { error: insertError }

    setSuppliers((prev) => [data, ...prev])
    return { data }
  }

  const deleteSupplier = async (id) => {
    const { error: deleteError } = await supabase.from('suppliers').delete().eq('id', id)
    if (!deleteError) setSuppliers((prev) => prev.filter((s) => s.id !== id))
    return { error: deleteError }
  }

  return { suppliers, loading, error, addSupplier, deleteSupplier, refetch: fetchSuppliers }
}
