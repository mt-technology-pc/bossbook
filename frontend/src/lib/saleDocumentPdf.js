import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoSrc from '../assets/logo.png'
import { formatCurrency } from './currency'
import { barcodeImage } from './labelCodes'

const MARGIN = 14
const PAGE_HEIGHT = 297 // A4 portrait, mm

// jsPDF's addImage needs actual pixel data (data URL / canvas), not a bare
// asset URL — draw the logo onto a canvas once and cache the result. Keyed
// by URL (not a single variable) since different companies now have
// different logos in the same browser session; a bare per-page variable
// would leak the first company's logo onto every later PDF.
const logoCache = new Map()

// Uploaded logos can be up to 2MB at whatever resolution the owner's
// original file was (e.g. a 2000px-wide PNG) — embedded on the page at
// only ~32mm wide, that's wildly more pixel data than print needs, and
// bloats the PDF (and, for the email feature, the base64 upload) by many
// times over. 500px is comfortably sharp even at large print sizes.
const MAX_LOGO_PX = 500

// A thrown error inside img.onload/onerror (a plain DOM event callback,
// not the Promise executor itself) does NOT reject the promise — it's an
// uncaught exception the browser just logs, and the promise then hangs
// forever with no resolve/reject ever called. Confirmed live: a real
// company logo hosted on Supabase Storage without permissive-enough CORS
// taints the canvas, canvas.toDataURL() throws inside onload, and every
// caller (Download PDF, Email, SMS) just silently hung — no error, no
// timeout, nothing sent — until this was wrapped properly.
function loadLogoDataUrl(url) {
  const key = url || 'default'
  if (logoCache.has(key)) return Promise.resolve(logoCache.get(key))
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Needed for cross-origin company logos (Supabase Storage) so the
    // canvas isn't "tainted" and toDataURL() doesn't throw; a harmless
    // no-op for the same-origin bundled default.
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const scale = Math.min(1, MAX_LOGO_PX / Math.max(img.naturalWidth, img.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth * scale
        canvas.height = img.naturalHeight * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        const result = {
          dataUrl: canvas.toDataURL('image/png'),
          ratio: img.naturalHeight / img.naturalWidth,
        }
        logoCache.set(key, result)
        resolve(result)
      } catch (err) {
        // Canvas got tainted, or some other draw-time failure — fall back
        // to the bundled default rather than let a cosmetic logo problem
        // hang/fail the whole document. Only actually rejects if even the
        // bundled default (same-origin, never tainted) somehow fails too.
        if (url) loadLogoDataUrl(null).then(resolve).catch(reject)
        else reject(err)
      }
    }
    img.onerror = () => {
      if (url) loadLogoDataUrl(null).then(resolve).catch(reject)
      else reject(new Error('Could not load the default logo image.'))
    }
    img.src = url || logoSrc
  })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

