import { useEffect, useState } from 'react'
import { Send, Check, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { apiFetch } from '../../lib/api'
import { buildSaleDocumentPdf } from '../../lib/saleDocumentPdf'
import { buildSaleDocumentPosPdf } from '../../lib/saleDocumentPosPdf'
import { saleDocumentFilename } from '../../lib/saleDocument'
import { formatCurrency } from '../../lib/currency'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

function defaultMessage(data, companyName) {
  const lines = [
    `Hi ${data.customer?.name || 'there'},`,
    '',
    `Please find attached your ${data.docTypeLabel.toLowerCase()} ${data.reference} for ${formatCurrency(data.total)}.`,
  ]
  if (data.isInvoice && data.dueDate) {
    lines.push(`Payment is due by ${formatDate(data.dueDate)}.`)
  }
  lines.push('', 'Thank you for your business!', '', companyName || '')
  return lines.join('\n')
}

// A quick preview/edit step before sending, not a silent fire-and-forget —
// the PDF is built client-side from the same buildSaleDocumentPdf/
// buildSaleDocumentPosPdf already used for download/print, then uploaded
// to the backend (real SMTP needs a Node socket, not a browser one) for
// delivery via the company's own configured SMTP settings.
export default function EmailInvoiceModal({ open, onClose, documentData, printFormat, company }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open && documentData) {
      setTo(documentData.customer?.email || '')
      setSubject(`${documentData.docTypeLabel} ${documentData.reference} from ${company?.name || ''}`)
      setMessage(defaultMessage(documentData, company?.name))
      setSent(false)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleSend = async () => {
    if (!documentData) return
    if (!to.trim()) {
      setError('Enter a recipient email address.')
      return
    }
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message cannot be empty.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const doc = printFormat === 'pos'
        ? await buildSaleDocumentPosPdf(documentData, company?.name)
        : await buildSaleDocumentPdf(documentData)
      const pdfBase64 = doc.output('datauristring').split(',')[1]

      await apiFetch('/api/email/send-invoice', {
        method: 'POST',
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          text: message,
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
      setError(err.message || 'Could not send the email.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email to customer"
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
          <span className="text-xs font-medium text-ink-500">To *</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Subject *</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Message *</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        {documentData && (
          <p className="text-xs text-ink-400">
            {saleDocumentFilename(documentData)} will be attached as a PDF.
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
