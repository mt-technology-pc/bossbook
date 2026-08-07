import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Deliberately separate from useCustomers() — a walk-in capture (see
// WalkInCustomerModal.jsx) is contact info for one receipt, not a real
// customer relationship, and must never show up in the Customers list,
// receivables totals, or customer picker dropdowns elsewhere in the app.
export function useWalkInCustomers() {
  const { user } = useAuth()
  const [walkInCustomers, setWalkInCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setWalkInCustomers([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('walk_in_customers')
      .select('*, sales(reference)')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setWalkInCustomers(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const create = async ({ saleId, name, phone, email, nic }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: insertError } = await supabase
      .from('walk_in_customers')
      .insert({ owner_id: user.id, sale_id: saleId, name, phone, email, nic })
      .select()
      .single()

    if (insertError) return { error: insertError }

    setWalkInCustomers((prev) => [data, ...prev])
    return { data }
  }

  const forSale = (saleId) => walkInCustomers.find((w) => w.sale_id === saleId) || null

  return { walkInCustomers, loading, error, create, forSale, refetch: fetchAll }
}
