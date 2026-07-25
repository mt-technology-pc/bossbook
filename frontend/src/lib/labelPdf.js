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

// A handful of common sheet-label sizes for A4 grid mode — not a full
// Avery SKU catalog (100+ product codes), which would be a data-
// maintenance burden disproportionate to what a small business needs.
// Dimensions describe the physical label size/layout generically rather
// than claiming exact compatibility with a specific branded product code.
export const SHEET_PRESETS = [
  { id: 'auto', label: 'Auto (fit as many as possible)' },
  { id: 'address-30up', label: 'Address labels — 30/sheet (~63.5×38.1mm)', width: 63.5, height: 38.1, cols: 3, rows: 10, marginX: 4.75, marginY: 12.7, gapX: 2.5, gapY: 0 },
  { id: 'shipping-6up', label: 'Shipping labels — 6/sheet (~99×93mm)', width: 99.1, height: 93.1, cols: 2, rows: 3, marginX: 4.7, marginY: 14, gapX: 3, gapY: 0 },
  { id: 'round-24up', label: 'Round labels — 24/sheet (⌀38.1mm)', width: 38.1, height: 38.1, cols: 4, rows: 6, marginX: 12, marginY: 13, gapX: 3, gapY: 3 },
]

// Exported so the on-screen editor (BarcodeImageNode/QrImageNode) can use
// the exact same aspect-ratio-preserving math as PDF export — otherwise
// the editor stretches an image to fill its box exactly while the PDF
// letterboxes it, and the live preview visibly disagrees with the print.
export function fit(srcW, srcH, maxW, maxH) {
  const ratio = Math.min(maxW / srcW, maxH / srcH)
  return { w: srcW * ratio, h: srcH * ratio }
}

// A label is a list of independent layers — like a stripped-down design
// tool, not an auto-layout stack. Each layer has a type ('text' | 'barcode'
// | 'qr' | 'image' | 'shape') and a fractional (0–1) x/y/w/h relative to
// the label, so a saved layout stays valid across label sizes. Text layers
// either bind to a product field (field: 'name' | 'code' | 'price',
// re-rendered per item) or carry static custom text (field: null, `text`
// used verbatim on every label). Barcode layers can also bind `field` the
// same way (defaults to the product code when unset); QR always encodes
// the product's own name + code.
export const DEFAULT_ELEMENTS = [
  { id: 'name', type: 'text', field: 'name', text: '', x: 0.04, y: 0.03, w: 0.92, h: 0.20 },
  { id: 'barcode', type: 'barcode', format: 'CODE128', x: 0.04, y: 0.25, w: 0.56, h: 0.50 },
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

function fieldValue(el, item) {
  if (el.field === 'name') return item.name
  if (el.field === 'code') return item.code
  if (el.field === 'price') return item.price != null ? String(item.price) : ''
  return el.text || ''
}

// Expands [{ name, code, price, quantity }] into one flat entry per
// physical label to print (a quantity of 3 becomes 3 consecutive
// instances).
export function expandInstances(items) {
  const instances = []
  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1)
    for (let i = 0; i < qty; i += 1) instances.push(item)
  }
  return instances
}

