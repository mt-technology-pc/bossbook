import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Every serial/IMEI unit regardless of status, joined back to the product
// that owns it and (if applicable) the purchase that brought it in / the
// sale that took it out — the full picture useAvailableUnits deliberately
// doesn't fetch (it only needs in-stock units for the sale line-item picker).
export function useProductUnits() {
  const { user } = useAuth()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUnits = useCallback(async () => {
    if (!user) {
      setUnits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('product_units')
      .select(`
        id, serial_number, status, created_at,
        products(id, name, sku),
        purchases(reference, bill_date, suppliers(name)),
        sales(reference, sale_date, type, customers(name))
      `)
      .order('created_at', { ascending: false })

    if (fetchError) setError(fetchError.message)
    else {
      setUnits(data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  return { units, loading, error, refetch: fetchUnits }
}
