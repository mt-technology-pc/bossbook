import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Plus, Trash2, AlertCircle, PackageX } from 'lucide-react'
import { usePurchaseReturns } from '../../hooks/usePurchaseReturns'
import { useSuppliers } from '../../hooks/useSuppliers'
import { useProducts } from '../../hooks/useProducts'
import { usePurchases } from '../../hooks/usePurchases'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'
import ImeiPicker from '../../components/dashboard/ImeiPicker'

let localId = 0
const newLine = () => ({
  key: `line-${++localId}`,
  productId: '',
  quantity: '1',
  cost: '',
  unit_ids: [],
})

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewPurchaseReturn() {
  const navigate = useNavigate()
  const { createPurchaseReturn } = usePurchaseReturns()
  const { suppliers, addSupplier } = useSuppliers()
  const { products } = useProducts()
  const { purchases } = usePurchases()

  const [supplierId, setSupplierId] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const [reference, setReference] = useState('')
  const [returnDate, setReturnDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const supplierOptions = suppliers.map((s) => ({
    id: s.id,
    label: s.name,
    sublabel: s.phone || s.email || '',
  }))

  const handleCreateSupplier = async (name) => {
    const { data, error: createError } = await addSupplier({ name })
    if (createError) { setError(createError.message); return null }
    return { id: data.id }
  }

  const supplierPurchases = purchases.filter(
    (p) => !supplierId || p.supplier_id === supplierId,
  )
  const purchaseOptions = supplierPurchases.map((p) => ({
    id: p.id,
    label: p.reference || 'Bill',
    sublabel: formatCurrency(p.total_amount),
  }))

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))
  const selectedPurchase = purchases.find(p => p.id === purchaseId)

  // Auto-populate lines when a purchase bill is selected
  useEffect(() => {
    if (!purchaseId || !selectedPurchase?.purchase_items?.length) return
    const autoLines = selectedPurchase.purchase_items.map(item => ({
      key: `line-${++localId}`,
      productId: item.product_id || '',
      quantity: String(item.quantity),
      cost: String(item.unit_cost ?? ''),
      unit_ids: [],
    }))
    setLines(autoLines.length > 0 ? autoLines : [newLine()])
  }, [purchaseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const next = { ...l, ...patch }
        if (patch.productId !== undefined) {
          next.unit_ids = []
          if (patch.productId && productMap[patch.productId]) {
            next.cost = String(productMap[patch.productId].cost ?? '')
          }
        }
        if (patch.quantity !== undefined) next.unit_ids = []
        return next
      }),
    )
  }

  const addLine = () => setLines((prev) => [...prev, newLine()])
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))

  const lineAmount = (l) => (Number(l.quantity) || 0) * (Number(l.cost) || 0)
  const total = lines.reduce((sum, l) => sum + lineAmount(l), 0)

  const validate = () => {
    if (lines.length === 0) return 'Add at least one line item.'
    for (const l of lines) {
      if (!l.productId) return 'Select a product for every line.'
      if (!(Number(l.quantity) > 0)) return 'Enter a valid quantity for every line.'
      if (!(Number(l.cost) >= 0)) return 'Enter a unit cost for every line.'
      const prod = productMap[l.productId]
      if (prod?.tracks_serial && purchaseId) {
        const qty = Math.round(Number(l.quantity))
        if (l.unit_ids.length !== qty) {
          return `${prod.name}: select exactly ${qty} IMEI unit${qty !== 1 ? 's' : ''} to return.`
        }
      } else if (prod && Number(l.quantity) > Number(prod.stock_quantity)) {
        return `${prod.name}: return quantity (${l.quantity}) exceeds stock on hand (${prod.stock_quantity}).`
      }
    }
    return null
  }

  const submit = async () => {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError(null)
    setLoading(true)

    const items = lines.map((l) => ({
      product_id: l.productId,
      quantity: Number(l.quantity),
      cost: Number(l.cost),
      amount: lineAmount(l),
      unit_ids: l.unit_ids,
    }))

    const { error: submitError } = await createPurchaseReturn({
      supplierId: supplierId || null,
      purchaseId: purchaseId || null,
      reference: reference.trim() || null,
      returnDate: returnDate || null,
      notes: notes.trim() || null,
      items,
    })

    setLoading(false)
    if (submitError) { setError(submitError.message); return }
    navigate('/dashboard/purchases/purchase-returns')
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <PackageX size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900">Record Purchase Return</h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/purchases/purchase-returns')}
          aria-label="Cancel"
          className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full max-w-xs space-y-4">
              <div>
                <span className="text-xs font-medium text-ink-500">Supplier</span>
                <div className="mt-1.5">
                  <SearchSelect
                    value={supplierId}
                    onChange={(val) => { setSupplierId(val); setPurchaseId('') }}
                    options={supplierOptions}
                    placeholder="Select supplier (optional)"
                    createLabel="Add new"
                    onCreate={handleCreateSupplier}
                  />
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-500">Against Bill</span>
                <div className="mt-1.5">
                  <SearchSelect
                    value={purchaseId}
                    onChange={setPurchaseId}
                    options={purchaseOptions}
                    placeholder="Select bill (optional)"
                  />
                </div>
                {purchaseId && (
                  <p className="mt-1 text-xs text-ink-400">
                    Items auto-filled from bill. Adjust quantities for partial returns.
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Return total</p>
              <p className="font-heading text-3xl font-semibold text-ink-900">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-4">
            <div>
              <label className="text-xs font-medium text-ink-500">Reference</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Auto-assigned"
                className="mt-1.5 block w-40 rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-ink-500">Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="mt-1.5 block rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="mt-8 space-y-3">
            {lines.map((l) => {
              const prod = productMap[l.productId]
              const showImei = prod?.tracks_serial && purchaseId
              return (
                <div key={l.key} className="rounded-2xl border border-ink-400/15 bg-cream-50 p-4">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-start gap-2">
                    {/* Product */}
                    <div>
                      <SearchSelect
                        value={l.productId}
                        onChange={(val) => updateLine(l.key, { productId: val })}
                        options={products.map((p) => ({
                          id: p.id,
                          label: p.name,
                          sublabel: `${p.stock_quantity} in stock`,
                        }))}
                        placeholder="Select product"
                      />
                      {prod && !prod.tracks_serial && (
                        <p className="mt-1 text-xs text-ink-400">{prod.stock_quantity} available</p>
                      )}
                      {showImei && (
                        <ImeiPicker
                          mode="purchase_return"
                          productId={l.productId}
                          purchaseId={purchaseId}
                          value={l.unit_ids}
                          onChange={(ids) => updateLine(l.key, { unit_ids: ids })}
                          requiredCount={Math.round(Number(l.quantity))}
                        />
                      )}
                    </div>
                    {/* Qty */}
                    <div className="w-20">
                      <label className="text-xs text-ink-400">Qty</label>
                      <input
                        type="number"
                        value={l.quantity}
                        onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                        min="0.0001"
                        step="1"
                        className="w-full rounded-lg border border-ink-400/15 bg-cream-100 px-2 py-1.5 text-right text-xs text-ink-900 outline-none focus:border-clay-500"
                      />
                    </div>
                    {/* Unit Cost */}
                    <div className="w-28">
                      <label className="text-xs text-ink-400">Unit Cost</label>
                      <input
                        type="number"
                        value={l.cost}
                        onChange={(e) => updateLine(l.key, { cost: e.target.value })}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full rounded-lg border border-ink-400/15 bg-cream-100 px-2 py-1.5 text-right text-xs text-ink-900 outline-none focus:border-clay-500"
                      />
                    </div>
                    {/* Amount */}
                    <div className="w-28 text-right">
                      <label className="text-xs text-ink-400">Amount</label>
                      <p className="py-1.5 text-xs font-medium text-ink-900">{formatCurrency(lineAmount(l))}</p>
                    </div>
                    {/* Delete */}
                    <div className="pt-5">
                      {lines.length > 1 && (
                        <button
                          onClick={() => removeLine(l.key)}
                          className="rounded p-1 text-ink-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <button
              onClick={addLine}
              className="flex items-center gap-1.5 text-sm font-medium text-clay-600 hover:text-clay-700"
            >
              <Plus size={15} /> Add line
            </button>
          </div>

          <div className="mt-6">
            <label className="text-xs font-medium text-ink-500">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Reason for return (optional)"
              className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 resize-none"
            />
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-end gap-3 border-t border-ink-400/10 bg-cream-50 px-6 py-4">
        <Button variant="ghost" onClick={() => navigate('/dashboard/purchases/purchase-returns')}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={loading}>
          {loading ? 'Saving…' : 'Record Return'}
        </Button>
      </footer>
    </div>
  )
}
