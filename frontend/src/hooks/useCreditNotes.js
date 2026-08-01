import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCreditNotes() {
  const { user } = useAuth()
  const [creditNotes, setCreditNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCreditNotes = useCallback(async () => {
    if (!user) {
      setCreditNotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('credit_notes')
      .select('*, customers(name), sales(reference, type), credit_note_items(*)')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setCreditNotes(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCreditNotes() }, [fetchCreditNotes])

  const createCreditNote = async ({ customerId, saleId, reference, creditDate, notes, items }) => {
    if (!user) return { error: new Error('Not signed in') }
    const { data, error: rpcError } = await supabase.rpc('create_credit_note', {
      p_customer_id: customerId || null,
      p_sale_id: saleId || null,
      p_reference: reference || null,
      p_credit_date: creditDate || null,
      p_notes: notes || null,
      p_items: items.map(i => ({
        product_id: i.product_id || null,
        description: i.description || null,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        amount: Number(i.amount),
        unit_ids: i.unit_ids || [],
      })),
    })
    if (rpcError) return { error: rpcError }
    await fetchCreditNotes()
    return { data }
  }

  const deleteCreditNote = async (creditNoteId) => {
    if (!user) return { error: new Error('Not signed in') }
    const { error: rpcError } = await supabase.rpc('delete_credit_note', {
      p_credit_note_id: creditNoteId,
    })
    if (!rpcError) await fetchCreditNotes()
    return { error: rpcError }
  }

  return { creditNotes, loading, error, createCreditNote, deleteCreditNote, refetch: fetchCreditNotes }
}
