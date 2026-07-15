import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Trash2, Copy, ScanLine, AlertCircle, Receipt, ShoppingBag,
} from 'lucide-react'
import { usePurchases } from '../../hooks/usePurchases'
import { useProducts } from '../../hooks/useProducts'
import { useSuppliers } from '../../hooks/useSuppliers'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'

let localId = 0
const newLine = () => ({
  key: `line-${++localId}`,
  productId: '',
  quantity: '',
  unitCost: '',
  serials: [],
})

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewPurchase() {
  const navigate = useNavigate()
  const { createPurchase } = usePurchases()
  const { products, refetch: refetchProducts } = useProducts()
  const { suppliers, addSupplier } = useSuppliers()

  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    label: s.name,
    sublabel: s.phone || s.email || '',
  }))

  const handleCreateSupplier = async (name) => {
    const { data, error: createError } = await addSupplier({ name })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  const [supplierId, setSupplierId] = useState('')
  const [reference, setReference] = useState('')
  const [billDate, setBillDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const getProduct = (id) => products.find((p) => p.id === id)

  const resetForm = () => {
    setSupplierId('')
    setReference('')
    setBillDate(todayISO())
    setDueDate('')
    setNotes('')
    setLines([newLine()])
    setError(null)
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
  const clearLines = () => setLines([newLine()])
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))
  const duplicateLine = (key) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === key)
      if (idx === -1) return prev
      const source = prev[idx]
      const product = getProduct(source.productId)
      const clone = {
        ...source,
        key: `line-${++localId}`,
        // Serials must stay unique — don't carry them over.
        serials: product?.tracks_serial ? source.serials.map(() => '') : [],
      }
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]
    })
  }

  const total = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0),
    0,
  )

  const validate = () => {
    if (lines.length === 0) return 'Add at least one line item.'

    const seenSerials = new Set()

    for (const line of lines) {
      const product = getProduct(line.productId)
      if (!product) return 'Select a product for every line.'

      const qty = Number(line.quantity)
      if (!qty || qty <= 0) return `Enter a quantity for ${product.name}.`
      if (line.unitCost === '' || Number(line.unitCost) < 0) {
        return `Enter a unit cost for ${product.name}.`
      }
      if (product.tracks_serial) {
        if (line.serials.length !== qty || line.serials.some((s) => !s.trim())) {
          return `Enter all ${qty} serial/IMEI number(s) for ${product.name}.`
        }
        for (const s of line.serials) {
          const trimmed = s.trim()
          if (seenSerials.has(trimmed)) return `Duplicate serial/IMEI number: ${trimmed}`
          seenSerials.add(trimmed)
        }
      }
    }
    return null
  }

  const buildItems = () =>
    lines.map((l) => {
      const product = getProduct(l.productId)
      return {
        product_id: l.productId,
        quantity: Number(l.quantity),
        unit_cost: Number(l.unitCost),
        ...(product.tracks_serial ? { serials: l.serials.map((s) => s.trim()) } : {}),
      }
    })

  const submit = async ({ andNew }) => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)

    const { error: submitError } = await createPurchase({
      supplierId: supplierId || null,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      billDate: billDate || null,
      dueDate: dueDate || null,
      items: buildItems(),
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchProducts()

    if (andNew) resetForm()
    else navigate('/dashboard/purchases')
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100 dark:bg-dark-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
            <Receipt size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
            New bill
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/purchases')}
          aria-label="Cancel"
          className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 dark:hover:bg-dark-700 dark:hover:text-cream-200"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          {products.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-400/25 bg-cream-50 py-16 text-center dark:border-cream-100/15 dark:bg-dark-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
                <ShoppingBag size={20} />
              </span>
              <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
                Add a product first
              </p>
              <p className="mt-1 max-w-xs text-xs text-ink-400">
                You need at least one product in your catalog before you can record a bill.
              </p>
              <Button
                variant="outline"
                className="mt-5"
                onClick={() => navigate('/dashboard/inventory', { state: { autoOpen: true } })}
              >
                <Plus size={15} /> Add product
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="w-full max-w-sm">
                  <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Supplier</span>
                  <div className="mt-1.5">
                    <SearchSelect
                      value={supplierId}
                      onChange={setSupplierId}
                      options={supplierOptions}
                      placeholder="Choose a supplier"
                      createLabel="Add new"
                      onCreate={handleCreateSupplier}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Balance due
                  </p>
                  <p className="font-heading text-3xl font-semibold text-ink-900 dark:text-cream-50">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Bill date</span>
                  <input
                    type="date"
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Due date</span>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Bill no.</span>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Optional"
                    className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                  />
                </label>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-base font-semibold text-ink-900 dark:text-cream-50">
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

                <div className="mt-3 overflow-hidden rounded-2xl border border-ink-400/15 bg-cream-50 dark:border-cream-100/10 dark:bg-dark-800">
                  <div className="hidden grid-cols-[2fr_80px_100px_100px_72px] gap-2 border-b border-ink-400/10 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-400 dark:border-cream-100/10 sm:grid">
                    <span>Product</span>
                    <span>Qty</span>
                    <span>Unit cost</span>
                    <span className="text-right">Subtotal</span>
                    <span />
                  </div>

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
                          className="overflow-hidden border-b border-ink-400/10 px-4 py-3 last:border-0 dark:border-cream-100/10"
                        >
                          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[2fr_80px_100px_100px_72px] sm:items-center">
                            <select
                              value={line.productId}
                              onChange={(e) => updateLine(line.key, { productId: e.target.value })}
                              className="col-span-2 rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50 sm:col-span-1"
                            >
                              <option value="">Select a product…</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                              placeholder="Qty"
                              className="rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
                            />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitCost}
                              onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                              placeholder="Cost"
                              className="rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 dark:border-cream-100/10 dark:bg-dark-700 dark:text-cream-50"
                            />
                            <div className="flex items-center justify-between gap-1 sm:justify-end">
                              <span className="text-sm font-semibold text-ink-900 dark:text-cream-50 sm:hidden">
                                {formatCurrency((Number(line.quantity) || 0) * (Number(line.unitCost) || 0))}
                              </span>
                              <span className="hidden text-sm font-semibold text-ink-900 dark:text-cream-50 sm:block">
                                {formatCurrency((Number(line.quantity) || 0) * (Number(line.unitCost) || 0))}
                              </span>
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => duplicateLine(line.key)}
                                  aria-label="Duplicate line"
                                  className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 dark:hover:bg-dark-700 dark:hover:text-cream-200"
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
                    className="flex w-full items-center gap-1.5 border-t border-ink-400/10 px-4 py-3 text-sm font-medium text-clay-600 hover:bg-cream-100 dark:border-cream-100/10 dark:text-clay-400 dark:hover:bg-dark-700"
                  >
                    <Plus size={15} /> Add lines
                  </button>
                </div>

                <div className="mt-3 flex justify-end">
                  <p className="text-sm text-ink-500 dark:text-cream-400">
                    Total{' '}
                    <span className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
                      {formatCurrency(total)}
                    </span>
                  </p>
                </div>
              </div>

              <label className="mt-8 block max-w-xl">
                <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Memo</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional"
                  className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 dark:border-cream-100/10 dark:bg-dark-800 dark:text-cream-50"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {products.length > 0 && (
        <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-400/10 bg-cream-50 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard/purchases')}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            <Button variant="outline" disabled={loading} onClick={() => submit({ andNew: true })}>
              {loading ? 'Saving…' : 'Save and new'}
            </Button>
            <Button variant="primary" disabled={loading} onClick={() => submit({ andNew: false })}>
              {loading ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
