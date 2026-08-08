// Shared by api.js and supabase.js — every non-GET request this app
// makes (whether to the Express backend or through the DB proxy) needs
// this same header attached; one implementation so both stay in sync
// with whatever backend/src/lib/authCookies.js actually names the cookie.
//
// Read fresh on every call, not cached — the cookie rotates on login/
// refresh, and this always needs whatever's current. Not httpOnly by
// design (see authCookies.js) so this is the one piece of session state
// this app is allowed to read directly.
export function csrfHeader() {
  const match = document.cookie.match(/(?:^|; )bb_csrf=([^;]+)/)
  return match ? { 'X-CSRF-Token': decodeURIComponent(match[1]) } : {}
}
