import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { computeProductValuation } from '../lib/inventoryValuation'

export function useProductLedger(productId, { asOfDate, method }) {
  const { user } = useAuth()
  const [product, setProduct] = useState(null)
  const [purchaseItems, setPurchaseItems] = useState([])
  const [saleItems, setSaleItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const fetchAll = useCallback(async () => {
    if (!user || !productId) {
      setLoading(false)
      return
    }
    setLoading(true)

    const [productRes, purchaseItemsRes, saleItemsRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase
        .from('purchase_items')
        .select('*, purchases(bill_date, reference, supplier_id)')
        .eq('product_id', productId),
      supabase
        .from('sale_items')
        .select('*, sales(sale_date, type, reference, customer_id)')
        .eq('product_id', productId),
    ])

    if (productRes.error || !productRes.data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    if (purchaseItemsRes.error) setError(purchaseItemsRes.error.message)
    else if (saleItemsRes.error) setError(saleItemsRes.error.message)
    else {
      setProduct(productRes.data)
      setPurchaseItems(purchaseItemsRes.data ?? [])
      setSaleItems(saleItemsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user, productId])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const valuation = useMemo(() => {
    if (!product) return null
    return computeProductValuation(product, purchaseItems, saleItems, { asOfDate, method })
  }, [product, purchaseItems, saleItems, asOfDate, method])

  return { product, valuation, loading, error, notFound, refetch: fetchAll }
}