// data: output of buildSaleDocumentData() in saleDocument.js — this mirrors
// SaleDocument.jsx's content/order so the PDF and the printed page agree,
// even though jsPDF can't render that component's DOM directly.
export async function buildSaleDocumentPdf(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const rightX = pageWidth - MARGIN

  const logo = await loadLogoDataUrl(data.companyLogoUrl)
  const logoWidth = 32
  doc.addImage(logo.dataUrl, 'PNG', MARGIN, MARGIN, logoWidth, logoWidth * logo.ratio)

  let companyY = MARGIN + logoWidth * logo.ratio + 4
  const companyLines = [data.companyAddress, data.companyPhone, data.companyEmail].filter(Boolean)
  if (companyLines.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(110, 105, 95)
    for (const line of companyLines) {
      doc.text(line, MARGIN, companyY)
      companyY += 3.8
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(data.docTypeLabel.toUpperCase(), rightX, MARGIN + 6, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(110, 105, 95)
  let y = MARGIN + 13
  doc.text(`No. ${data.reference}`, rightX, y, { align: 'right' })
  y += 5
  doc.text(`Date: ${formatDate(data.date)}`, rightX, y, { align: 'right' })
  if (data.isInvoice) {
    y += 5
    doc.text(`Due: ${formatDate(data.dueDate)}`, rightX, y, { align: 'right' })
  }

  // The divider sits below whichever column (logo + company info on the
  // left, or doc type/reference/date on the right) actually runs deeper —
  // a fixed offset here previously overlapped the Bill To block whenever
  // a company's logo was tall or it had 2-3 lines of contact info.
  let cursorY = Math.max(companyY, y) + 6
  doc.setDrawColor(220, 216, 206)
  doc.line(MARGIN, cursorY, rightX, cursorY)
  cursorY += 8

  const billToStartY = cursorY

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(140, 134, 120)
  doc.text('BILL TO', MARGIN, cursorY)
  cursorY += 5

  doc.setFontSize(10)
  if (data.customer) {
    doc.setTextColor(30, 27, 22)
    doc.setFont('helvetica', 'bold')
    doc.text(data.customer.name, MARGIN, cursorY)
    cursorY += 5
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 57, 41)
    for (const line of [data.customer.address, data.customer.phone, data.customer.email].filter(Boolean)) {
      doc.text(line, MARGIN, cursorY)
      cursorY += 5
    }
  } else {
    doc.setTextColor(60, 57, 41)
    doc.text('Walk-in customer', MARGIN, cursorY)
    cursorY += 5
  }

  if (data.salesRep) {
    let repY = billToStartY
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(140, 134, 120)
    doc.text('SALES REP', rightX, repY, { align: 'right' })
    repY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(30, 27, 22)
    doc.text(data.salesRep, rightX, repY, { align: 'right' })
  }

  const body = data.lineItems.map((li) => {
    const lines = [li.name]
    if (li.sku) lines.push(li.sku)
    if (li.serials?.length > 0) lines.push(`IMEI: ${li.serials.join(', ')}`)
    return [lines.join('\n'), String(li.quantity), formatCurrency(li.unitPrice), formatCurrency(li.subtotal)]
  })

  autoTable(doc, {
    startY: cursorY + 4,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Item', 'Qty', 'Unit Price', 'Subtotal']],
    body,
    showHead: 'everyPage',
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 27, 22] },
    headStyles: { fillColor: [0, 71, 171], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'right', cellWidth: 20 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
  })

  let afterTableY = doc.lastAutoTable.finalY + 8
  if (afterTableY > PAGE_HEIGHT - 50) {
    doc.addPage()
    afterTableY = MARGIN
  }

  doc.setDrawColor(30, 27, 22)
  doc.setLineWidth(0.4)
  doc.line(rightX - 70, afterTableY, rightX, afterTableY)
  afterTableY += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(30, 27, 22)
  doc.text('Total', rightX - 70, afterTableY)
  doc.text(formatCurrency(data.total), rightX, afterTableY, { align: 'right' })
  afterTableY += 10

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(60, 57, 41)
  doc.text('Amount Paid', rightX - 70, afterTableY)
  doc.text(formatCurrency(data.amountPaid), rightX, afterTableY, { align: 'right' })
  afterTableY += 8

  if (data.customerBalance != null && data.customerBalance > 0) {
    doc.setDrawColor(220, 216, 206)
    doc.setLineWidth(0.3)
    doc.line(rightX - 90, afterTableY, rightX, afterTableY)
    afterTableY += 5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(30, 27, 22)
    doc.text('Total Owed by Customer', rightX - 90, afterTableY)
    doc.text(formatCurrency(data.customerBalance), rightX, afterTableY, { align: 'right' })
    afterTableY += 8
  } else {
    afterTableY += 2
  }

  if (data.isInvoice && data.dueDate) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(110, 105, 95)
    doc.text(`Payment due by ${formatDate(data.dueDate)}.`, MARGIN, afterTableY)
    afterTableY += 8
  }

  if (data.notes) {
    if (afterTableY > PAGE_HEIGHT - 30) {
      doc.addPage()
      afterTableY = MARGIN
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(140, 134, 120)
    doc.text('NOTES', MARGIN, afterTableY)
    afterTableY += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(60, 57, 41)
    const wrapped = doc.splitTextToSize(data.notes, pageWidth - MARGIN * 2)
    doc.text(wrapped, MARGIN, afterTableY)
    afterTableY += wrapped.length * 4.2
  }

  // Barcode is anchored to the true bottom of the last page (not just
  // "wherever content happens to end"), pushing to a fresh page if
  // whatever's above would otherwise run into its reserved space.
  if (data.reference && data.reference !== '—') {
    const BARCODE_RESERVE = 24
    if (afterTableY > PAGE_HEIGHT - BARCODE_RESERVE) {
      doc.addPage()
    }
    const barcode = barcodeImage(data.reference)
    const barcodeHeight = 10
    const barcodeWidth = (barcode.width / barcode.height) * barcodeHeight
    const barcodeX = pageWidth / 2 - barcodeWidth / 2
    const barcodeY = PAGE_HEIGHT - 18
    doc.addImage(barcode.dataUrl, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(30, 27, 22)
    doc.text(data.reference, pageWidth / 2, barcodeY + barcodeHeight + 3.5, { align: 'center' })
  }

  return doc
}
