import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSales() {
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
      .select('*, customers(name), accounts(name, type), sale_items(id, product_id, quantity, unit_price, subtotal)')
      .order('created_at', { ascending: false })

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

  const buildPayload = ({ customerId, type, reference, notes, saleDate, dueDate, depositAccountId, items }) => ({
    p_customer_id: customerId || null,
    p_type: type,
    p_reference: reference || null,
    p_notes: notes || null,
    p_sale_date: saleDate || null,
    p_due_date: dueDate || null,
    p_deposit_account_id: depositAccountId || null,
    p_items: items,
  })

  const createSale = async (payload) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('create_sale', buildPayload(payload))

    if (rpcError) return { error: rpcError }

    await fetchSales()
    return { data }
  }

  const updateSale = async (saleId, payload) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('update_sale', {
      p_sale_id: saleId,
      ...buildPayload(payload),
    })

    if (rpcError) return { error: rpcError }

    await fetchSales()
    return { data }
  }

  const deleteSale = async (saleId) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: rpcError } = await supabase.rpc('delete_sale', { p_sale_id: saleId })
    if (!rpcError) await fetchSales()
    return { error: rpcError }
  }

  return { sales, loading, error, createSale, updateSale, deleteSale, refetch: fetchSales }
}
