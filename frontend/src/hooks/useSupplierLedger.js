import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { withRunningBalance } from '../lib/ledger'

export function useSupplierLedger(supplierId) {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState([])
  const [payments, setPayments] = useState([])
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLedger = useCallback(async () => {
    if (!user || !supplierId) {
      setPurchases([])
      setPayments([])
      setReturns([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [purchasesRes, paymentsRes, returnsRes] = await Promise.all([
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
      // Goods returned to this supplier reduce what's actually owed — must
      // be netted into the balance the same way supplier_balances (the
      // view Suppliers.jsx/PayBill.jsx read) already does, or this page
      // shows a different, overstated number for the same supplier.
      supabase
        .from('purchase_returns')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false }),
    ])

    if (purchasesRes.error) setError(purchasesRes.error.message)
    else if (paymentsRes.error) setError(paymentsRes.error.message)
    else if (returnsRes.error) setError(returnsRes.error.message)
    else {
      setPurchases(purchasesRes.data ?? [])
      setPayments(paymentsRes.data ?? [])
      setReturns(returnsRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user, supplierId])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  const addPayment = async ({ accountId, amount, note }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: rpcError } = await supabase.rpc('pay_bill', {
      p_supplier_id: supplierId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
    })

    if (rpcError) return { error: rpcError }

    await fetchLedger()
    return { data: true }
  }

  const totalBilled = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalReturned = returns.reduce((sum, r) => sum + Number(r.total_amount), 0)

  const ledgerAscending = [
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
    ...returns.map((r) => ({
      kind: 'return',
      id: r.id,
      date: r.created_at,
      amount: Number(r.total_amount),
      reference: r.reference,
      notes: r.notes,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))

  const withBalance = withRunningBalance(ledgerAscending, {
    // Accounts payable is a liability: a bill increases what we owe
    // (credit); a payment or a return of goods to the supplier both
    // decrease it (debit).
    debit: (row) => (row.kind === 'payment' || row.kind === 'return' ? row.amount : 0),
    credit: (row) => (row.kind === 'bill' ? row.amount : 0),
  })
  const ledger = withBalance.slice().reverse()
  const balance = ledger[0]?.balance ?? 0

  return {
    ledger, totalBilled, totalPaid, totalReturned, balance, loading, error, addPayment,
    refetch: fetchLedger,
  }
}
