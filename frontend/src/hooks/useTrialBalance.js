import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const TYPE_ORDER = ['asset', 'liability', 'equity', 'income', 'expense']

// As-of-date trial balance, computed client-side from every posted journal
// entry line up to and including asOfDate (chart_of_accounts_balances is
// always "as of now", so a real as-of-date report needs the raw lines).
export function useTrialBalance(asOfDate) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user) {
      setAccounts([])
      setLines([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [accRes, lineRes] = await Promise.all([
      supabase.from('chart_of_accounts').select('*'),
      supabase.from('journal_entry_lines').select('account_id, debit, credit, journal_entries(entry_date)'),
    ])

    if (accRes.error) setError(accRes.error.message)
    else if (lineRes.error) setError(lineRes.error.message)
    else {
      setAccounts(accRes.data ?? [])
      setLines(lineRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const rowsByType = TYPE_ORDER.map((type) => {
    const rows = accounts
      .filter((a) => a.type === type)
      .map((a) => {
        const relevant = lines.filter(
          (l) => l.account_id === a.id && (!asOfDate || l.journal_entries.entry_date <= asOfDate),
        )
        const totalDebit = relevant.reduce((sum, l) => sum + Number(l.debit), 0)
        const totalCredit = relevant.reduce((sum, l) => sum + Number(l.credit), 0)
        const raw = a.normal_balance === 'debit' ? totalDebit - totalCredit : totalCredit - totalDebit
        return {
          id: a.id,
          name: a.name,
          normalBalance: a.normal_balance,
          debitColumn: raw >= 0 && a.normal_balance === 'debit' ? raw : raw < 0 && a.normal_balance === 'credit' ? -raw : 0,
          creditColumn: raw >= 0 && a.normal_balance === 'credit' ? raw : raw < 0 && a.normal_balance === 'debit' ? -raw : 0,
        }
      })
      .filter((r) => r.debitColumn !== 0 || r.creditColumn !== 0)
    return { type, rows }
  }).filter((g) => g.rows.length > 0)

  const totalDebits = rowsByType.reduce((sum, g) => sum + g.rows.reduce((s, r) => s + r.debitColumn, 0), 0)
  const totalCredits = rowsByType.reduce((sum, g) => sum + g.rows.reduce((s, r) => s + r.creditColumn, 0), 0)

  return { rowsByType, totalDebits, totalCredits, loading, error, refetch: fetchData }
}
