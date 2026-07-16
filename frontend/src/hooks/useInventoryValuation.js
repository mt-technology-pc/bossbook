import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { computeProductValuation } from '../lib/inventoryValuation'

export function useInventoryValuation({ asOfDate, method }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [purchaseItems, setPurchaseItems] = useState([])
  const [saleItems, setSaleItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setProducts([])
      setPurchaseItems([])
      setSaleItems([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [productsRes, purchaseItemsRes, saleItemsRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('purchase_items').select('*, purchases(bill_date, reference, supplier_id)'),
      supabase.from('sale_items').select('*, sales(sale_date, type, reference, customer_id)'),
    ])

    if (productsRes.error) setError(productsRes.error.message)
    else if (purchaseItemsRes.error) setError(purchaseItemsRes.error.message)
    else if (saleItemsRes.error) setError(saleItemsRes.error.message)
    else {
      setProducts(productsRes.data ?? [])
      setPurchaseItems(purchaseItemsRes.data ?? [])
      setSaleItems(saleItemsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const rows = useMemo(() => {
    return products.map((product) => {
      const pItems = purchaseItems.filter((pi) => pi.product_id === product.id)
      const sItems = saleItems.filter((si) => si.product_id === product.id)
      const valuation = computeProductValuation(product, pItems, sItems, { asOfDate, method })

      const supplierIds = new Set(pItems.map((pi) => pi.purchases?.supplier_id).filter(Boolean))

      return {
        productId: product.id,
        itemCode: product.sku || '—',
        itemName: product.name,
        category: product.category || 'Uncategorized',
        quantityOnHand: valuation.qtyOnHand,
        unitCost: valuation.unitCost,
        totalValue: valuation.totalValue,
        supplierIds,
      }
    })
  }, [products, purchaseItems, saleItems, asOfDate, method])

  return { rows, loading, error, refetch: fetchAll }
}
