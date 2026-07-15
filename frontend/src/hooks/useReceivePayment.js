import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useReceivePayment() {
  const { user } = useAuth()

  const receivePayment = async ({ customerId, accountId, amount, note, paymentDate }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error } = await supabase.rpc('receive_payment', {
      p_customer_id: customerId,
      p_account_id: accountId,
      p_amount: amount,
      p_note: note || null,
      p_payment_date: paymentDate || null,
    })

    if (error) return { error }
    return { data }
  }

  return { receivePayment }
}
