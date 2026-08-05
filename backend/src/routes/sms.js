import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validate.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { getAppSecretOrNull } from '../lib/appSecrets.js'
import { uploadInvoiceToDrive, isRevokedTokenError } from '../lib/googleDrive.js'

const router = Router()

const PHONE_RE = /^\+?\d{9,15}$/
const TEXTLK_SEND_URL = 'https://app.text.lk/api/v3/sms/send'

const sendSmsSchema = z.object({
  // Strips spaces/dashes before the regex check, same cleanup the route
  // did manually before — req.body.to is the cleaned number from here on.
  to: z.string().trim()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(PHONE_RE, 'A valid recipient phone number (with country code) is required.')),
  message: z.string().trim().min(1, 'A message is required.'),
  pdfBase64: z.base64('Missing PDF.'),
  filename: z.string().trim().min(1, 'Missing PDF.'),
})

// Google Drive is one app-wide connection (Vault-backed, connected once by
// a platform admin in /admin — just file storage, not a per-usage cost).
// text.lk is per-company (each business has its own account/API key,
// since SMS sending has a real per-message cost each company pays for and
// manages themselves) — read via the caller's own RLS-scoped session.
router.post('/send-invoice', requireAuth, validateBody(sendSmsSchema), async (req, res) => {
  const { to: cleanedPhone, message, pdfBase64, filename } = req.body

  const supabase = supabaseForUser(req.accessToken)

  const [refreshToken, { data: sms, error: smsError }] = await Promise.all([
    getAppSecretOrNull('google_drive_refresh_token'),
    supabase.from('sms_settings').select('api_key, sender_id').maybeSingle(),
  ])

  if (smsError) {
    return res.status(500).json({ error: smsError.message })
  }
  if (!refreshToken) {
    return res.status(400).json({
      error: 'Google Drive isn’t connected yet — ask your platform administrator to connect it.',
      code: 'google_drive_not_connected',
    })
  }
  if (!sms) {
    return res.status(400).json({
      error: 'SMS isn’t configured yet — set it up in Settings → SMS first.',
      code: 'sms_not_configured',
    })
  }

  let link
  try {
    link = await uploadInvoiceToDrive({
      refreshToken,
      pdfBuffer: Buffer.from(pdfBase64, 'base64'),
      filename,
    })
  } catch (err) {
    if (isRevokedTokenError(err)) {
      return res.status(502).json({
        error: 'Google Drive access was revoked — ask your platform administrator to reconnect it.',
        code: 'google_drive_revoked',
      })
    }
    return res.status(502).json({
      error: err.message || 'Could not upload the PDF to Google Drive.',
      code: 'google_drive_error',
    })
  }

  const finalMessage = `${message} ${link}`

  try {
    const response = await fetch(TEXTLK_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sms.api_key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        recipient: cleanedPhone.replace(/^\+/, ''),
        sender_id: sms.sender_id,
        type: 'plain',
        message: finalMessage,
      }),
    })
    const body = await response.json()

    if (!response.ok || body.status !== 'success') {
      return res.status(502).json({ error: body.message || 'Could not send the SMS.', code: 'sms_error' })
    }

    res.json({ success: true, link })
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not send the SMS.', code: 'sms_error' })
  }
})

export default router
