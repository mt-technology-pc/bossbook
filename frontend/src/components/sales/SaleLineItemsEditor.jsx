import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Copy } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import { newSaleLine } from '../../lib/saleLines'
import SearchSelect from '../ui/SearchSelect'
import SerialSlotGrid from './SerialSlotGrid'

export default function SaleLineItemsEditor({
  lines, setLines, products, availableUnits, priceLabel = 'Rate', stockAdjustments = {}, onAllLinesComplete,
}) {
  const getProduct = (id) => products.find((p) => p.id === id)

  // Focuses the newly-selected product's first scan slot without making it
  // part of line state (must never survive a duplicateLine spread or reach
  // buildSaleItems). Cleared after every render — child mount effects run
  // first, so SerialSlotGrid always sees it before it's gone.
  const autoFocusKeyRef = useRef(null)
  useEffect(() => {
    autoFocusKeyRef.current = null
  })

  // line.key -> SerialSlotGrid imperative handle, so a completed line can
  // hand focus to the next serialized line (or the page's submit button).
  const lineRefs = useRef(new Map())
  const handleLineComplete = (fromKey) => {
    const idx = lines.findIndex((l) => l.key === fromKey)
    for (let i = idx + 1; i < lines.length; i += 1) {
      const next = lines[i]
      const nextProduct = getProduct(next.productId)
      if (nextProduct?.tracks_serial && Number(next.quantity) > 0) {
        lineRefs.current.get(next.key)?.focusFirstEmptySlot()
        return
      }
    }
    onAllLinesComplete?.()
  }

  const productOptions = products.map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: `${p.stock_quantity + (stockAdjustments[p.id] || 0)} in stock`,
  }))

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const next = { ...l, ...patch }
        const product = getProduct(next.productId)

        if ('productId' in patch) {
          next.unitIds = []
          if (product) {
            if (!next.unitPrice) next.unitPrice = String(product.price)
            if (!next.quantity) next.quantity = '1'
          }
          autoFocusKeyRef.current = key
        }
        if (product?.tracks_serial) {
          const qty = Math.max(0, Number(next.quantity) || 0)
          if (next.unitIds.length > qty) next.unitIds = next.unitIds.slice(0, qty)
        } else {
          next.unitIds = []
        }
        return next
      }),
    )
  }

  const addLine = () => setLines((prev) => [...prev, newSaleLine()])
  const clearLines = () => setLines([newSaleLine()])
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))
  const duplicateLine = (key) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === key)
      if (idx === -1) return prev
      const clone = { ...prev[idx], key: `line-${Math.random().toString(36).slice(2)}`, unitIds: [] }
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-ink-900">
          Items
        </h2>
        <button
          type="button"
          onClick={clearLines}
          className="text-xs font-medium text-ink-400 hover:text-red-500"
        >
          Clear all lines
        </button>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-ink-400/15 bg-cream-50">
        <div className="hidden grid-cols-[2fr_80px_100px_100px_72px] gap-2 border-b border-ink-400/10 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-400 sm:grid">
          <span>Product</span>
          <span>Qty</span>
          <span>{priceLabel}</span>
          <span className="text-right">Amount</span>
          <span />
        </div>

        <AnimatePresence initial={false}>
          {lines.map((line) => {
            const product = getProduct(line.productId)
            const qty = Math.max(0, Number(line.quantity) || 0)
            const usedElsewhere = new Set()
            for (const l of lines) {
              if (l.key === line.key) continue
              for (const id of l.unitIds) usedElsewhere.add(id)
            }

            return (
              <motion.div
                key={line.key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-ink-400/10 px-4 py-3 last:border-0"
              >
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[2fr_80px_100px_100px_72px] sm:items-center">
                  <div className="col-span-2 sm:col-span-1">
                    <SearchSelect
                      value={line.productId}
                      onChange={(val) => updateLine(line.key, { productId: val })}
                      options={productOptions}
                      placeholder="Select a product…"
                    />
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    placeholder="Qty"
                    className="rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                    placeholder="0.00"
                    className="rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500"
                  />
                  <div className="col-span-2 flex items-center justify-between gap-1 sm:justify-end">
                    <span className="whitespace-nowrap text-sm font-semibold text-ink-900">
                      {formatCurrency((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0))}
                    </span>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => duplicateLine(line.key)}
                        aria-label="Duplicate line"
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        aria-label="Remove line"
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {product?.tracks_serial && qty > 0 && (
                  <SerialSlotGrid
                    ref={(el) => {
                      if (el) lineRefs.current.set(line.key, el)
                      else lineRefs.current.delete(line.key)
                    }}
                    line={line}
                    product={product}
                    availableUnits={availableUnits}
                    stockAdjustment={stockAdjustments[product.id] || 0}
                    usedElsewhere={usedElsewhere}
                    autoFocus={autoFocusKeyRef.current === line.key}
                    onChangeUnitIds={(unitIds) => updateLine(line.key, { unitIds })}
                    onGrowQuantity={(nextQty) => updateLine(line.key, { quantity: String(nextQty) })}
                    onLineComplete={() => handleLineComplete(line.key)}
                  />
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>

        <button
          type="button"
          onClick={addLine}
          className="flex w-full items-center gap-1.5 border-t border-ink-400/10 px-4 py-3 text-sm font-medium text-clay-600 hover:bg-cream-100"
        >
          <Plus size={15} /> Add lines
        </button>
      </div>
    </div>
  )
}
