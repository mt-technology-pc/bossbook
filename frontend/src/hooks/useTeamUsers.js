import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api'

// Backed by /api/team/users (backend/src/routes/team.js), not a direct
// Supabase query — listing members needs their emails, which only the
// service-role admin API can resolve (company_users only stores user_id).
export function useTeamUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUsers = useCallback(async () => {
    if (!user) {
      setUsers([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiFetch('/api/team/users')
      setUsers(data.users ?? [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const addUser = async ({ email, password, roleId }) => {
    try {
      const data = await apiFetch('/api/team/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, roleId }),
      })
      await fetchUsers()
      return { data: data.user }
    } catch (err) {
      return { error: err }
    }
  }

  const setUserRole = async (userId, roleId) => {
    try {
      await apiFetch(`/api/team/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ roleId }),
      })
      await fetchUsers()
      return {}
    } catch (err) {
      return { error: err }
    }
  }

  const removeUser = async (userId) => {
    try {
      await apiFetch(`/api/team/users/${userId}`, { method: 'DELETE' })
      setUsers((prev) => prev.filter((u) => u.userId !== userId))
      return {}
    } catch (err) {
      return { error: err }
    }
  }

  return { users, loading, error, addUser, setUserRole, removeUser, refetch: fetchUsers }
}
