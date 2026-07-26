import { google } from 'googleapis'
import { Readable } from 'node:stream'
import { getAppSecret } from './appSecrets.js'

// Client ID/secret come from Supabase Vault (app-level, shared across all
// companies) rather than process.env — only the redirect URI, which isn't
// sensitive, stays a plain env var.
export async function googleOAuthClient() {
  const [clientId, clientSecret] = await Promise.all([
    getAppSecret('google_oauth_client_id'),
    getAppSecret('google_oauth_client_secret'),
  ])
  return new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_OAUTH_REDIRECT_URI)
}

// A revoked/expired refresh_token surfaces as invalid_grant — the caller
// needs to tell this apart from a generic failure, since it means
// "reconnect Drive in Settings," not "try again."
export function isRevokedTokenError(err) {
  return err?.response?.data?.error === 'invalid_grant' || err?.code === 401 || err?.status === 401
}

// Uploads the invoice PDF to the connected company's own Google Drive and
// returns a link anyone can open — the customer receiving the SMS has no
// Google login, so the file must be shared to "anyone with the link," not
// just visible to the connected account.
export async function uploadInvoiceToDrive({ refreshToken, pdfBuffer, filename }) {
  const client = await googleOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })

  const drive = google.drive({ version: 'v3', auth: client })

  const { data: file } = await drive.files.create({
    requestBody: { name: filename, mimeType: 'application/pdf' },
    media: { mimeType: 'application/pdf', body: Readable.from(pdfBuffer) },
    fields: 'id, webViewLink',
  })

  await drive.permissions.create({
    fileId: file.id,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  return file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`
}
