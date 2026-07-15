import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useAccounts() {
  const { user } = useAuth()
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setBalances([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('account_balances')
      .select('*')
      .order('name', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else {
      setBalances(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const addAccount = async ({ name, type, openingBalance }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: insertError } = await supabase
      .from('accounts')
      .insert({
        owner_id: user.id,
        name,
        type,
        opening_balance: openingBalance || 0,
      })
      .select()
      .single()

    if (insertError) return { error: insertError }

    await fetchAccounts()
    return { data }
  }

  const deleteAccount = async (id) => {
    const { error: deleteError } = await supabase.from('accounts').delete().eq('id', id)
    if (!deleteError) await fetchAccounts()
    return { error: deleteError }
  }

  const totalBalance = balances.reduce((sum, a) => sum + Number(a.balance), 0)

  return {
    accounts: balances, loading, error, addAccount, deleteAccount, totalBalance,
    refetch: fetchAccounts,
  }
}
