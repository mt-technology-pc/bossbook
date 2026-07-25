import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// RLS on companies scopes select to the caller's own company (id =
// current_company_id()), so this is always exactly one row.
export function useCompany() {
  const { user } = useAuth()
  const [company, setCompany] = useState(null)

  const fetchCompany = useCallback(() => {
    if (!user) {
      setCompany(null)
      return
    }
    supabase.from('companies').select('id, name, logo_url, brand_color').single().then(({ data }) => {
      setCompany(data)
    })
  }, [user])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  return { company, refetch: fetchCompany }
}
