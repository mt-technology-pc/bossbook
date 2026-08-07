import { apiFetch } from './api'
import { buildSaleDocumentPdf } from './saleDocumentPdf'
import { buildSaleDocumentPosPdf } from './saleDocumentPosPdf'
import { saleDocumentFilename } from './saleDocument'
import { formatCurrency } from './currency'

// Auto-send versions of SmsInvoiceModal.jsx / EmailInvoiceModal.jsx's own
// handleSend — same PDF-build-then-upload-base64 API calls, but with the
// default message baked in rather than editable state, for flows that
// send immediately with no review step (the walk-in "send this receipt?"
// prompt on Sales Receipts). The modals keep their own inline logic
// rather than being refactored onto this, since their message is
// user-edited, not this module's fixed default.

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

async function buildPdfBase64(documentData, printFormat, companyName, showLetterhead) {
  const doc = printFormat === 'pos'
    ? await buildSaleDocumentPosPdf(documentData, companyName)
    : await buildSaleDocumentPdf(documentData, { showLetterhead })
  return doc.output('datauristring').split(',')[1]
}

export async function sendSaleDocumentSms({ documentData, printFormat, company, phone, withLetterhead = true }) {
  const pdfBase64 = await buildPdfBase64(documentData, printFormat, company?.name, withLetterhead)
  const message = `Hi ${documentData.customer?.name || 'there'}, here's your ${documentData.docTypeLabel.toLowerCase()} ${documentData.reference} for ${formatCurrency(documentData.total)} from ${company?.name || 'us'}.`

  await apiFetch('/api/sms/send-invoice', {
    method: 'POST',
    body: JSON.stringify({
      to: phone,
      message,
      pdfBase64,
      filename: saleDocumentFilename(documentData),
    }),
  })
}

export async function sendSaleDocumentEmail({ documentData, printFormat, company, email, withLetterhead = true }) {
  const pdfBase64 = await buildPdfBase64(documentData, printFormat, company?.name, withLetterhead)
  const lines = [
    `Hi ${documentData.customer?.name || 'there'},`,
    '',
    `Please find attached your ${documentData.docTypeLabel.toLowerCase()} ${documentData.reference} for ${formatCurrency(documentData.total)}.`,
  ]
  if (documentData.isInvoice && documentData.dueDate) {
    lines.push(`Payment is due by ${formatDate(documentData.dueDate)}.`)
  }
  lines.push('', 'Thank you for your business!', '', company?.name || '')

  await apiFetch('/api/email/send-invoice', {
    method: 'POST',
    body: JSON.stringify({
      to: email,
      subject: `${documentData.docTypeLabel} ${documentData.reference} from ${company?.name || ''}`,
      text: lines.join('\n'),
      pdfBase64,
      filename: saleDocumentFilename(documentData),
    }),
  })
}
