import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function usePurchases() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPurchases = useCallback(async () => {
    if (!user) {
      setPurchases([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('purchases')
      .select('*, suppliers(name), purchase_items(id, quantity, unit_cost, subtotal)')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setPurchases(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  const createPurchase = async ({ supplierId, reference, notes, items, billDate, dueDate }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('create_purchase', {
      p_supplier_id: supplierId || null,
      p_reference: reference || null,
      p_notes: notes || null,
      p_items: items,
      p_bill_date: billDate || null,
      p_due_date: dueDate || null,
    })

    if (rpcError) return { error: rpcError }

    await fetchPurchases()
    return { data }
  }

  return { purchases, loading, error, createPurchase, refetch: fetchPurchases }
}
