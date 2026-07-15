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

export function validateSaleLines(lines, getProduct) {
  if (lines.length === 0) return 'Add at least one line item.'

  for (const line of lines) {
    const product = getProduct(line.productId)
    if (!product) return 'Select a product for every line.'

    const qty = Number(line.quantity)
    if (!qty || qty <= 0) return `Enter a quantity for ${product.name}.`
    if (line.unitPrice === '' || Number(line.unitPrice) < 0) {
      return `Enter a price for ${product.name}.`
    }
    if (qty > product.stock_quantity) {
      return `Only ${product.stock_quantity} of ${product.name} in stock.`
    }
    if (product.tracks_serial && line.unitIds.length !== qty) {
      return `Select ${qty} serial/IMEI unit(s) for ${product.name}.`
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
