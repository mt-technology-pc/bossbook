import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, ScanLine, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { formatCurrency } from '../../lib/currency'

let localId = 0
const newLine = () => ({
  key: `line-${++localId}`,
  productId: '',
  quantity: '',
  unitCost: '',
  serials: [],
})

export default function NewPurchaseModal({ open, onClose, onSubmit, products, suppliers }) {
  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const getProduct = (id) => products.find((p) => p.id === id)

  const close = () => {
    setSupplierId('')
    setReference('')
    setNotes('')
    setLines([newLine()])
    setError(null)
    onClose()
  }

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const next = { ...l, ...patch }

        const product = getProduct(next.productId)
        if (product?.tracks_serial) {
          const qty = Math.max(0, Number(next.quantity) || 0)
          const serials = [...next.serials]
          serials.length = qty
          next.serials = serials.map((s) => s || '')
        } else {
          next.serials = []
        }
        return next
      }),
    )
  }

  const updateSerial = (key, index, value) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const serials = [...l.serials]
        serials[index] = value
        return { ...l, serials }
      }),
    )
  }

  const addLine = () => setLines((prev) => [...prev, newLine()])
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))

  const total = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
    0,
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (lines.length === 0) {
      setError('Add at least one line item.')
      return
    }

    const seenSerials = new Set()

    for (const line of lines) {
      const product = getProduct(line.productId)
      if (!product) {
        setError('Select a product for every line.')
        return
      }
      const qty = Number(line.quantity)
      if (!qty || qty <= 0) {
        setError(`Enter a quantity for ${product.name}.`)
        return
      }
      if (line.unitCost === '' || Number(line.unitCost) < 0) {
        setError(`Enter a unit cost for ${product.name}.`)
        return
      }
      if (product.tracks_serial) {
        if (line.serials.length !== qty || line.serials.some((s) => !s.trim())) {
          setError(`Enter all ${qty} serial/IMEI number(s) for ${product.name}.`)
          return
        }
        for (const s of line.serials) {
          const trimmed = s.trim()
          if (seenSerials.has(trimmed)) {
            setError(`Duplicate serial/IMEI number: ${trimmed}`)
            return
          }
          seenSerials.add(trimmed)
        }
      }
    }

    setLoading(true)

    const items = lines.map((l) => {
      const product = getProduct(l.productId)
      return {
        product_id: l.productId,
        quantity: Number(l.quantity),
        unit_cost: Number(l.unitCost),
        ...(product.tracks_serial
          ? { serials: l.serials.map((s) => s.trim()) }
          : {}),
      }
    })

    const { error: submitError } = await onSubmit({
      supplierId: supplierId || null,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      items,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Record a bill"
      subtitle="Add stock from a supplier — quantities are added to your inventory automatically."
      size="lg"
    >
      {products.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed border-ink-400/25 py-10 text-center dark:border-cream-100/15">
          <p className="text-sm font-medium text-ink-600 dark:text-cream-300">
            Add a product first
          </p>
          <p className="mt-1 max-w-xs text-xs text-ink-400">
            You need at least one product in your catalog before you can
            record a bill.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Supplier</span>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
                >
                  <option value="">No supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Bill / reference no.</span>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Optional"
                  className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
                />
              </label>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Items</span>
              <AnimatePresence initial={false}>
                {lines.map((line) => {
                  const product = getProduct(line.productId)
                  return (
                    <motion.div
                      key={line.key}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden rounded-xl border border-ink-400/15 bg-cream-100 p-3.5 dark:border-cream-100/10 dark:bg-dark-700"
                    >
                      <div className="flex flex-wrap items-end gap-2.5">
                        <label className="min-w-[160px] flex-1">
                          <span className="text-[11px] font-medium text-ink-500 dark:text-cream-400">Product</span>
                          <select
                            value={line.productId}
                            onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                          >
                            <option value="">Select…</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </label>
                        <label className="w-20">
                          <span className="text-[11px] font-medium text-ink-500 dark:text-cream-400">Qty</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                          />
                        </label>
                        <label className="w-28">
                          <span className="text-[11px] font-medium text-ink-500 dark:text-cream-400">Unit cost</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                          />
                        </label>
                        <div className="w-24 text-right">
                          <span className="block text-[11px] font-medium text-ink-500 dark:text-cream-400">Subtotal</span>
                          <span className="mt-1 block text-sm font-semibold text-ink-900 dark:text-cream-50">
                            {formatCurrency((Number(line.quantity) || 0) * (Number(line.unitCost) || 0))}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length === 1}
                          className="mb-0.5 rounded-lg p-2 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {product?.tracks_serial && line.serials.length > 0 && (
                        <div className="mt-3 rounded-lg border border-clay-500/20 bg-clay-500/5 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-medium text-clay-600 dark:text-clay-400">
                            <ScanLine size={12} /> Enter each unit&apos;s serial / IMEI
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {line.serials.map((s, i) => (
                              <input
                                key={i}
                                value={s}
                                onChange={(e) => updateSerial(line.key, i, e.target.value)}
                                placeholder={`Unit ${i + 1}`}
                                className="rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-700"
              >
                <Plus size={15} /> Add another item
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional"
                className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
              />
            </label>

            <div className="flex items-center justify-between border-t border-ink-400/10 pt-4 dark:border-cream-100/10">
              <div>
                <p className="text-xs text-ink-400">Bill total</p>
                <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">
                  {formatCurrency(total)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Saving…' : 'Save bill'}
                </Button>
              </div>
            </div>
          </form>
        </>
      )}
    </Modal>
  )
}
