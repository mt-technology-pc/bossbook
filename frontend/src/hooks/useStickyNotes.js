import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useStickyNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('sticky_notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setNotes(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const addNote = async (fields = {}) => {
    if (!user) return { error: new Error('Not signed in') }
    const { data, error: insertError } = await supabase
      .from('sticky_notes')
      .insert({ content: '', color: 'yellow', pinned: false, ...fields, owner_id: user.id })
      .select()
      .single()

    if (insertError) return { error: insertError }
    setNotes((prev) => [data, ...prev])
    return { data }
  }

  const updateNote = async (id, fields) => {
    const { data, error: updateError } = await supabase
      .from('sticky_notes')
      .update(fields)
      .eq('id', id)
      .select()
      .single()

    if (updateError) return { error: updateError }
    setNotes((prev) => prev.map((n) => (n.id === id ? data : n)))
    return { data }
  }

  const deleteNote = async (id) => {
    const { error: deleteError } = await supabase.from('sticky_notes').delete().eq('id', id)
    if (!deleteError) setNotes((prev) => prev.filter((n) => n.id !== id))
    return { error: deleteError }
  }

  return { notes, loading, error, addNote, updateNote, deleteNote, refetch: fetchNotes }
}
