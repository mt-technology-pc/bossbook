import { jsPDF } from 'jspdf'
import { formatCurrency } from './currency'

const WIDTH = 80 // mm — standard thermal receipt roll width
const MARGIN = 4

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'short' })
}

// Thermal printers are a continuous roll, not a fixed page — so instead of
// paginating, the PDF's own page height is sized to fit everything on one
// "page". This estimate mirrors the exact draw calls below line-for-line;
// it errs high (a little blank space at the end) rather than low (which
// would clip content off the bottom), since jsPDF never grows a page.
function estimateHeight(data, companyName) {
  let h = MARGIN * 2
  if (companyName) h += 5
  const companyLines = [data.companyAddress, data.companyPhone, data.companyEmail].filter(Boolean)
  h += companyLines.length * 3.5
  h += 4 + 3.5 + 3 // doc type + reference + date lines
  h += 4 // divider

  if (data.customer) h += 4
  if (data.salesRep) h += 4
  if (data.customer || data.salesRep) h += 4 // divider

  for (const li of data.lineItems) {
    const nameLines = Math.max(1, Math.ceil(li.name.length / 32))
    h += nameLines * 3.5 + 4.5
  }
  h += 4 // divider

  h += 5 + 4 // total + amount paid
  if (data.customerBalance != null && data.customerBalance > 0) h += 4

  if (data.notes) {
    h += 4 // divider
    const noteLines = Math.max(1, Math.ceil(data.notes.length / 34))
    h += noteLines * 3.5
  }

  h += 4 + 6 // final divider + "Thank you!"
  return Math.max(h + 6, 60) // small safety buffer
}

// data: output of buildSaleDocumentData() in saleDocument.js — mirrors
// SaleDocumentPos.jsx's content/order so the PDF and the printed receipt
// agree, even though jsPDF can't render that component's DOM directly.
export async function buildSaleDocumentPosPdf(data, companyName) {
  const height = estimateHeight(data, companyName)
  const doc = new jsPDF({ unit: 'mm', format: [WIDTH, height] })
  const centerX = WIDTH / 2
  let y = MARGIN

  const divider = () => {
    doc.setDrawColor(0, 0, 0)
    doc.setLineDashPattern([1, 1], 0)
    doc.line(MARGIN, y, WIDTH - MARGIN, y)
    doc.setLineDashPattern([], 0)
    y += 4
  }

  doc.setTextColor(0, 0, 0)

  if (companyName) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(companyName, centerX, y, { align: 'center' })
    y += 5
  }

  const companyLines = [data.companyAddress, data.companyPhone, data.companyEmail].filter(Boolean)
  if (companyLines.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    for (const line of companyLines) {
      doc.text(line, centerX, y, { align: 'center' })
      y += 3.5
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(data.docTypeLabel.toUpperCase(), centerX, y, { align: 'center' })
  y += 4

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`No. ${data.reference}`, centerX, y, { align: 'center' })
  y += 3.5
  doc.text(formatDate(data.date), centerX, y, { align: 'center' })
  y += 3
  divider()

  if (data.customer) {
    doc.text(`Customer: ${data.customer.name}`, MARGIN, y)
    y += 4
  }
  if (data.salesRep) {
    doc.text(`Sales rep: ${data.salesRep}`, MARGIN, y)
    y += 4
  }
  if (data.customer || data.salesRep) divider()

  doc.setFontSize(8)
  for (const li of data.lineItems) {
    doc.setFont('helvetica', 'bold')
    const nameLines = doc.splitTextToSize(li.name, WIDTH - MARGIN * 2)
    doc.text(nameLines, MARGIN, y)
    y += nameLines.length * 3.5

    doc.setFont('helvetica', 'normal')
    doc.text(`${li.quantity} x ${formatCurrency(li.unitPrice)}`, MARGIN, y)
    doc.text(formatCurrency(li.subtotal), WIDTH - MARGIN, y, { align: 'right' })
    y += 4.5
  }
  divider()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('TOTAL', MARGIN, y)
  doc.text(formatCurrency(data.total), WIDTH - MARGIN, y, { align: 'right' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Amount Paid', MARGIN, y)
  doc.text(formatCurrency(data.amountPaid), WIDTH - MARGIN, y, { align: 'right' })
  y += 4

  if (data.customerBalance != null && data.customerBalance > 0) {
    doc.setFont('helvetica', 'bold')
    doc.text('Total Owed', MARGIN, y)
    doc.text(formatCurrency(data.customerBalance), WIDTH - MARGIN, y, { align: 'right' })
    y += 4
  }

  if (data.notes) {
    divider()
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const wrapped = doc.splitTextToSize(data.notes, WIDTH - MARGIN * 2)
    doc.text(wrapped, MARGIN, y)
    y += wrapped.length * 3.5
  }

  divider()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Thank you!', centerX, y, { align: 'center' })

  return doc
}
