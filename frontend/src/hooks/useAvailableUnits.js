import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// All in-stock serial/IMEI units, so sale line items can offer only
// units that actually exist and haven't already been sold.
export function useAvailableUnits() {
  const { user } = useAuth()
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchUnits = useCallback(async () => {
    if (!user) {
      setUnits([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('product_units')
      .select('id, product_id, serial_number')
      .eq('status', 'in_stock')
      .order('created_at', { ascending: true })

    setUnits(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  const forProduct = (productId) => units.filter((u) => u.product_id === productId)

  return { units, loading, forProduct, refetch: fetchUnits }
}
