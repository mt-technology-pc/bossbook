import { supabase } from './supabase'

// The localhost fallback only makes sense in dev — VITE_API_URL is baked in
// at build time, so a production build shipped without it would otherwise
// silently point every API call at localhost forever (this exact bug was
// live on one deployment: the build succeeded, the login page loaded, and
// every API call failed with no clue why). This runs at module-evaluation
// time, before React even mounts — too early for the ErrorBoundary in
// App.jsx to catch (that only catches render-time errors) — so this writes
// directly to the page itself before throwing, rather than relying on a
// React error screen that would never actually appear for this case.
if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  const message = 'Configuration error: VITE_API_URL is not set. This deployment has no backend to talk to — set it in the environment variables and rebuild.'
  document.body.innerHTML = `<div style="font-family:sans-serif;max-width:32rem;margin:4rem auto;padding:1.5rem;border:1px solid #fca5a5;background:#fef2f2;color:#b91c1c;border-radius:0.5rem;">${message}</div>`
  throw new Error(message)
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, '')

export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with ${res.status}`)
  }

  // res.json() throws on a body-less response (e.g. 204 No Content, which
  // several routes return on a successful delete/update) — nothing to
  // parse there, so just resolve to null instead of failing the call.
  if (res.status === 204) return null

  return res.json()
}

export async function apiUploadFile(path, file) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with ${res.status}`)
  }

  return res.json()
}

export async function apiFetchBlob(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with ${res.status}`)
  }

  return res.blob()
}
