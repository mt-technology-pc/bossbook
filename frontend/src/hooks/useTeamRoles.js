import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

// Backed by /api/team/roles — goes through the backend (rather than a
// direct Supabase query like most hooks) purely so GET can also call
// ensure_default_role() first; the roles/role_permissions RLS policies
// themselves (migration 007) are the real enforcement either way.
export function useTeamRoles() {
  const { user } = useAuth()
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchRoles = useCallback(async () => {
    if (!user) {
      setRoles([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/api/team/roles')
      setRoles(data.roles ?? [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  const addRole = async ({ name, fullAccess, pageKeys }) => {
    try {
      const data = await apiFetch('/api/team/roles', {
        method: 'POST',
        body: JSON.stringify({ name, fullAccess, pageKeys }),
      })
      await fetchRoles()
      return { data: data.role }
    } catch (err) {
      return { error: err }
    }
  }

  const updateRole = async (id, { name, fullAccess, pageKeys }) => {
    try {
      await apiFetch(`/api/team/roles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, fullAccess, pageKeys }),
      })
      await fetchRoles()
      return {}
    } catch (err) {
      return { error: err }
    }
  }

  const deleteRole = async (id) => {
    try {
      await apiFetch(`/api/team/roles/${id}`, { method: 'DELETE' })
      setRoles((prev) => prev.filter((r) => r.id !== id))
      return {}
    } catch (err) {
      return { error: err }
    }
  }

  return { roles, loading, error, addRole, updateRole, deleteRole, refetch: fetchRoles }
}
