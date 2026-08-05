const TEXTLK_SEND_URL = 'https://app.text.lk/api/v3/sms/send'

// Same text.lk call shape as sms.js's /send-invoice route, minus the
// Google-Drive-PDF-upload part that route also does — this is for plain
// text alerts (login/daily-summary) with no attachment/link, shared by
// the two new call sites that need exactly that. /send-invoice itself is
// left as-is rather than refactored onto this, to avoid touching a
// working, already-tested path for a two-caller extraction.
export async function sendPlainSms({ apiKey, senderId, phone, message }) {
  const response = await fetch(TEXTLK_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      recipient: phone.replace(/^\+/, ''),
      sender_id: senderId,
      type: 'plain',
      message,
    }),
  })
  const body = await response.json().catch(() => ({}))

  if (!response.ok || body.status !== 'success') {
    throw new Error(body.message || 'Could not send the SMS.')
  }
}
