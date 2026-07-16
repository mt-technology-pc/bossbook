import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Every purchase in this system is recorded as a credit bill — there's no
// "paid in full at the time of purchase" mode the way Sales Receipts work.
// Payment happens separately (Pay Bill) and reduces a supplier's overall
// balance rather than a specific bill, so there's no honest per-bill
// paid/outstanding split to show here. "Total paid to suppliers" instead
// reflects real payments recorded in the same period, independent of which
// bill they were against.
export function usePurchaseDayBook({ startDate, endDate }) {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [purchaseItems, setPurchaseItems] = useState([])
  const [supplierPayments, setSupplierPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setPurchases([])
      setPurchaseItems([])
      setSupplierPayments([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [purchasesRes, purchaseItemsRes, paymentsRes] = await Promise.all([
      supabase.from('purchases').select('*, suppliers(name)'),
      supabase.from('purchase_items').select('*, products(name, sku)'),
      supabase.from('supplier_payments').select('*, suppliers(name)'),
    ])

    if (purchasesRes.error) setError(purchasesRes.error.message)
    else if (purchaseItemsRes.error) setError(purchaseItemsRes.error.message)
    else if (paymentsRes.error) setError(paymentsRes.error.message)
    else {
      setPurchases(purchasesRes.data ?? [])
      setPurchaseItems(purchaseItemsRes.data ?? [])
      setSupplierPayments(paymentsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const rows = useMemo(() => {
    const purchasesInPeriod = purchases.filter(
      (p) => p.bill_date >= startDate && p.bill_date <= endDate,
    )
    const purchasesById = new Map(purchasesInPeriod.map((p) => [p.id, p]))
    const seenPurchase = new Set()

    return purchaseItems
      .filter((item) => purchasesById.has(item.purchase_id))
      .map((item) => {
        const purchase = purchasesById.get(item.purchase_id)
        const isFirstLine = !seenPurchase.has(purchase.id)
        seenPurchase.add(purchase.id)

        const grossAmount = item.quantity * Number(item.unit_cost)
        const discount = 0
        const netAmount = grossAmount - discount

        return {
          key: item.id,
          purchaseId: purchase.id,
          date: purchase.bill_date,
          billNo: purchase.reference || '—',
          supplierName: purchase.suppliers?.name || 'No supplier',
          description: item.products?.name || 'Unknown item',
          sku: item.products?.sku || '',
          quantity: item.quantity,
          unitCost: Number(item.unit_cost),
          grossAmount,
          discount,
          netAmount,
          remarks: isFirstLine ? (purchase.notes || '') : '',
        }
      })
      .sort((a, b) => {
        const diff = new Date(a.date) - new Date(b.date)
        if (diff !== 0) return diff
        return a.billNo.localeCompare(b.billNo)
      })
  }, [purchases, purchaseItems, startDate, endDate])

  const totals = useMemo(() => {
    const totalPurchases = rows.reduce((sum, r) => sum + r.grossAmount, 0)
    const netPurchases = rows.reduce((sum, r) => sum + r.netAmount, 0)
    const billCount = new Set(rows.map((r) => r.purchaseId)).size

    const totalPaidToSuppliers = supplierPayments
      .filter((p) => {
        const d = p.created_at?.slice(0, 10)
        return d >= startDate && d <= endDate
      })
      .reduce((sum, p) => sum + Number(p.amount), 0)

    return { totalPurchases, netPurchases, billCount, totalPaidToSuppliers }
  }, [rows, supplierPayments, startDate, endDate])

  return { rows, ...totals, loading, error, refetch: fetchAll }
}
