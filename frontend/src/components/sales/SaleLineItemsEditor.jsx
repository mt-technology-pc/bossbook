import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Copy, ScanLine, Search } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'
import { newSaleLine } from '../../lib/saleLines'
import SearchSelect from '../ui/SearchSelect'

export default function SaleLineItemsEditor({
  lines, setLines, products, availableUnits, priceLabel = 'Rate', stockAdjustments = {},
}) {
  const [unitSearch, setUnitSearch] = useState({})

  const getProduct = (id) => products.find((p) => p.id === id)

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

  const toggleUnit = (key, unitId, quantity) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const already = l.unitIds.includes(unitId)
        if (already) return { ...l, unitIds: l.unitIds.filter((id) => id !== unitId) }
        if (l.unitIds.length >= quantity) return l
        return { ...l, unitIds: [...l.unitIds, unitId] }
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
            const units = product ? availableUnits.forProduct(product.id) : []
            const qty = Math.max(0, Number(line.quantity) || 0)
            const search = (unitSearch[line.key] || '').trim().toLowerCase()
            const visibleUnits = search
              ? units.filter((u) => u.serial_number.toLowerCase().includes(search) || line.unitIds.includes(u.id))
              : units

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
                  <div className="mt-3 rounded-lg border border-clay-500/20 bg-clay-500/5 p-3">
                    <p className="flex items-center gap-1.5 text-[11px] font-medium text-clay-600">
                      <ScanLine size={12} /> Select {qty} unit{qty === 1 ? '' : 's'} to sell
                      <span className="ml-auto font-semibold">{line.unitIds.length}/{qty} selected</span>
                    </p>
                    {units.length === 0 ? (
                      <p className="mt-2 text-xs text-ink-400">No units in stock for this product.</p>
                    ) : (
                      <>
                        <div className="relative mt-2">
                          <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-400" />
                          <input
                            value={unitSearch[line.key] || ''}
                            onChange={(e) => setUnitSearch((prev) => ({ ...prev, [line.key]: e.target.value }))}
                            placeholder="Search serial/IMEI…"
                            className="w-full rounded-lg border border-ink-400/20 bg-cream-50 py-1.5 pl-7 pr-2.5 text-xs text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500"
                          />
                        </div>
                        {visibleUnits.length === 0 ? (
                          <p className="mt-2 text-xs text-ink-400">No units match &quot;{unitSearch[line.key]}&quot;.</p>
                        ) : (
                          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                            {visibleUnits.map((u) => {
                              const checked = line.unitIds.includes(u.id)
                              return (
                                <label
                                  key={u.id}
                                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                                    checked
                                      ? 'border-clay-500 bg-clay-500/10 text-clay-700'
                                      : 'border-ink-400/20 text-ink-600 hover:border-ink-400/40'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleUnit(line.key, u.id, qty)}
                                    className="h-3.5 w-3.5 rounded border-ink-400/30 text-clay-500 focus:ring-clay-500"
                                  />
                                  <span className="truncate font-mono">{u.serial_number}</span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
