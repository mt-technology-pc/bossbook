import { Router } from 'express'
import express from 'express'
import { Readable } from 'node:stream'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireCsrf } from '../middleware/requireCsrf.js'

// Transparent reverse proxy in front of Supabase's PostgREST (`/rest/v1`,
// including `/rest/v1/rpc/*`) and Storage (`/storage/v1`) APIs. This is
// the piece that makes moving the session out of browser-held storage
// tractable at all: supabase-js is just a fetch wrapper, so pointing
// `createClient()` at this router instead of Supabase directly (see
// frontend/src/lib/supabase.js) means every one of the ~44 files calling
// `.from()/.rpc()/.storage` needs ZERO changes — they keep generating the
// exact same HTTP requests they always did, just against this origin,
// with the real Authorization header injected here instead of by the
// browser. RLS (current_company_id()) remains the actual security
// boundary either way — this never widens access to service-role.
//
// Mounted in index.js BEFORE the global express.json() — this router
// needs the exact raw bytes of every request (including non-JSON bodies,
// e.g. a multipart Storage upload) to forward untouched, so it does its
// own raw body capture below rather than relying on a body already
// having been parsed.
const router = Router()

// type: () => true means "capture the raw body regardless of
// Content-Type" — a JSON-only raw parser would leave multipart/binary
// Storage uploads unbuffered (req.body undefined) since their
// Content-Type never matches "application/json".
router.use(express.raw({ type: () => true, limit: '15mb' }))

// Headers PostgREST/Storage actually care about, forwarded verbatim from
// the client. `Accept` matters most: .single()/.maybeSingle() (32 call
// sites across the app) rely on `Accept: application/vnd.pgrst.object+json`
// reaching PostgREST unmodified to get a single object back instead of an
// array. `apikey`/`Authorization` are deliberately NOT in this list —
// whatever the client sent there (supabase-js always sends the anon key,
// since persistSession:false means it never holds a real session) is
// inert noise, overwritten below with the real value server-side.
const FORWARDED_REQUEST_HEADERS = [
  'accept', 'prefer', 'range', 'content-type', 'content-range',
  'if-match', 'if-none-match', 'x-client-info', 'accept-profile', 'content-profile',
]

// Hop-by-hop / identity-changing headers that must not be relayed back
// verbatim — content-encoding/transfer-encoding describe the upstream
// connection's own framing, which streaming straight through doesn't
// preserve 1:1 (Node re-frames the outgoing bytes itself), and
// content-length is recalculated by Express/Node for the same reason.
const SKIPPED_RESPONSE_HEADERS = new Set([
  'content-encoding', 'transfer-encoding', 'connection', 'content-length', 'set-cookie',
])

function buildUpstreamUrl(req) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://missing-supabase-url.supabase.co'
  return `${supabaseUrl}${req.url}`
}

async function forward(req, res, { anonKeyOnly = false } = {}) {
  const anonKey = process.env.SUPABASE_ANON_KEY || 'missing-supabase-anon-key'

  const headers = new Headers()
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.headers[name]
    if (value) headers.set(name, value)
  }
  headers.set('apikey', anonKey)
  headers.set('Authorization', anonKeyOnly ? `Bearer ${anonKey}` : `Bearer ${req.accessToken}`)

  const hasBody = !['GET', 'HEAD'].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0

  let upstream
  try {
    upstream = await fetch(buildUpstreamUrl(req), {
      method: req.method,
      headers,
      body: hasBody ? req.body : undefined,
    })
  } catch (err) {
    console.error('db-proxy upstream request failed:', err)
    return res.status(502).json({ error: 'Could not reach the database.' })
  }

  res.status(upstream.status)
  upstream.headers.forEach((value, key) => {
    if (!SKIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value)
  })

  // Streamed, not buffered — the previous `Buffer.from(await
  // upstream.arrayBuffer())` waited for Supabase's ENTIRE response body
  // to arrive before sending the client a single byte, which is real
  // added latency on anything larger than a typical small PostgREST JSON
  // row (Storage downloads, big report/export queries). A HEAD request
  // or a 204/304 has no body to stream at all.
  if (!upstream.body) {
    res.end()
    return
  }

  const upstreamStream = Readable.fromWeb(upstream.body)
  // Status/headers are already flushed by the time any of this runs, so
  // a failure here can no longer become a clean JSON error response —
  // the best this can do is drop the connection rather than hang it, or
  // silently produce a truncated-looking response with a 200 still
  // attached.
  upstreamStream.on('error', (err) => {
    console.error('db-proxy stream error:', err)
    res.destroy(err)
  })
  upstreamStream.pipe(res)
}

// Public logo/asset URLs (`company.logo_url`, persisted as
// `/db-api/storage/v1/object/public/company-logos/...` — see
// frontend/src/lib/supabase.js) must keep resolving with no session at
// all, exactly like today: an unauthenticated visitor, or an <img> tag
// with no cookies attached, still needs to load a company's logo.
router.get('/storage/v1/object/public/*splat', (req, res) => forward(req, res, { anonKeyOnly: true }))

// Everything else — the bulk of the app's data access — requires a real
// session, and any mutation additionally requires the CSRF double-submit
// check (requireCsrf itself no-ops for GET/HEAD).
router.all('/*splat', requireAuth, requireCsrf, (req, res) => forward(req, res))

export default router
