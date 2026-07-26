import { useEffect, useState } from 'react'
import { Send, Check, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { apiFetch } from '../../lib/api'
import { buildSaleDocumentPdf } from '../../lib/saleDocumentPdf'
import { buildSaleDocumentPosPdf } from '../../lib/saleDocumentPosPdf'
import { saleDocumentFilename } from '../../lib/saleDocument'
import { formatCurrency } from '../../lib/currency'

const PHONE_RE = /^\+?\d{9,15}$/

function defaultMessage(data, companyName) {
  return `Hi ${data.customer?.name || 'there'}, here's your ${data.docTypeLabel.toLowerCase()} ${data.reference} for ${formatCurrency(data.total)} from ${companyName || 'us'}.`
}

// Same build-the-PDF-client-side-then-upload-base64 pattern as
// EmailInvoiceModal.jsx — the backend uploads it to the company's own
// connected Google Drive and texts a link via text.lk, since there's no
// SMS attachment equivalent to an email attachment.
export default function SmsInvoiceModal({ open, onClose, documentData, printFormat, company }) {
  const [to, setTo] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && documentData) {
      setTo(documentData.customer?.phone || '')
      setMessage(defaultMessage(documentData, company?.name))
      setSent(false)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSend = async () => {
    if (!documentData) return
    const cleaned = to.trim()
    if (!cleaned || !PHONE_RE.test(cleaned)) {
      setError('Enter a valid phone number with country code (e.g. 94710000000).')
      return
    }
    if (!message.trim()) {
      setError('Message cannot be empty.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const doc = printFormat === 'pos'
        ? await buildSaleDocumentPosPdf(documentData, company?.name)
        : await buildSaleDocumentPdf(documentData)
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      await apiFetch('/api/sms/send-invoice', {
        method: 'POST',
        body: JSON.stringify({
          to: cleaned,
          message,
          pdfBase64,
          filename: saleDocumentFilename(documentData),
        }),
      })

      setSent(true)
      setTimeout(() => {
        setSent(false)
        onClose()
      }, 1500)
    } catch (err) {
      // The backend's error messages are already actionable as plain text
      // ("Connect Google Drive in Settings first.", etc.) — no separate
      // code-based UI needed here.
      setError(err.message || 'Could not send the SMS.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send SMS to customer"
      subtitle={documentData ? `${documentData.docTypeLabel} ${documentData.reference}` : ''}
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Phone number *</span>
          <input
            type="tel"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="94710000000"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Message *</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        {documentData && (
          <p className="text-xs text-ink-400">
            A link to {saleDocumentFilename(documentData)} (uploaded to your connected Google Drive) will be added to the end of the message.
          </p>
        )}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="primary" disabled={sending || !documentData} onClick={handleSend}>
          {sending ? 'Sending…' : sent ? <><Check size={15} /> Sent</> : <><Send size={15} /> Send</>}
        </Button>
      </div>
    </Modal>
  )
}
