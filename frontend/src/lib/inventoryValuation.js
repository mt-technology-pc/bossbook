// Real inventory valuation, computed by replaying actual purchase and sale
// history rather than trusting a single rolling `cost` field. Supports the
// three methods that can be computed honestly from what this system tracks
// today: FIFO (cost layers), moving weighted average, and standard cost.
//
// Known limitation, disclosed rather than hidden: opening stock entered
// directly on a product (before any purchase bill exists for it) has no
// dated cost layer of its own — we back-calculate its quantity from the
// current running total and value it at the product's recorded cost.

export const VALUATION_METHODS = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'weighted_average', label: 'Weighted Average Cost' },
  { value: 'standard', label: 'Standard Cost' },
]

function endOfDay(dateStr) {
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d
}

function openingLayer(product, purchaseItems, saleItems) {
  const totalPurchased = purchaseItems.reduce((sum, p) => sum + p.quantity, 0)
  const totalSold = saleItems.reduce((sum, s) => sum + s.quantity, 0)
  const qty = Math.max(0, Number(product.stock_quantity) - totalPurchased + totalSold)
  return { qty, unitCost: Number(product.cost) || 0, date: product.created_at }
}

function buildEvents(product, purchaseItems, saleItems, asOfDate) {
  const events = []
  const opening = openingLayer(product, purchaseItems, saleItems)

  if (opening.qty > 0) {
    events.push({
      type: 'in', date: opening.date, qty: opening.qty, unitCost: opening.unitCost,
      label: 'Opening stock', kind: 'opening',
    })
  }

  purchaseItems.forEach((p) => {
    events.push({
      type: 'in',
      date: p.purchases?.bill_date,
      qty: p.quantity,
      unitCost: Number(p.unit_cost),
      label: p.purchases?.reference ? `Purchase · ${p.purchases.reference}` : 'Purchase',
      kind: 'purchase',
    })
  })

  saleItems.forEach((s) => {
    const isInvoice = s.sales?.type === 'invoice'
    events.push({
      type: 'out',
      date: s.sales?.sale_date,
      qty: s.quantity,
      unitPrice: Number(s.unit_price),
      label: s.sales?.reference
        ? `${isInvoice ? 'Invoice' : 'Sale receipt'} · ${s.sales.reference}`
        : (isInvoice ? 'Invoice' : 'Sale receipt'),
      kind: 'sale',
    })
  })

  const cutoff = endOfDay(asOfDate)

  return events
    .filter((e) => e.date && new Date(e.date) <= cutoff)
    .sort((a, b) => {
      const diff = new Date(a.date) - new Date(b.date)
      if (diff !== 0) return diff
      if (a.type !== b.type) return a.type === 'in' ? -1 : 1
      return 0
    })
}

function computeFIFO(events) {
  const layers = []
  const ledger = []

  events.forEach((e) => {
    let cogs
    if (e.type === 'in') {
      layers.push({ qty: e.qty, unitCost: e.unitCost })
    } else {
      let remaining = e.qty
      cogs = 0
      while (remaining > 0 && layers.length > 0) {
        const layer = layers[0]
        const consumed = Math.min(layer.qty, remaining)
        cogs += consumed * layer.unitCost
        layer.qty -= consumed
        remaining -= consumed
        if (layer.qty <= 0) layers.shift()
      }
    }
    const qtyOnHand = layers.reduce((sum, l) => sum + l.qty, 0)
    const value = layers.reduce((sum, l) => sum + l.qty * l.unitCost, 0)
    ledger.push({ ...e, balanceQty: qtyOnHand, balanceValue: value, cogs })
  })

  const qtyOnHand = layers.reduce((sum, l) => sum + l.qty, 0)
  const totalValue = layers.reduce((sum, l) => sum + l.qty * l.unitCost, 0)

  return {
    qtyOnHand,
    unitCost: qtyOnHand > 0 ? totalValue / qtyOnHand : 0,
    totalValue,
    ledger,
  }
}

function computeWeightedAverage(events) {
  let qty = 0
  let value = 0
  let avgCost = 0
  const ledger = []

  events.forEach((e) => {
    let cogs
    if (e.type === 'in') {
      value += e.qty * e.unitCost
      qty += e.qty
      avgCost = qty > 0 ? value / qty : 0
    } else {
      const consumed = Math.min(qty, e.qty)
      cogs = consumed * avgCost
      value -= cogs
      qty -= consumed
    }
    qty = Math.max(0, qty)
    value = Math.max(0, value)
    ledger.push({ ...e, balanceQty: qty, balanceValue: value, unitCostAtPoint: avgCost, cogs })
  })

  return { qtyOnHand: qty, unitCost: avgCost, totalValue: value, ledger }
}

function computeStandardCost(events, standardCost) {
  let qty = 0
  const ledger = []

  events.forEach((e) => {
    let cogs
    if (e.type === 'out') cogs = Math.min(qty, e.qty) * standardCost
    qty += e.type === 'in' ? e.qty : -e.qty
    qty = Math.max(0, qty)
    ledger.push({ ...e, balanceQty: qty, balanceValue: qty * standardCost, unitCostAtPoint: standardCost, cogs })
  })

  return { qtyOnHand: qty, unitCost: standardCost, totalValue: qty * standardCost, ledger }
}

export function computeProductValuation(product, purchaseItems, saleItems, { asOfDate, method }) {
  const events = buildEvents(product, purchaseItems, saleItems, asOfDate)

  if (method === 'fifo') return computeFIFO(events)
  if (method === 'weighted_average') return computeWeightedAverage(events)
  return computeStandardCost(events, Number(product.cost) || 0)
}
