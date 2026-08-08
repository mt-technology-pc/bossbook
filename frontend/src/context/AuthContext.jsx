import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'

const AuthContext = createContext(undefined)

// Refresh a minute before the access token actually expires — enough
// margin that a normal request in flight at the moment of expiry still
// completes against a live token, without refreshing so early that it
// happens needlessly often.
const REFRESH_MARGIN_MS = 60_000
const BROADCAST_CHANNEL_NAME = 'bossbooks-auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)
  const channelRef = useRef(null)

  // Reimplements, deliberately, what supabase-js's own persistSession +
  // storage-event session sync used to give for free — opting out of
  // that (supabase.js now sets persistSession:false, since the session
  // lives in an httpOnly cookie this client can't read at all) means
  // this coordination has to be rebuilt explicitly, or every open tab
  // would independently race to refresh the same rotating refresh token
  // right as it expires.
  useEffect(() => {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    channelRef.current = channel
    channel.onmessage = (event) => {
      if (event.data?.type === 'refreshed') {
        setUser(event.data.user)
        scheduleRefresh(event.data.expiresAt)
      } else if (event.data?.type === 'signed-out') {
        clearLocalSession()
      }
    }
    return () => channel.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const scheduleRefresh = (expiresAt) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!expiresAt) return
    const delay = Math.max(0, expiresAt - Date.now() - REFRESH_MARGIN_MS)
    timerRef.current = setTimeout(refresh, delay)
  }

  const clearLocalSession = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setUser(null)
  }

  // The proactive path — requireAuth.js on the backend has its own
  // reactive fallback (a request that arrives with an already-expired
  // token gets one silent refresh attempt server-side before failing),
  // so this timer firing a little late from an occasional throttled
  // background tab isn't a correctness problem, just a slightly less
  // invisible one.
  const refresh = async () => {
    try {
      const data = await apiFetch('/api/auth/refresh', { method: 'POST' })
      setUser(data.user)
      scheduleRefresh(data.expiresAt)
      channelRef.current?.postMessage({ type: 'refreshed', user: data.user, expiresAt: data.expiresAt })
    } catch {
      clearLocalSession()
    }
  }

  useEffect(() => {
    apiFetch('/api/auth/session')
      .then((data) => {
        setUser(data.user)
        scheduleRefresh(data.expiresAt)
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false))

    // Fired by apiFetch/supabase.js callers once the backend's own
    // silent-refresh-and-retry has already been tried and still failed —
    // the one place "the session is genuinely dead, not just momentarily
    // expired" is handled, instead of duplicating that check across
    // every one of the ~44 direct-Supabase call sites.
    const onExpired = () => clearLocalSession()
    window.addEventListener('bossbooks:auth-expired', onExpired)
    return () => window.removeEventListener('bossbooks:auth-expired', onExpired)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async ({ email, password }) => {
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setUser(data.user)
      scheduleRefresh(data.expiresAt)

      // Fire-and-forget: a slow/failed SMS must never delay or block the
      // login the user is actively waiting on. The backend itself is
      // already silent on every non-happy path (no SMS configured,
      // already sent today, etc.) — this catch is only for a genuine
      // network failure reaching the endpoint at all.
      apiFetch('/api/sms/login-alert', { method: 'POST' }).catch(() => {})

      return { data: { user: data.user }, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' })
    } finally {
      clearLocalSession()
      channelRef.current?.postMessage({ type: 'signed-out' })
    }
  }

  const fullName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || null

  const value = { user, fullName, loading, signIn, signOut }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
