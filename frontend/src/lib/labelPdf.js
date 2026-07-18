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

// Fractional (0–1) positions/sizes relative to the label — free-floating
// boxes a user can drag/resize on the canvas editor, independent of one
// another (so hiding one doesn't reflow the rest, matching a design-tool
// mental model rather than an auto-layout stack).
export const DEFAULT_ELEMENTS = {
  name: { x: 0.04, y: 0.03, w: 0.92, h: 0.20 },
  barcode: { x: 0.04, y: 0.25, w: 0.56, h: 0.50 },
  qr: { x: 0.64, y: 0.25, w: 0.32, h: 0.50 },
  code: { x: 0.04, y: 0.78, w: 0.92, h: 0.18 },
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

async function drawLabel(doc, x, y, w, h, item, options) {
  const { showBarcode, showQr, showName, showCode, showBorder, elements } = options
  const pos = { ...DEFAULT_ELEMENTS, ...elements }

  if (showBorder) {
    doc.setDrawColor(170)
    doc.setLineWidth(0.15)
    doc.rect(x, y, w, h)
  }

  const box = (key) => {
    const p = pos[key] || DEFAULT_ELEMENTS[key]
    return {
      bx: x + p.x * w,
      by: y + p.y * h,
      bw: Math.max(p.w * w - PAD * 0.5, 2),
      bh: Math.max(p.h * h - PAD * 0.5, 2),
    }
  }

  if (showName) {
    const { bx, by, bw, bh } = box('name')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(Math.max(5, Math.min(16, bh * 2.4)))
    const label = truncateToWidth(doc, item.name, bw)
    doc.text(label, bx + bw / 2, by + bh / 2 + bh * 0.15, { align: 'center' })
  }

  if (showBarcode) {
    const { bx, by, bw, bh } = box('barcode')
    const bc = barcodeImage(item.code)
    const bcFit = fit(bc.width, bc.height, bw, bh)
    doc.addImage(bc.dataUrl, 'PNG', bx + (bw - bcFit.w) / 2, by + (bh - bcFit.h) / 2, bcFit.w, bcFit.h)
  }

  if (showQr) {
    const { bx, by, bw, bh } = box('qr')
    const qr = await qrImage(`${item.name} | ${item.code}`)
    const qrSize = Math.min(bw, bh)
    doc.addImage(qr.dataUrl, 'PNG', bx + (bw - qrSize) / 2, by + (bh - qrSize) / 2, qrSize, qrSize)
  }

  if (showCode) {
    const { bx, by, bw, bh } = box('code')
    doc.setFont('courier', 'normal')
    doc.setFontSize(Math.max(5, Math.min(12, bh * 2)))
    const label = truncateToWidth(doc, item.code, bw)
    doc.text(label, bx + bw / 2, by + bh / 2 + bh * 0.15, { align: 'center' })
  }
}

// options: { mode: 'thermal' | 'a4', labelWidth, labelHeight, showBarcode,
// showQr, showName, showCode, showBorder }
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
