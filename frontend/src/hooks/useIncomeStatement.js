import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { computeProductValuation } from '../lib/inventoryValuation'

// Revenue is recognized on an accrual basis: an invoice counts as revenue
// when issued (not when it's eventually paid), matching a sales receipt
// which is issued and paid at the same time. COGS requires the full
// purchase/sale history up to the period end to cost correctly under
// FIFO/weighted-average, so we replay everything and then sum only the
// events that fall inside [startDate, endDate]. Expenses are recorded as
// already paid, so they need no such replay.
export function useIncomeStatement({ startDate, endDate, method }) {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [purchaseItems, setPurchaseItems] = useState([])
  const [saleItems, setSaleItems] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setProducts([])
      setPurchaseItems([])
      setSaleItems([])
      setExpenses([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [productsRes, purchaseItemsRes, saleItemsRes, expensesRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('purchase_items').select('*, purchases(bill_date, reference)'),
      supabase.from('sale_items').select('*, sales(sale_date, type, reference)'),
      supabase.from('expenses').select('*'),
    ])

    if (productsRes.error) setError(productsRes.error.message)
    else if (purchaseItemsRes.error) setError(purchaseItemsRes.error.message)
    else if (saleItemsRes.error) setError(saleItemsRes.error.message)
    else if (expensesRes.error) setError(expensesRes.error.message)
    else {
      setProducts(productsRes.data ?? [])
      setPurchaseItems(purchaseItemsRes.data ?? [])
      setSaleItems(saleItemsRes.data ?? [])
      setExpenses(expensesRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const result = useMemo(() => {
    const revenueByCategory = new Map()
    let totalRevenue = 0
    let totalCogs = 0

    products.forEach((product) => {
      const pItems = purchaseItems.filter((pi) => pi.product_id === product.id)
      const sItems = saleItems.filter((si) => si.product_id === product.id)
      const inPeriod = sItems.some(
        (s) => s.sales?.sale_date >= startDate && s.sales?.sale_date <= endDate,
      )
      if (!inPeriod) return

      const valuation = computeProductValuation(product, pItems, sItems, { asOfDate: endDate, method })
      const category = product.category || 'Uncategorized'
      const bucket = revenueByCategory.get(category) ?? { category, revenue: 0, cogs: 0 }

      valuation.ledger
        .filter((e) => e.type === 'out' && e.date >= startDate && e.date <= endDate)
        .forEach((e) => {
          const revenue = e.qty * (e.unitPrice ?? 0)
          bucket.revenue += revenue
          bucket.cogs += e.cogs ?? 0
          totalRevenue += revenue
          totalCogs += e.cogs ?? 0
        })

      revenueByCategory.set(category, bucket)
    })

    const categories = [...revenueByCategory.values()]
      .map((c) => ({ ...c, grossProfit: c.revenue - c.cogs }))
      .sort((a, b) => b.revenue - a.revenue)

    const expensesInPeriod = expenses.filter(
      (e) => e.expense_date >= startDate && e.expense_date <= endDate,
    )
    const expensesByCategory = new Map()
    let totalExpenses = 0
    expensesInPeriod.forEach((e) => {
      const amount = Number(e.amount)
      totalExpenses += amount
      expensesByCategory.set(e.category, (expensesByCategory.get(e.category) ?? 0) + amount)
    })
    const expenseCategories = [...expensesByCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    const grossProfit = totalRevenue - totalCogs
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const netIncome = grossProfit - totalExpenses
    const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

    return {
      categories, totalRevenue, totalCogs, grossProfit, grossMargin,
      expenseCategories, totalExpenses, netIncome, netMargin,
    }
  }, [products, purchaseItems, saleItems, expenses, startDate, endDate, method])

  return { ...result, loading, error, refetch: fetchAll }
}
