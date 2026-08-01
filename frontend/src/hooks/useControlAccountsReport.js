import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function descFor(sourceTable, memo) {
  if (sourceTable === 'manual') return memo || 'Journal entry'
  const labels = {
    sales: 'Credit sales',
    customer_transactions: 'Cash and bank',
    purchases: 'Credit purchases',
    supplier_payments: 'Cash and bank',
    expenses: 'Expense',
    accounts: 'Balance b/d',
    products: 'Opening stock',
  }
  return labels[sourceTable] ?? memo ?? '—'
}

function buildTAccount(openingBalance, periodDrLines, periodCrLines) {
  const drList = []
  const crList = []

  if (openingBalance > 0.005) {
    drList.push({ date: '', desc: 'Balance b/d', amount: openingBalance, isBalance: true })
  } else if (openingBalance < -0.005) {
    crList.push({ date: '', desc: 'Balance b/d', amount: Math.abs(openingBalance), isBalance: true })
  }

  drList.push(...periodDrLines)
  crList.push(...periodCrLines)

  const totalDr = drList.reduce((s, e) => s + e.amount, 0)
  const totalCr = crList.reduce((s, e) => s + e.amount, 0)
  const closingBalance = totalDr - totalCr // positive = debit balance

  const drFinal = [...drList]
  const crFinal = [...crList]

  if (closingBalance > 0.005) {
    crFinal.push({ date: '', desc: 'Balance c/d', amount: closingBalance, isClosing: true })
  } else if (closingBalance < -0.005) {
    drFinal.push({ date: '', desc: 'Balance c/d', amount: Math.abs(closingBalance), isClosing: true })
  }

  const grandTotal = Math.max(
    drFinal.reduce((s, e) => s + e.amount, 0),
    crFinal.reduce((s, e) => s + e.amount, 0),
  )

  return { drEntries: drFinal, crEntries: crFinal, grandTotal, closingBalance }
}

export function useControlAccountsReport(startDate, endDate) {
  const { user } = useAuth()
  const [ar, setAr] = useState(null)
  const [ap, setAp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user) { setAr(null); setAp(null); setLoading(false); return }
    setLoading(true)
    setError(null)

    const { data: coaRows, error: coaErr } = await supabase
      .from('chart_of_accounts')
      .select('id, system_key')
      .in('system_key', ['accounts_receivable', 'accounts_payable'])

    if (coaErr) { setError(coaErr.message); setLoading(false); return }

    const arCoa = coaRows?.find(r => r.system_key === 'accounts_receivable')
    const apCoa = coaRows?.find(r => r.system_key === 'accounts_payable')
    const accountIds = [arCoa?.id, apCoa?.id].filter(Boolean)

    if (accountIds.length === 0) {
      setAr(null); setAp(null); setLoading(false); return
    }

    const { data: lines, error: linesErr } = await supabase
      .from('journal_entry_lines')
      .select('account_id, debit, credit, journal_entries(entry_date, memo, source_table)')
      .in('account_id', accountIds)

    if (linesErr) { setError(linesErr.message); setLoading(false); return }

    function buildFor(coaId) {
      if (!coaId) return null
      const allLines = (lines ?? []).filter(l => l.account_id === coaId)

      const preLines = startDate
        ? allLines.filter(l => l.journal_entries?.entry_date < startDate)
        : []
      const openingBalance = preLines.reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0)

      const periodLines = allLines.filter(l => {
        const d = l.journal_entries?.entry_date
        if (!d) return false
        if (startDate && d < startDate) return false
        if (endDate && d > endDate) return false
        return true
      })

      const drLines = periodLines
        .filter(l => Number(l.debit) > 0.005)
        .map(l => ({
          date: l.journal_entries?.entry_date ?? '',
          desc: descFor(l.journal_entries?.source_table, l.journal_entries?.memo),
          amount: Number(l.debit),
        }))

      const crLines = periodLines
        .filter(l => Number(l.credit) > 0.005)
        .map(l => ({
          date: l.journal_entries?.entry_date ?? '',
          desc: descFor(l.journal_entries?.source_table, l.journal_entries?.memo),
          amount: Number(l.credit),
        }))

      return buildTAccount(openingBalance, drLines, crLines)
    }

    setAr(buildFor(arCoa?.id))
    setAp(buildFor(apCoa?.id))
    setLoading(false)
  }, [user, startDate, endDate])

  useEffect(() => { fetchData() }, [fetchData])

  return { ar, ap, loading, error, refetch: fetchData }
}
