// Shapes a saved sale record into the flat structure both the on-screen
// print layout (SaleDocument.jsx) and the PDF builder (saleDocumentPdf.js)
// draw from, so the two stay in sync from one source instead of each
// re-deriving line items/totals independently.
export function buildSaleDocumentData({ sale, customer, products }) {
  const isInvoice = sale.type === 'invoice'

  const lineItems = (sale.sale_items || []).map((item) => {
    const product = products.find((p) => p.id === item.product_id)
    return {
      name: product?.name || 'Unknown product',
      sku: product?.sku || '',
      quantity: item.quantity,
      unitPrice: Number(item.unit_price) || 0,
      subtotal: Number(item.subtotal) || 0,
    }
  })

  const total = lineItems.reduce((sum, li) => sum + li.subtotal, 0)

  return {
    isInvoice,
    docTypeLabel: isInvoice ? 'Invoice' : 'Sales Receipt',
    reference: sale.reference || '—',
    date: sale.sale_date,
    dueDate: sale.due_date || null,
    customer: customer
      ? {
          name: customer.name,
          phone: customer.phone || null,
          email: customer.email || null,
          address: customer.address || null,
        }
      : null,
    lineItems,
    total,
    notes: sale.notes || '',
  }
}

// Filesystem-safe filename fragment: strip anything that isn't a letter,
// number, space or dash, then collapse whitespace to single dashes.
function slug(text) {
  return String(text || '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export function saleDocumentFilename(data) {
  if (data.isInvoice) {
    const customerPart = slug(data.customer?.name) || 'customer'
    return `Invoice-${slug(data.reference)}-${customerPart}.pdf`
  }
  return `Receipt-${slug(data.reference)}-${data.date || 'undated'}.pdf`
}
