// Shapes a saved sale record into the flat structure both the on-screen
// print layout (SaleDocument.jsx) and the PDF builder (saleDocumentPdf.js)
// draw from, so the two stay in sync from one source instead of each
// re-deriving line items/totals independently.
export function buildSaleDocumentData({ sale, customer, products, balance, customerBalance }) {
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

  // Without real payment-allocation data, assume settled rather than
  // flashing a false "balance due" warning while that data is still loading.
  const amountPaid = balance ? balance.paidAmount : total
  const balanceDue = balance ? balance.outstanding : 0
  const isSettled = balanceDue <= 0.004

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
    salesRep: sale.sales_reps?.name || null,
    lineItems,
    total,
    amountPaid,
    balanceDue,
    isSettled,
    // Customer's overall balance across all their invoices/receipts,
    // already inclusive of this sale (since it's saved) — null when
    // there's no customer or the caller didn't pass one in.
    customerBalance: customer && customerBalance != null ? Number(customerBalance) : null,
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
