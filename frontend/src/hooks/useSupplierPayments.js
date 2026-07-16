import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useSupplierPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchPayments = useCallback(async () => {
    if (!user) {
      setPayments([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('supplier_payments')
      .select('*, suppliers(name), purchases(reference, total_amount)')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setPayments(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const payBill = async ({ supplierId, accountId, amount, note, paymentDate, purchaseId }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('pay_bill', {
      p_supplier_id: supplierId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
      p_payment_date: paymentDate || null,
      p_purchase_id: purchaseId || null,
    })

    if (rpcError) return { error: rpcError }

    await fetchPayments()
    return { data }
  }

  const updatePayment = async (paymentId, { accountId, amount, note, paymentDate, purchaseId }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: rpcError } = await supabase.rpc('update_supplier_payment', {
      p_payment_id: paymentId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
      p_payment_date: paymentDate || null,
      p_purchase_id: purchaseId || null,
    })

    if (!rpcError) await fetchPayments()
    return { error: rpcError }
  }

  const deletePayment = async (paymentId) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: rpcError } = await supabase.rpc('delete_supplier_payment', { p_payment_id: paymentId })
    if (!rpcError) await fetchPayments()
    return { error: rpcError }
  }

  return {
    payments, loading, error, payBill, updatePayment, deletePayment,
    refetch: fetchPayments,
  }
}
