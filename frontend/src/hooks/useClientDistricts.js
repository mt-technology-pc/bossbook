import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SRI_LANKA_DISTRICTS } from '../lib/districts'

function pad(n) {
  return String(n).padStart(2, '0')
}

// Local calendar date, never via toISOString() — see dateBuckets.js for why
// that silently shifts the date backward in UTC+ timezones like ours.
function localISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Registered vs active (had a sale in the last 90 days) client counts,
// rolled up per district — including districts with zero customers, so the
// dashboard card always shows full national coverage rather than only
// districts with data.
export function useClientDistricts() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) {
      setCustomers([])
      setSales([])
      setLoading(false)
      return
    }
    setLoading(true)

    const [customersRes, salesRes] = await Promise.all([
      supabase.from('customers').select('id, name, district'),
      supabase.from('sales').select('customer_id, sale_date'),
    ])

    if (customersRes.error) setError(customersRes.error.message)
    else if (salesRes.error) setError(salesRes.error.message)
    else {
      setCustomers(customersRes.data ?? [])
      setSales(salesRes.data ?? [])
      setError(null)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const result = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const cutoffStr = localISODate(cutoff)

    const activeCustomerIds = new Set(
      sales.filter((s) => s.customer_id && s.sale_date >= cutoffStr).map((s) => s.customer_id),
    )

    const buckets = new Map()
    SRI_LANKA_DISTRICTS.forEach((d) => buckets.set(d, { district: d, registered: 0, active: 0, customers: [] }))
    buckets.set('Unspecified', { district: 'Unspecified', registered: 0, active: 0, customers: [] })

    customers.forEach((c) => {
      const key = c.district && buckets.has(c.district) ? c.district : 'Unspecified'
      const bucket = buckets.get(key)
      const isActive = activeCustomerIds.has(c.id)
      bucket.registered += 1
      if (isActive) bucket.active += 1
      bucket.customers.push({ id: c.id, name: c.name, active: isActive })
    })

    const rows = [...buckets.values()]
    const totalRegistered = customers.length
    const totalActive = activeCustomerIds.size

    return { rows, totalRegistered, totalActive }
  }, [customers, sales])

  return { ...result, loading, error, refetch: fetchAll }
}
