import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// RLS on companies scopes select to the caller's own company (id =
// current_company_id()), so this is always exactly one row — the print
// header/footer's only real use for it so far.
export function useCompany() {
  const { user } = useAuth()
  const [company, setCompany] = useState(null)

  useEffect(() => {
    if (!user) {
      setCompany(null)
      return
    }
    supabase.from('companies').select('name').single().then(({ data }) => {
      setCompany(data)
    })
  }, [user])

  return { company }
}
