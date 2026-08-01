import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useJournalEntries() {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEntries = useCallback(async () => {
    if (!user) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('journal_entries')
      .select('*, journal_entry_lines(*, chart_of_accounts(name, type))')
      .eq('source_table', 'manual')
      .order('entry_date', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setEntries(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const createJournalEntry = async ({ entryDate, memo, lines }) => {
    if (!user) return { error: new Error('Not signed in') }

    const { data, error: rpcError } = await supabase.rpc('post_journal_entry', {
      p_entry_date: entryDate || null,
      p_memo: memo || null,
      p_source_table: 'manual',
      p_source_id: null,
      p_lines: lines,
    })

    if (rpcError) return { error: rpcError }

    await fetchEntries()
    return { data }
  }

  const deleteJournalEntry = async (id) => {
    const { error: rpcError } = await supabase.rpc('delete_manual_journal_entry', {
      p_entry_id: id,
    })
    if (!rpcError) await fetchEntries()
    return { error: rpcError }
  }

  return { entries, loading, error, createJournalEntry, deleteJournalEntry, refetch: fetchEntries }
}
