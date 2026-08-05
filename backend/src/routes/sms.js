import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validate.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { getAppSecretOrNull } from '../lib/appSecrets.js'
import { uploadInvoiceToDrive, isRevokedTokenError } from '../lib/googleDrive.js'
import { sendPlainSms } from '../lib/textLk.js'
import { buildDailySummaryMessage } from '../lib/dailySmsSummary.js'
import { todayColombo } from '../lib/todayColombo.js'
import { formatCurrency } from '../lib/formatCurrency.js'

const router = Router()

const PHONE_RE = /^\+?\d{9,15}$/
const TEXTLK_SEND_URL = 'https://app.text.lk/api/v3/sms/send'

async function getCallerCompanyId(accessToken) {
  const supabase = supabaseForUser(accessToken)
  const { data, error } = await supabase.rpc('current_company_id')
  if (error) throw error
  return data
}

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

// Fired (fire-and-forget, not awaited) right after every successful login
// — see frontend/src/context/AuthContext.jsx's signIn. Best-effort and
// silent on anything short of a real success: this must never surface an
// error to the user or slow down a login they're actively waiting on, so
// every non-happy path here still responds 200 with `sent: false` rather
// than an error status.
router.post('/login-alert', requireAuth, async (req, res) => {
  try {
    const companyId = await getCallerCompanyId(req.accessToken)
    if (!companyId) return res.json({ sent: false, reason: 'no_company' })

    const supabase = supabaseForUser(req.accessToken)
    const { data: sms, error: smsError } = await supabase
      .from('sms_settings')
      .select('api_key, sender_id, notify_phone, last_login_alert_sent_date')
      .maybeSingle()
    if (smsError) return res.json({ sent: false, reason: 'lookup_failed' })
    if (!sms || !sms.notify_phone) return res.json({ sent: false, reason: 'sms_not_configured' })

    const today = todayColombo()
    if (sms.last_login_alert_sent_date === today) {
      return res.json({ sent: false, reason: 'already_sent_today' })
    }

    const displayName = req.user.user_metadata?.full_name || req.user.email || 'A user'
    const summary = await buildDailySummaryMessage(supabase, today)
    const message = `${displayName} logged in.\n\n${summary}`

    await sendPlainSms({ apiKey: sms.api_key, senderId: sms.sender_id, phone: sms.notify_phone, message })

    await supabase.from('sms_settings').update({ last_login_alert_sent_date: today }).eq('company_id', companyId)

    res.json({ sent: true })
  } catch (err) {
    console.error('login-alert SMS failed:', err.message)
    res.json({ sent: false, reason: 'error' })
  }
})

const paymentReminderSchema = z.object({
  customerId: z.string().uuid('A valid customer is required.'),
})

// User-initiated (a button on Accounts Receivable), unlike login-alert —
// errors here should surface to whoever clicked it, not be swallowed.
router.post('/payment-reminder', requireAuth, validateBody(paymentReminderSchema), async (req, res) => {
  const { customerId } = req.body
  const supabase = supabaseForUser(req.accessToken)

  const [
    { data: sms, error: smsError },
    { data: customer, error: customerError },
    { data: company },
    { data: balanceRow, error: balanceError },
  ] = await Promise.all([
    supabase.from('sms_settings').select('api_key, sender_id').maybeSingle(),
    supabase.from('customers').select('id, name, phone').eq('id', customerId).maybeSingle(),
    supabase.from('companies').select('name').maybeSingle(),
    supabase.from('customer_balances').select('balance').eq('customer_id', customerId).maybeSingle(),
  ])

  if (smsError) return res.status(500).json({ error: smsError.message })
  if (!sms) {
    return res.status(400).json({
      error: 'SMS isn’t configured yet — set it up in Settings → SMS first.',
      code: 'sms_not_configured',
    })
  }
  if (customerError) return res.status(500).json({ error: customerError.message })
  if (!customer) return res.status(404).json({ error: 'Customer not found.' })
  if (!customer.phone) {
    return res.status(400).json({ error: 'This customer has no phone number saved.', code: 'no_phone' })
  }
  if (balanceError) return res.status(500).json({ error: balanceError.message })

  const balance = Number(balanceRow?.balance) || 0
  if (balance <= 0) {
    return res.status(400).json({ error: 'This customer has no outstanding balance.', code: 'no_balance' })
  }

  const message = `Dear ${customer.name}, this is a friendly reminder that you have an outstanding balance of ${formatCurrency(balance)} with ${company?.name || 'us'}. Kindly settle at your earliest convenience. Thank you.`

  try {
    await sendPlainSms({ apiKey: sms.api_key, senderId: sms.sender_id, phone: customer.phone, message })
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Could not send the SMS.', code: 'sms_error' })
  }

  res.json({ success: true })
})

export default router
