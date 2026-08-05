import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signUp = async ({ email, password, fullName, companyName }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: companyName } },
    })
    return { data, error }
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      // Fire-and-forget: a slow/failed SMS must never delay or block the
      // login the user is actively waiting on. The backend itself is
      // already silent on every non-happy path (no SMS configured,
      // already sent today, etc.) — this catch is only for a genuine
      // network failure reaching the endpoint at all.
      apiFetch('/api/sms/login-alert', { method: 'POST' }).catch(() => {})
    }
    return { data, error }
  }

  const signOut = () => supabase.auth.signOut()

  const user = session?.user ?? null
  const fullName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || null

  const value = { session, user, fullName, loading, signUp, signIn, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
