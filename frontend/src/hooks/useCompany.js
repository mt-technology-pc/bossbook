import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// RLS on companies scopes select to the caller's own company (checked via
// direct company_users membership, not current_company_id() — the latter
// is deliberately pause-aware and returns null for a paused company,
// which would make this query return nothing at all; companies' own
// SELECT policy stays independent of that specifically so a paused
// company's users can still read `paused: true` here and see why they're
// locked out, even though every other table denies them). Always exactly
// one row.
export function useCompany() {
  const { user } = useAuth()
  const [company, setCompany] = useState(null)

  const fetchCompany = useCallback(() => {
    if (!user) {
      setCompany(null)
      return
    }
    supabase.from('companies').select('id, name, logo_url, brand_color, address, email, phone, paused').single().then(({ data }) => {
      setCompany(data)
    })
  }, [user])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return { company, refetch: fetchCompany }
}
