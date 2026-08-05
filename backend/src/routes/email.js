import { Router } from 'express'
import { z } from 'zod'
import nodemailer from 'nodemailer'
import { requireAuth } from '../middleware/requireAuth.js'
import { validateBody } from '../middleware/validate.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'

const router = Router()

const sendInvoiceSchema = z.object({
  to: z.string().trim().email('A valid recipient email address is required.'),
  subject: z.string().trim().min(1, 'Subject and message are required.'),
  text: z.string().trim().min(1, 'Subject and message are required.'),
  // base64() actually validates the PDF is well-formed base64, not just
  // present — Buffer.from() on garbage input previously failed silently
  // (an empty/corrupt attachment) instead of a clean 400 up front.
  pdfBase64: z.base64('Missing PDF attachment.'),
  filename: z.string().trim().min(1, 'Missing PDF attachment.'),
})

router.post('/send-invoice', requireAuth, validateBody(sendInvoiceSchema), async (req, res) => {
  const { to, subject, text, pdfBase64, filename } = req.body

  const supabase = supabaseForUser(req.accessToken)

  // RLS already scopes this to the caller's own company — no service
  // role needed, and this is the one place the plaintext password is
  // ever read (never sent back to the browser).
  const { data: settings, error: settingsError } = await supabase
    .from('smtp_settings')
    .select('*')
    .maybeSingle()

  if (settingsError) {
    return res.status(500).json({ error: settingsError.message })
  }
  if (!settings) {
    return res.status(400).json({ error: 'SMTP isn’t configured yet — set it up in Settings → Email first.' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.port === 465,
      auth: { user: settings.username, pass: settings.password },
    })

    await transporter.sendMail({
      from: `"${settings.from_name}" <${settings.from_email}>`,
      to,
      subject,
      text,
      attachments: [
        { filename, content: Buffer.from(pdfBase64, 'base64') },
      ],
    })

    res.json({ success: true })
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not send the email.' })
  }
})

export default router
