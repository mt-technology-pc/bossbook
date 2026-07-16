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
      .select('*, suppliers(name), purchase_items(id, product_id, quantity, unit_cost, subtotal)')
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

  const buildPayload = ({ supplierId, reference, notes, items, billDate, dueDate }) => ({
    p_supplier_id: supplierId || null,
    p_reference: reference || null,
    p_notes: notes || null,
    p_items: items,
    p_bill_date: billDate || null,
    p_due_date: dueDate || null,
  })

  const createPurchase = async (payload) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('create_purchase', buildPayload(payload))

    if (rpcError) return { error: rpcError }

    await fetchPurchases()
    return { data }
  }

  const updatePurchase = async (purchaseId, payload) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('update_purchase', {
      p_purchase_id: purchaseId,
      ...buildPayload(payload),
    })

    if (rpcError) return { error: rpcError }

    await fetchPurchases()
    return { data }
  }

  const deletePurchase = async (purchaseId) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: rpcError } = await supabase.rpc('delete_purchase', { p_purchase_id: purchaseId })
    if (!rpcError) await fetchPurchases()
    return { error: rpcError }
  }

  return {
    purchases, loading, error, createPurchase, updatePurchase, deletePurchase,
    refetch: fetchPurchases,
  }
}
