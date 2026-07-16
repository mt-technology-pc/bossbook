import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { withRunningBalance } from '../lib/ledger'

// The real T-account for a single Chart of Accounts row, built from
// journal_entry_lines — the double-entry source of truth, separate from
// the single-sided account_transactions/customer_transactions tables.
export function useGeneralLedger(coaId) {
  const { user } = useAuth()
  const [account, setAccount] = useState(null)
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchLedger = useCallback(async () => {
    if (!user || !coaId) {
      setAccount(null)
      setLines([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [accRes, linesRes] = await Promise.all([
      supabase.from('chart_of_accounts_balances').select('*').eq('coa_id', coaId).single(),
      supabase
        .from('journal_entry_lines')
        .select('*, journal_entries(entry_date, memo, source_table, source_id)')
        .eq('account_id', coaId)
        .order('entry_date', { foreignTable: 'journal_entries', ascending: true })
        .order('created_at', { ascending: true }),
    ])

    if (linesRes.error) setError(linesRes.error.message)
    else {
      const withBalance = withRunningBalance(linesRes.data ?? [], {
        debit: (l) => l.debit,
        credit: (l) => l.credit,
        flip: accRes.data?.normal_balance === 'credit',
      })
      setAccount(accRes.data ?? null)
      setLines(withBalance.reverse())
      setError(null)
    }
    setLoading(false)
  }, [user, coaId])

  useEffect(() => {
    fetchLedger()
  }, [fetchLedger])

  return { account, lines, loading, error, refetch: fetchLedger }
}
