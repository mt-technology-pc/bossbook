// Every request is same-origin — in prod via vercel.json's /api rewrite,
// in dev via vite.config.js's matching server.proxy entry — so the
// browser is never told a separate backend host at all. Every call site
// still passes its path starting with "/api/..." (unchanged from before
// this file's own auth rework), so this is just the site's own origin,
// not the origin *plus* "/api" — that prefix already lives in every
// caller's path string. Auth rides along automatically via the httpOnly
// session cookie (credentials:'include' below), not a header this client
// reads from anywhere — there's no client-side session left to read (see
// supabase.js's persistSession:false).
const API_URL = window.location.origin

// Read once per call, not stored — the csrf cookie can rotate (a login,
// a refresh) between calls, and this always needs whatever's current.
// Not httpOnly by design (see backend/src/lib/authCookies.js) so this is
// the one piece of session-related state this app is allowed to read.
function csrfHeader() {
  const match = document.cookie.match(/(?:^|; )bb_csrf=([^;]+)/)
  return match ? { 'X-CSRF-Token': decodeURIComponent(match[1]) } : {}
}

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeader(),
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
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeader(),
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with ${res.status}`)
  }

  return res.json()
}

export async function apiFetchBlob(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...csrfHeader(),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed with ${res.status}`)
  }

  return res.blob()
}
