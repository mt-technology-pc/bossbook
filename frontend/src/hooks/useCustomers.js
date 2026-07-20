import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCustomers() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCustomers = useCallback(async () => {
    if (!user) {
      setCustomers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setCustomers(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const addCustomer = async (customer) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: insertError } = await supabase
      .from('customers')
      .insert({ ...customer, owner_id: user.id })
      .select()
      .single()

    if (insertError) return { error: insertError }

    setCustomers((prev) => [data, ...prev])
    return { data }
  }

  const updateCustomer = async (id, fields) => {
    const { data, error: updateError } = await supabase
      .from('customers')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (updateError) return { error: updateError }

    setCustomers((prev) => prev.map((c) => (c.id === id ? data : c)))
    return { data }
  }

  const deleteCustomer = async (id) => {
    const { error: deleteError } = await supabase.from('customers').delete().eq('id', id)
    if (!deleteError) setCustomers((prev) => prev.filter((c) => c.id !== id))
    return { error: deleteError }
  }

  return { customers, loading, error, addCustomer, updateCustomer, deleteCustomer, refetch: fetchCustomers }
}
