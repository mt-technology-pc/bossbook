import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useImeiHistory({ serialNumber, productId, eventType, dateFrom, dateTo } = {}) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEvents = useCallback(async () => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    let query = supabase
      .from('product_unit_events')
      .select(`
        *,
        products(name, sku),
        customers(name),
        suppliers(name)
      `)
      .order('created_at', { ascending: false })

    if (serialNumber?.trim()) {
      query = query.ilike('serial_number', `%${serialNumber.trim()}%`)
    }
    if (productId) {
      query = query.eq('product_id', productId)
    }
    if (eventType) {
      query = query.eq('event_type', eventType)
    }
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`)
    }
    if (dateTo) {
      query = query.lte('created_at', `${dateTo}T23:59:59`)
    }

    const { data, error: fetchError } = await query
    if (fetchError) setError(fetchError.message)
    else {
      setEvents(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user, serialNumber, productId, eventType, dateFrom, dateTo])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  return { events, loading, error, refetch: fetchEvents }
}
