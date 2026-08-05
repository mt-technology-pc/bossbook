import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Plus, Trash2, AlertCircle, RotateCcw } from 'lucide-react'
import { useCreditNotes } from '../../hooks/useCreditNotes'
import { useCustomers } from '../../hooks/useCustomers'
import { useProducts } from '../../hooks/useProducts'
import { useSales } from '../../hooks/useSales'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'
import ImeiPicker from '../../components/dashboard/ImeiPicker'

let localId = 0
const newLine = () => ({
  key: `line-${++localId}`,
  productId: '',
  description: '',
  quantity: '1',
  unitPrice: '',
  unit_ids: [],
})

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewCreditNote() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { creditNotes, createCreditNote, updateCreditNote } = useCreditNotes()
  const { customers, addCustomer } = useCustomers()
  const { products } = useProducts()
  const { sales } = useSales()

  const [customerId, setCustomerId] = useState('')
  const [saleId, setSaleId] = useState('')
  const [reference, setReference] = useState('')
  const [creditDate, setCreditDate] = useState(todayISO())
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)

  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.phone || c.email || '',
  }))

  const handleCreateCustomer = async (name) => {
    const { data, error: createError } = await addCustomer({ name })
    if (createError) { setError(createError.message); return null }
    return { id: data.id }
  }

  const customerSales = sales.filter(
    (s) => (s.type === 'invoice' || s.type === 'receipt') &&
           (!customerId || s.customer_id === customerId),
  )
  const saleOptions = customerSales.map((s) => ({
    id: s.id,
    label: s.reference || (s.type === 'invoice' ? 'Invoice' : 'Receipt'),
    sublabel: `${s.type === 'invoice' ? 'Invoice' : 'Receipt'} · ${formatCurrency(s.total_amount)}`,
  }))

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]))

  // Load the existing credit note's fields + line items once, when editing.
  // Serialized-product lines also need their previously-returned unit_ids
  // resolved from product_unit_events, since credit_note_items itself
  // doesn't store which specific IMEI units were picked.
  useEffect(() => {
    if (!isEdit || loaded || creditNotes.length === 0) return
    const existing = creditNotes.find((cn) => cn.id === id)
    if (!existing) return

    let cancelled = false
    supabase
      .from('product_unit_events')
      .select('product_unit_id, product_id')
      .eq('source_table', 'credit_notes')
      .eq('source_id', id)
      .eq('event_type', 'customer_return')
      .then(({ data }) => {
        if (cancelled) return
        const events = data ?? []
        const consumed = {}
        const items = [...(existing.credit_note_items || [])].sort(
          (a, b) => (a.created_at || '').localeCompare(b.created_at || ''),
        )
        const builtLines = items.map((item) => {
          const already = consumed[item.product_id] || 0
          const productEvents = events.filter((e) => e.product_id === item.product_id)
          const unit_ids = productEvents
            .slice(already, already + Number(item.quantity))
            .map((e) => e.product_unit_id)
          consumed[item.product_id] = already + Number(item.quantity)
          return {
            key: `line-${++localId}`,
            productId: item.product_id || '',
            description: item.description || '',
            quantity: String(item.quantity),
            unitPrice: String(item.unit_price ?? ''),
            unit_ids,
          }
        })

        setCustomerId(existing.customer_id || '')
        setSaleId(existing.sale_id || '')
        setReference(existing.reference || '')
        setCreditDate(existing.credit_date || todayISO())
        setNotes(existing.notes || '')
        setLines(builtLines.length > 0 ? builtLines : [newLine()])
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, loaded, creditNotes, id])

  // Auto-populate lines when the user picks a sale — an explicit handler
  // rather than a useEffect keyed on saleId, so the load effect above can
  // set saleId from existing data (including back to '' or to the same
  // value it already was) without also having to guess whether that
  // reactive effect will fire this render to know if it needs suppressing.
  const handleSaleSelect = (val) => {
    setSaleId(val)
    const sale = sales.find((s) => s.id === val)
    if (!sale?.sale_items?.length) {
      setLines([newLine()])
      return
    }
    const autoLines = sale.sale_items.map(item => {
      const prod = productMap[item.product_id]
      return {
        key: `line-${++localId}`,
        productId: item.product_id || '',
        description: prod?.name || '',
        quantity: String(item.quantity),
        unitPrice: String(item.unit_price ?? ''),
        unit_ids: [],
      }
    })
    setLines(autoLines.length > 0 ? autoLines : [newLine()])
  }

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const next = { ...l, ...patch }
        if (patch.productId !== undefined) {
          next.unit_ids = []
          if (patch.productId && productMap[patch.productId]) {
            next.description = productMap[patch.productId].name
            next.unitPrice = String(productMap[patch.productId].selling_price ?? '')
          }
        }
        if (patch.quantity !== undefined) next.unit_ids = []
        return next
      }),
    )
  }

  const addLine = () => setLines((prev) => [...prev, newLine()])
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))

  const lineAmount = (l) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)
  const total = lines.reduce((sum, l) => sum + lineAmount(l), 0)

  const validate = () => {
    if (lines.length === 0) return 'Add at least one line item.'
    for (const l of lines) {
      if (!l.description.trim() && !l.productId) return 'Enter a description or select a product for every line.'
      if (!(Number(l.quantity) > 0)) return 'Enter a valid quantity for every line.'
      if (!(Number(l.unitPrice) >= 0)) return 'Enter a unit price for every line.'
      const prod = productMap[l.productId]
      if (prod?.tracks_serial && saleId) {
        // IMEI selection is optional here too, same reasoning as sales —
        // only block the one thing that would misrepresent the return:
        // more units selected than the line actually claims.
        const qty = Math.round(Number(l.quantity))
        if (l.unit_ids.length > qty) {
          return `${prod.name}: more IMEI units selected than the quantity (${qty}).`
        }
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
      product_id: l.productId || null,
      description: l.description.trim() || (productMap[l.productId]?.name ?? ''),
      quantity: Number(l.quantity),
      unit_price: Number(l.unitPrice),
      amount: lineAmount(l),
      unit_ids: l.unit_ids,
    }))

    const payload = {
      customerId: customerId || null,
      saleId: saleId || null,
      reference: reference.trim() || null,
      creditDate: creditDate || null,
      notes: notes.trim() || null,
      items,
    }

    const { error: submitError } = isEdit
      ? await updateCreditNote(id, payload)
      : await createCreditNote(payload)

    setLoading(false)
    if (submitError) { setError(submitError.message); return }
    navigate('/dashboard/sales/credit-notes')
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <RotateCcw size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900">
            {isEdit ? 'Edit Credit Note' : 'New Credit Note'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/sales/credit-notes')}
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
                <span className="text-xs font-medium text-ink-500">Customer</span>
                <div className="mt-1.5">
                  <SearchSelect
                    value={customerId}
                    onChange={(val) => { setCustomerId(val); setSaleId('') }}
                    options={customerOptions}
                    placeholder="Select customer (optional)"
                    createLabel="Add new"
                    onCreate={handleCreateCustomer}
                  />
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-ink-500">Against Invoice / Receipt</span>
                <div className="mt-1.5">
                  <SearchSelect
                    value={saleId}
                    onChange={handleSaleSelect}
                    options={saleOptions}
                    placeholder="Select invoice or receipt (optional)"
                  />
                </div>
                {saleId && (
                  <p className="mt-1 text-xs text-ink-400">
                    Items auto-filled from sale. Adjust quantities for partial returns.
                  </p>
                )}
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Credit total</p>
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
              <label className="text-xs font-medium text-ink-500">Credit Date</label>
              <input
                type="date"
                value={creditDate}
                onChange={(e) => setCreditDate(e.target.value)}
                className="mt-1.5 block rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="mt-8 space-y-3">
            {lines.map((l) => {
              const prod = productMap[l.productId]
              const showImei = prod?.tracks_serial && saleId
              return (
                <div key={l.key} className="rounded-2xl border border-ink-400/15 bg-cream-50 p-4">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-start gap-2">
                    {/* Product / Description */}
                    <div>
                      <SearchSelect
                        value={l.productId}
                        onChange={(val) => updateLine(l.key, { productId: val })}
                        options={products.map((p) => ({
                          id: p.id,
                          label: p.name,
                          sublabel: `${p.stock_quantity} in stock`,
                        }))}
                        placeholder="Product (optional)"
                      />
                      <input
                        value={l.description}
                        onChange={(e) => updateLine(l.key, { description: e.target.value })}
                        placeholder="Description"
                        className="mt-1.5 w-full rounded-lg border border-ink-400/15 bg-cream-100 px-3 py-1.5 text-xs text-ink-900 outline-none focus:border-clay-500"
                      />
                      {showImei && (
                        <ImeiPicker
                          mode="credit_note"
                          productId={l.productId}
                          saleId={saleId}
                          creditNoteId={isEdit ? id : undefined}
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
                    {/* Unit Price */}
                    <div className="w-28">
                      <label className="text-xs text-ink-400">Unit Price</label>
                      <input
                        type="number"
                        value={l.unitPrice}
                        onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
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
              placeholder="Internal notes (optional)"
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
        <Button variant="ghost" onClick={() => navigate('/dashboard/sales/credit-notes')}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={loading || !loaded}>
          {!loaded ? 'Loading…' : loading ? 'Saving…' : isEdit ? 'Save changes' : 'Issue Credit Note'}
        </Button>
      </footer>
    </div>
  )
}
