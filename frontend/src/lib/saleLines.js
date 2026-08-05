let localId = 0

export const newSaleLine = () => ({
  key: `line-${++localId}`,
  productId: '',
  quantity: '',
  unitPrice: '',
  unitIds: [],
})

export function saleLineTotal(lines) {
  return lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)
}

// originalQuantities: when editing an existing sale, maps product_id -> quantity
// already committed to stock reduction by this same sale (so it doesn't count
// against the live stock_quantity, which already reflects that reduction).
export function validateSaleLines(lines, getProduct, originalQuantities = {}) {
  if (lines.length === 0) return 'Add at least one line item.'

  for (const line of lines) {
    const product = getProduct(line.productId)
    if (!product) return 'Select a product for every line.'

    const qty = Number(line.quantity)
    if (!qty || qty <= 0) return `Enter a quantity for ${product.name}.`
    if (line.unitPrice === '' || Number(line.unitPrice) < 0) {
      return `Enter a price for ${product.name}.`
    }
    const available = product.stock_quantity + (originalQuantities[product.id] || 0)
    if (qty > available) {
      return `Only ${available} of ${product.name} in stock.`
    }
    // Scanning/typing IMEIs in is optional on a sale, not a precondition for
    // it — a shop may not have every unit's serial to hand at checkout.
    // Only guard against the one thing that would actually corrupt data:
    // more serials attached than the line's own quantity.
    if (product.tracks_serial && line.unitIds.length > qty) {
      return `${product.name}: more serial/IMEI units selected than the quantity (${qty}).`
    }
  }
  return null
}

export function buildSaleItems(lines, getProduct) {
  return lines.map((l) => {
    const product = getProduct(l.productId)
    return {
      product_id: l.productId,
      quantity: Number(l.quantity),
      unit_price: Number(l.unitPrice),
      ...(product.tracks_serial ? { unit_ids: l.unitIds } : {}),
    }
  })
}
