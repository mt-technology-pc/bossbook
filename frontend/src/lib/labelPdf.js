import { jsPDF } from 'jspdf'
import { barcodeImage, qrImage } from './labelCodes.js'

const A4 = { width: 210, height: 297 }
const PAGE_MARGIN = 8
const LABEL_GAP = 2
const PAD = 1.5

export const THERMAL_PRESETS = [
  { value: '50x20', label: '50 × 20 mm', width: 50, height: 20 },
  { value: '50x30', label: '50 × 30 mm', width: 50, height: 30 },
  { value: '40x30', label: '40 × 30 mm', width: 40, height: 30 },
  { value: '100x50', label: '100 × 50 mm', width: 100, height: 50 },
  { value: 'custom', label: 'Custom size', width: null, height: null },
]

function fit(srcW, srcH, maxW, maxH) {
  const ratio = Math.min(maxW / srcW, maxH / srcH)
  return { w: srcW * ratio, h: srcH * ratio }
}

// A label is a list of independent layers — like a stripped-down design
// tool, not an auto-layout stack. Each layer has a type ('text' | 'barcode'
// | 'qr' | 'image') and a fractional (0–1) x/y/w/h relative to the label, so
// a saved layout stays valid across label sizes. Text layers either bind to
// a product field (field: 'name' | 'code', re-rendered per item) or carry
// static custom text (field: null, `text` used verbatim on every label).
// Barcode/QR layers always encode the product's own code/name — they aren't
// user-editable content, just position/size.
export const DEFAULT_ELEMENTS = [
  { id: 'name', type: 'text', field: 'name', text: '', x: 0.04, y: 0.03, w: 0.92, h: 0.20 },
  { id: 'barcode', type: 'barcode', x: 0.04, y: 0.25, w: 0.56, h: 0.50 },
  { id: 'qr', type: 'qr', x: 0.64, y: 0.25, w: 0.32, h: 0.50 },
  { id: 'code', type: 'text', field: 'code', text: '', x: 0.04, y: 0.78, w: 0.92, h: 0.18 },
]

export function cloneDefaultElements() {
  return DEFAULT_ELEMENTS.map((el) => ({ ...el }))
}

function truncateToWidth(doc, text, maxWidth) {
  if (doc.getTextWidth(text) <= maxWidth) return text
  let truncated = text
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

// Expands [{ name, code, quantity }] into one flat entry per physical
// label to print (a quantity of 3 becomes 3 consecutive instances).
export function expandInstances(items) {
  const instances = []
  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1)
    for (let i = 0; i < qty; i += 1) instances.push(item)
  }
  return instances
}

export function computeA4Grid(labelWidth, labelHeight) {
  const usableW = A4.width - PAGE_MARGIN * 2
  const usableH = A4.height - PAGE_MARGIN * 2
  const cols = Math.max(1, Math.floor((usableW + LABEL_GAP) / (labelWidth + LABEL_GAP)))
  const rows = Math.max(1, Math.floor((usableH + LABEL_GAP) / (labelHeight + LABEL_GAP)))
  return { cols, rows, perPage: cols * rows }
}

function imageFormat(dataUrl) {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl)
  const type = match ? match[1].toUpperCase() : 'PNG'
  return type === 'JPG' ? 'JPEG' : type
}

async function drawLabel(doc, x, y, w, h, item, options) {
  const { showBorder, elements } = options
  const layers = elements && elements.length ? elements : DEFAULT_ELEMENTS

  if (showBorder) {
    doc.setDrawColor(170)
    doc.setLineWidth(0.15)
    doc.rect(x, y, w, h)
  }

  for (const el of layers) {
    const bx = x + el.x * w
    const by = y + el.y * h
    const bw = Math.max(el.w * w - PAD * 0.5, 2)
    const bh = Math.max(el.h * h - PAD * 0.5, 2)

    if (el.type === 'text') {
      const content = el.field === 'name' ? item.name : el.field === 'code' ? item.code : (el.text || '')
      if (!content) continue
      doc.setFont('helvetica', el.field ? 'bold' : 'normal')
      doc.setFontSize(Math.max(5, Math.min(16, bh * 2.4)))
      const label = truncateToWidth(doc, content, bw)
      doc.text(label, bx + bw / 2, by + bh / 2 + bh * 0.15, { align: 'center' })
    } else if (el.type === 'barcode') {
      const bc = barcodeImage(item.code)
      const bcFit = fit(bc.width, bc.height, bw, bh)
      doc.addImage(bc.dataUrl, 'PNG', bx + (bw - bcFit.w) / 2, by + (bh - bcFit.h) / 2, bcFit.w, bcFit.h)
    } else if (el.type === 'qr') {
      // eslint-disable-next-line no-await-in-loop
      const qr = await qrImage(`${item.name} | ${item.code}`)
      const qrSize = Math.min(bw, bh)
      doc.addImage(qr.dataUrl, 'PNG', bx + (bw - qrSize) / 2, by + (bh - qrSize) / 2, qrSize, qrSize)
    } else if (el.type === 'image' && el.src) {
      const imgFit = fit(el.naturalW || bw, el.naturalH || bh, bw, bh)
      doc.addImage(el.src, imageFormat(el.src), bx + (bw - imgFit.w) / 2, by + (bh - imgFit.h) / 2, imgFit.w, imgFit.h)
    }
  }
}

// options: { mode: 'thermal' | 'a4', labelWidth, labelHeight, showBorder, elements }
export async function buildLabelsPdf(items, options) {
  const instances = expandInstances(items)
  if (instances.length === 0) throw new Error('Add at least one product to print.')

  const { mode, labelWidth: w, labelHeight: h } = options

  if (mode === 'thermal') {
    const doc = new jsPDF({ unit: 'mm', format: [w, h], orientation: w >= h ? 'landscape' : 'portrait' })
    for (let i = 0; i < instances.length; i += 1) {
      if (i > 0) doc.addPage([w, h], w >= h ? 'landscape' : 'portrait')
      // eslint-disable-next-line no-await-in-loop
      await drawLabel(doc, 0, 0, w, h, instances[i], options)
    }
    return doc
  }

  // A4 grid mode
  const { cols, perPage } = computeA4Grid(w, h)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  for (let i = 0; i < instances.length; i += 1) {
    const pageIndex = Math.floor(i / perPage)
    const posInPage = i % perPage
    if (pageIndex > 0 && posInPage === 0) doc.addPage('a4', 'portrait')

    const col = posInPage % cols
    const row = Math.floor(posInPage / cols)
    const x = PAGE_MARGIN + col * (w + LABEL_GAP)
    const y = PAGE_MARGIN + row * (h + LABEL_GAP)
    // eslint-disable-next-line no-await-in-loop
    await drawLabel(doc, x, y, w, h, instances[i], options)
  }

  return doc
}
