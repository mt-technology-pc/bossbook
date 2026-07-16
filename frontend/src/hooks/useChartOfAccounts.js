import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TYPE_ORDER = ['asset', 'liability', 'equity', 'income', 'expense']

export function useChartOfAccounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('chart_of_accounts_balances')
      .select('*')
      .order('name', { ascending: true })

    if (fetchError) setError(fetchError.message)
    else {
      setAccounts(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const byType = TYPE_ORDER.map((type) => ({
    type,
    accounts: accounts.filter((a) => a.type === type),
  })).filter((g) => g.accounts.length > 0)

  return { accounts, byType, loading, error, refetch: fetchAccounts }
}
