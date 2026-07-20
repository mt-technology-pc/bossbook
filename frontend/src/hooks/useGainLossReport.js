import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { computeProductValuation } from '../lib/inventoryValuation'

// Per-product realized gain/loss over a date range: replays each product's
// full purchase/sale history through the same cost-layer engine Inventory
// Valuation and Income Statement already use, then sums only the sale
// events that fall inside [startDate, endDate] — so this report's totals
// stay reconcilable with Income Statement's gross profit for the same
// period/method rather than deriving cost a second, divergent way.
export function useGainLossReport({ startDate, endDate, method }) {
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
      supabase.from('purchase_items').select('*, purchases(bill_date, reference)'),
      supabase.from('sale_items').select('*, sales(sale_date, type, reference)'),
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
    const asOfDate = endDate || new Date().toISOString().slice(0, 10)
    const inRange = (date) => (!startDate || date >= startDate) && (!endDate || date <= endDate)

    const result = []
    products.forEach((product) => {
      const pItems = purchaseItems.filter((pi) => pi.product_id === product.id)
      const sItems = saleItems.filter((si) => si.product_id === product.id)
      const valuation = computeProductValuation(product, pItems, sItems, { asOfDate, method })

      let qtySold = 0
      let salesVal = 0
      let costVal = 0
      valuation.ledger
        .filter((e) => e.type === 'out' && inRange(e.date))
        .forEach((e) => {
          qtySold += e.qty
          salesVal += e.qty * (e.unitPrice ?? 0)
          costVal += e.cogs ?? 0
        })

      if (qtySold === 0) return

      const gainLoss = salesVal - costVal
      result.push({
        productId: product.id,
        itemNo: product.sku || '—',
        itemName: product.name,
        category: product.category || 'Uncategorized',
        qtySold,
        avgSalePrice: salesVal / qtySold,
        avgUnitCost: costVal / qtySold,
        salesVal,
        costVal,
        gainLoss,
        pctOfCost: costVal > 0 ? (gainLoss / costVal) * 100 : 0,
        pctOfSales: salesVal > 0 ? (gainLoss / salesVal) * 100 : 0,
      })
    })

    return result
  }, [products, purchaseItems, saleItems, startDate, endDate, method])

  return { rows, loading, error, refetch: fetchAll }
}
