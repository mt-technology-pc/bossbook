import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSupplierLedger(supplierId) {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLedger = useCallback(async () => {
    if (!user || !supplierId) {
      setPurchases([])
      setPayments([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [purchasesRes, paymentsRes] = await Promise.all([
      supabase
        .from('purchases')
        .select('*, purchase_items(id, quantity, unit_cost, subtotal)')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false }),
      supabase
        .from('supplier_payments')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false }),
    ])

    if (purchasesRes.error) setError(purchasesRes.error.message)
    else if (paymentsRes.error) setError(paymentsRes.error.message)
    else {
      setPurchases(purchasesRes.data ?? [])
      setPayments(paymentsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user, supplierId])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  const addPayment = async ({ amount, note }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: insertError } = await supabase
      .from('supplier_payments')
      .insert({ owner_id: user.id, supplier_id: supplierId, amount, note: note || null })

    if (insertError) return { error: insertError }

    await fetchLedger()
    return { data: true }
  }

  const totalBilled = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const balance = totalBilled - totalPaid

  const ledger = [
    ...purchases.map((p) => ({
      kind: 'bill',
      id: p.id,
      date: p.created_at,
      amount: Number(p.total_amount),
      reference: p.reference,
      notes: p.notes,
      items: p.purchase_items,
    })),
    ...payments.map((p) => ({
      kind: 'payment',
      id: p.id,
      date: p.created_at,
      amount: Number(p.amount),
      note: p.note,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date))

  return {
    ledger, totalBilled, totalPaid, balance, loading, error, addPayment,
    refetch: fetchLedger,
  }
}
