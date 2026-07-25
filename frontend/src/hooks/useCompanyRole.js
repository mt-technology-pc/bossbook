import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Whether the current user is the 'owner' or 'staff' member of their
// company (company_users.role) — used to gate mutating settings, since
// staff can view branding but only an owner can change it.
export function useCompanyRole() {
  const { user } = useAuth()
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setRole(null)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase.from('company_users').select('role').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        setRole(data?.role ?? null)
        setLoading(false)
      })
  }, [user])

  return { role, isOwner: role === 'owner', loading }
}
