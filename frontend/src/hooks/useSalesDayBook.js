import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// A day book records each sale as it happened, not its current status.
// A credit sale (invoice) is 0 received / fully outstanding at the moment
// of sale — later payments belong to Customer Balances, not here. Because
// of that framing, Amount Received and Outstanding Balance are genuinely
// correct per line item and safely additive (no double-counting risk),
// unlike a "current balance" figure would be.
export function useSalesDayBook({ startDate, endDate }) {
  const { user } = useAuth()
  const [sales, setSales] = useState([])
  const [saleItems, setSaleItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setSales([])
      setSaleItems([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [salesRes, saleItemsRes] = await Promise.all([
      supabase.from('sales').select('*, customers(name), accounts(name, type)'),
      supabase.from('sale_items').select('*, products(name, sku)'),
    ])

    if (salesRes.error) setError(salesRes.error.message)
    else if (saleItemsRes.error) setError(saleItemsRes.error.message)
    else {
      setSales(salesRes.data ?? [])
      setSaleItems(saleItemsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const rows = useMemo(() => {
    const salesInPeriod = sales.filter(
      (s) => s.sale_date >= startDate && s.sale_date <= endDate,
    )
    const salesById = new Map(salesInPeriod.map((s) => [s.id, s]))
    const seenSale = new Set()

    return saleItems
      .filter((item) => salesById.has(item.sale_id))
      .map((item) => {
        const sale = salesById.get(item.sale_id)
        const isFirstLine = !seenSale.has(sale.id)
        seenSale.add(sale.id)

        const grossAmount = item.quantity * Number(item.unit_price)
        const discount = 0
        const netAmount = grossAmount - discount
        const isReceipt = sale.type === 'receipt'

        return {
          key: item.id,
          saleId: sale.id,
          saleType: sale.type,
          date: sale.sale_date,
          invoiceNo: sale.reference || '—',
          customerName: sale.customers?.name || 'Walk-in customer',
          description: item.products?.name || 'Unknown item',
          sku: item.products?.sku || '',
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          grossAmount,
          discount,
          netAmount,
          depositTo: isReceipt ? (sale.accounts?.name || '—') : '—',
          amountReceived: isReceipt ? netAmount : 0,
          outstandingBalance: isReceipt ? 0 : netAmount,
          salesperson: '—',
          remarks: isFirstLine ? (sale.notes || '') : '',
        }
      })
      .sort((a, b) => {
        const diff = new Date(a.date) - new Date(b.date)
        if (diff !== 0) return diff
        return a.invoiceNo.localeCompare(b.invoiceNo)
      })
  }, [sales, saleItems, startDate, endDate])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.totalSales += r.grossAmount
        acc.netSales += r.netAmount
        acc.totalCashSales += r.saleType === 'receipt' ? r.netAmount : 0
        acc.totalCreditSales += r.saleType === 'invoice' ? r.netAmount : 0
        acc.totalReceived += r.amountReceived
        acc.totalOutstanding += r.outstandingBalance
        return acc
      },
      {
        totalSales: 0, netSales: 0, totalCashSales: 0, totalCreditSales: 0,
        totalReceived: 0, totalOutstanding: 0,
      },
    )
  }, [rows])

  return { rows, ...totals, loading, error, refetch: fetchAll }
}
