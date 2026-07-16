import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCustomerPayments() {
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
      .from('customer_transactions')
      .select('*, customers(name), sales(reference, type, total_amount)')
      .eq('type', 'payment')
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

  const receivePayment = async ({ customerId, accountId, amount, note, paymentDate, saleId }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('receive_payment', {
      p_customer_id: customerId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
      p_payment_date: paymentDate || null,
      p_sale_id: saleId || null,
    })

    if (rpcError) return { error: rpcError }

    await fetchPayments()
    return { data }
  }

  const updatePayment = async (paymentId, { accountId, amount, note, paymentDate, saleId }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: rpcError } = await supabase.rpc('update_customer_payment', {
      p_payment_id: paymentId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
      p_payment_date: paymentDate || null,
      p_sale_id: saleId || null,
    })

    if (!rpcError) await fetchPayments()
    return { error: rpcError }
  }

  const deletePayment = async (paymentId) => {
    if (!user) return { error: new Error('Not signed in') }

    const { error: rpcError } = await supabase.rpc('delete_customer_payment', { p_payment_id: paymentId })
    if (!rpcError) await fetchPayments()
    return { error: rpcError }
  }

  return {
    payments, loading, error, receivePayment, updatePayment, deletePayment,
    refetch: fetchPayments,
  }
}
