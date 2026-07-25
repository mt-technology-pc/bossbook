// Named starting layouts — each just a distinct `elements` array + a
// suggested label size, the exact same shape LabelGenerator already
// saves/restores for "Saved designs". These don't add new infrastructure,
// just faster starting points than the single hardcoded default layout.
export const LABEL_TEMPLATES = [
  {
    id: 'product',
    label: 'Product Label',
    width: 50,
    height: 30,
    elements: [
      { id: 'name', type: 'text', field: 'name', text: '', x: 0.04, y: 0.03, w: 0.92, h: 0.20 },
      { id: 'barcode', type: 'barcode', format: 'CODE128', showText: false, x: 0.04, y: 0.25, w: 0.56, h: 0.50 },
      { id: 'qr', type: 'qr', x: 0.64, y: 0.25, w: 0.32, h: 0.50 },
      { id: 'code', type: 'text', field: 'code', text: '', x: 0.04, y: 0.78, w: 0.92, h: 0.18 },
    ],
  },
  {
    id: 'price-tag',
    label: 'Price Tag',
    width: 40,
    height: 20,
    elements: [
      { id: 'name', type: 'text', field: 'name', text: '', fontSize: 8, x: 0.04, y: 0.04, w: 0.92, h: 0.22 },
      { id: 'price', type: 'text', field: 'price', text: '', bold: true, fontSize: 13, x: 0.04, y: 0.28, w: 0.92, h: 0.34 },
      { id: 'barcode', type: 'barcode', format: 'CODE128', showText: true, textFontSize: 5, x: 0.08, y: 0.64, w: 0.84, h: 0.32 },
    ],
  },
  {
    id: 'shelf-tag',
    label: 'Shelf Tag',
    width: 60,
    height: 40,
    elements: [
      { id: 'name', type: 'text', field: 'name', text: '', bold: true, fontSize: 12, x: 0.04, y: 0.04, w: 0.92, h: 0.22 },
      { id: 'price', type: 'text', field: 'price', text: '', bold: true, fontSize: 18, x: 0.04, y: 0.28, w: 0.92, h: 0.32 },
      { id: 'barcode', type: 'barcode', format: 'CODE128', showText: true, textFontSize: 6, x: 0.04, y: 0.64, w: 0.6, h: 0.32 },
      { id: 'code', type: 'text', field: 'code', text: '', fontSize: 6, x: 0.68, y: 0.7, w: 0.28, h: 0.2 },
    ],
  },
  {
    id: 'shipping',
    label: 'Shipping Label',
    width: 100,
    height: 150,
    elements: [
      { id: 'name', type: 'text', field: 'name', text: '', bold: true, fontSize: 16, x: 0.06, y: 0.04, w: 0.88, h: 0.10 },
      { id: 'barcode', type: 'barcode', format: 'CODE128', showText: true, textFontSize: 9, x: 0.1, y: 0.20, w: 0.8, h: 0.30 },
      { id: 'qr', type: 'qr', x: 0.3, y: 0.55, w: 0.4, h: 0.30 },
      { id: 'code', type: 'text', field: 'code', text: '', fontSize: 8, x: 0.1, y: 0.88, w: 0.8, h: 0.08 },
    ],
  },
]

export function cloneTemplate(id) {
  const template = LABEL_TEMPLATES.find((t) => t.id === id) || LABEL_TEMPLATES[0]
  return {
    ...template,
    elements: template.elements.map((el) => ({ ...el })),
  }
}