export function computeA4Grid(labelWidth, labelHeight, sheetPresetId) {
  const preset = SHEET_PRESETS.find((p) => p.id === sheetPresetId && p.id !== 'auto')
  if (preset) {
    return {
      cols: preset.cols, rows: preset.rows, perPage: preset.cols * preset.rows,
      marginX: preset.marginX, marginY: preset.marginY, gapX: preset.gapX, gapY: preset.gapY,
      cellWidth: preset.width, cellHeight: preset.height,
    }
  }
  const usableW = A4.width - PAGE_MARGIN * 2
  const usableH = A4.height - PAGE_MARGIN * 2
  const cols = Math.max(1, Math.floor((usableW + LABEL_GAP) / (labelWidth + LABEL_GAP)))
  const rows = Math.max(1, Math.floor((usableH + LABEL_GAP) / (labelHeight + LABEL_GAP)))
  return {
    cols, rows, perPage: cols * rows,
    marginX: PAGE_MARGIN, marginY: PAGE_MARGIN, gapX: LABEL_GAP, gapY: LABEL_GAP,
    cellWidth: labelWidth, cellHeight: labelHeight,
  }
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
    const rotation = el.rotation || 0

    if (el.type === 'text') {
      const content = fieldValue(el, item)
      if (!content) continue
      const fontStyle = [el.bold ? 'bold' : '', el.italic ? 'italic' : ''].filter(Boolean).join('') || 'normal'
      doc.setFont('helvetica', fontStyle)
      const fontSize = el.fontSize || Math.max(5, Math.min(16, bh * 2.4))
      doc.setFontSize(Math.max(5, Math.min(72, fontSize)))
      if (el.color) {
        const rgb = hexToRgb(el.color)
        if (rgb) doc.setTextColor(rgb.r, rgb.g, rgb.b)
      } else {
        doc.setTextColor(0, 0, 0)
      }
      if (el.background) {
        const rgb = hexToRgb(el.background)
        if (rgb) {
          doc.setFillColor(rgb.r, rgb.g, rgb.b)
          doc.rect(bx, by, bw, bh, 'F')
        }
      }
      const align = el.align || 'center'
      const label = truncateToWidth(doc, content, bw)
      const textX = align === 'left' ? bx : align === 'right' ? bx + bw : bx + bw / 2
      doc.text(label, textX, by + bh / 2 + bh * 0.15, { align, angle: rotation, charSpace: el.letterSpacing || undefined })
      if (el.underline) {
        const textWidth = doc.getTextWidth(label)
        const underlineX = align === 'left' ? bx : align === 'right' ? bx + bw - textWidth : bx + bw / 2 - textWidth / 2
        const underlineY = by + bh / 2 + bh * 0.15 + 0.8
        doc.setDrawColor(0, 0, 0)
        doc.setLineWidth(0.15)
        doc.line(underlineX, underlineY, underlineX + textWidth, underlineY)
      }
    } else if (el.type === 'barcode') {
      const value = el.field ? fieldValue(el, item) : item.code
      if (!value) continue
      const bc = barcodeImage(value, { format: el.format || 'CODE128', displayValue: el.showText, fontSize: (el.textFontSize || 8) * 10 })
      const bcFit = fit(bc.width, bc.height, bw, bh)
      doc.addImage(bc.dataUrl, 'PNG', bx + (bw - bcFit.w) / 2, by + (bh - bcFit.h) / 2, bcFit.w, bcFit.h, undefined, undefined, rotation)
    } else if (el.type === 'qr') {
      // eslint-disable-next-line no-await-in-loop
      const qr = await qrImage(`${item.name} | ${item.code}`)
      const qrSize = Math.min(bw, bh)
      doc.addImage(qr.dataUrl, 'PNG', bx + (bw - qrSize) / 2, by + (bh - qrSize) / 2, qrSize, qrSize, undefined, undefined, rotation)
    } else if (el.type === 'image' && el.src) {
      const imgFit = fit(el.naturalW || bw, el.naturalH || bh, bw, bh)
      doc.addImage(el.src, imageFormat(el.src), bx + (bw - imgFit.w) / 2, by + (bh - imgFit.h) / 2, imgFit.w, imgFit.h, undefined, undefined, rotation)
    } else if (el.type === 'shape') {
      // Shape rotation isn't mirrored here — jsPDF has no native rotation
      // for rect/line/circle primitives without manual transformation-
      // matrix math, disproportionate for what's usually a decorative
      // element. Text/image/barcode/QR rotation above is fully supported.
      const fillRgb = hexToRgb(el.fill)
      const strokeRgb = hexToRgb(el.stroke)
      if (fillRgb) doc.setFillColor(fillRgb.r, fillRgb.g, fillRgb.b)
      if (strokeRgb) doc.setDrawColor(strokeRgb.r, strokeRgb.g, strokeRgb.b)
      doc.setLineWidth((el.strokeWidth || 1) * 0.2)
      const style = fillRgb && strokeRgb ? 'FD' : fillRgb ? 'F' : 'S'
      if (el.shapeKind === 'rect') {
        doc.roundedRect(bx, by, bw, bh, Math.min(el.radius || 0, bw / 2, bh / 2) * 0.2, Math.min(el.radius || 0, bw / 2, bh / 2) * 0.2, style)
      } else if (el.shapeKind === 'circle') {
        doc.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, style)
      } else if (el.shapeKind === 'line') {
        doc.setLineWidth((el.strokeWidth || 2) * 0.2)
        doc.line(bx, by + bh / 2, bx + bw, by + bh / 2)
      }
    }
  }
}

function hexToRgb(hex) {
  if (!hex || typeof hex !== 'string') return null
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) return null
  const int = parseInt(match[1], 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

// options: { mode: 'thermal' | 'a4', labelWidth, labelHeight, showBorder, elements, sheetPresetId }
export async function buildLabelsPdf(items, options) {
  const instances = expandInstances(items)
  if (instances.length === 0) throw new Error('Add at least one product to print.')

  const { mode, labelWidth: w, labelHeight: h, sheetPresetId } = options

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
  const grid = computeA4Grid(w, h, sheetPresetId)
  const { cols, perPage, marginX, marginY, gapX, gapY, cellWidth, cellHeight } = grid
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  for (let i = 0; i < instances.length; i += 1) {
    const pageIndex = Math.floor(i / perPage)
    const posInPage = i % perPage
    if (pageIndex > 0 && posInPage === 0) doc.addPage('a4', 'portrait')

    const col = posInPage % cols
    const row = Math.floor(posInPage / cols)
    const x = marginX + col * (cellWidth + gapX)
    const y = marginY + row * (cellHeight + gapY)
    // eslint-disable-next-line no-await-in-loop
    await drawLabel(doc, x, y, cellWidth, cellHeight, instances[i], options)
  }

  return doc
}
