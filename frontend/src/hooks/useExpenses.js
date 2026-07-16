import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useExpenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('expenses')
      .select('*, accounts(name, type)')
      .order('expense_date', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setExpenses(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const addExpense = async ({ accountId, category, description, amount, expenseDate }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('record_expense', {
      p_account_id: accountId,
      p_category: category,
      p_description: description || null,
      p_amount: amount,
      p_expense_date: expenseDate || null,
    })

    if (rpcError) return { error: rpcError }

    await fetchExpenses()
    return { data }
  }

  const deleteExpense = async (id) => {
    const { error: rpcError } = await supabase.rpc('delete_expense', { p_expense_id: id })
    if (!rpcError) await fetchExpenses()
    return { error: rpcError }
  }

  return { expenses, loading, error, addExpense, deleteExpense, refetch: fetchExpenses }
}
