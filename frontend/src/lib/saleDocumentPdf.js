import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoSrc from '../assets/logo.png'
import { formatCurrency } from './currency'

const MARGIN = 14
const PAGE_HEIGHT = 297 // A4 portrait, mm

let cachedLogo = null

// jsPDF's addImage needs actual pixel data (data URL / canvas), not a bare
// asset URL — draw the already-bundled logo onto a canvas once and cache
// the result for the life of the page (this fires once per PDF, not once
// per line item).
function loadLogoDataUrl() {
  if (cachedLogo) return Promise.resolve(cachedLogo)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      cachedLogo = {
        dataUrl: canvas.toDataURL('image/png'),
        ratio: img.naturalHeight / img.naturalWidth,
      }
      resolve(cachedLogo)
    }
    img.onerror = reject
    img.src = logoSrc
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

  const logo = await loadLogoDataUrl()
  const logoWidth = 32
  doc.addImage(logo.dataUrl, 'PNG', MARGIN, MARGIN, logoWidth, logoWidth * logo.ratio)

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

  let cursorY = MARGIN + 32
  doc.setDrawColor(220, 216, 206)
  doc.line(MARGIN, cursorY, rightX, cursorY)
  cursorY += 8

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

  const body = data.lineItems.map((li) => [
    li.sku ? `${li.name}\n${li.sku}` : li.name,
    String(li.quantity),
    formatCurrency(li.unitPrice),
    formatCurrency(li.subtotal),
  ])

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
  }

  return doc
}
