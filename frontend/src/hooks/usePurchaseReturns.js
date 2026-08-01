import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function usePurchaseReturns() {
  const { user } = useAuth()
  const [purchaseReturns, setPurchaseReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPurchaseReturns = useCallback(async () => {
    if (!user) {
      setPurchaseReturns([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('purchase_returns')
      .select('*, suppliers(name), purchases(reference), purchase_return_items(*, products(name))')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setPurchaseReturns(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchPurchaseReturns() }, [fetchPurchaseReturns])

  const createPurchaseReturn = async ({ supplierId, purchaseId, reference, returnDate, notes, items }) => {
    if (!user) return { error: new Error('Not signed in') }
    const { data, error: rpcError } = await supabase.rpc('create_purchase_return', {
      p_supplier_id: supplierId || null,
      p_purchase_id: purchaseId || null,
      p_reference: reference || null,
      p_return_date: returnDate || null,
      p_notes: notes || null,
      p_items: items,
    })
    if (rpcError) return { error: rpcError }
    await fetchPurchaseReturns()
    return { data }
  }

  const deletePurchaseReturn = async (purchaseReturnId) => {
    if (!user) return { error: new Error('Not signed in') }
    const { error: rpcError } = await supabase.rpc('delete_purchase_return', {
      p_purchase_return_id: purchaseReturnId,
    })
    if (!rpcError) await fetchPurchaseReturns()
    return { error: rpcError }
  }

  return {
    purchaseReturns, loading, error,
    createPurchaseReturn, deletePurchaseReturn, refetch: fetchPurchaseReturns,
  }
}
