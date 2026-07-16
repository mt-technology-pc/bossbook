import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { X, Plus, AlertCircle, FileText, ShoppingBag } from 'lucide-react'
import { useSales } from '../../hooks/useSales'
import { useProducts } from '../../hooks/useProducts'
import { useCustomers } from '../../hooks/useCustomers'
import { useAvailableUnits } from '../../hooks/useAvailableUnits'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import { newSaleLine, saleLineTotal, validateSaleLines, buildSaleItems } from '../../lib/saleLines'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'
import SaleLineItemsEditor from '../../components/sales/SaleLineItemsEditor'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function addDaysISO(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default function NewInvoice() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { sales, createSale, updateSale } = useSales()
  const { products, refetch: refetchProducts } = useProducts()
  const { customers, addCustomer } = useCustomers()
  const availableUnits = useAvailableUnits()

  const [customerId, setCustomerId] = useState('')
  const [reference, setReference] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(addDaysISO(30))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newSaleLine()])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)
  const [ownUnits, setOwnUnits] = useState([])
  const [originalQuantities, setOriginalQuantities] = useState({})

  const getProduct = (id) => products.find((p) => p.id === id)

  useEffect(() => {
    if (!isEdit || loaded || sales.length === 0 || products.length === 0) return
    const existing = sales.find((s) => s.id === id)
    if (!existing) return

    let cancelled = false
    supabase.from('product_units').select('id, product_id, serial_number').eq('sale_id', id)
      .then(({ data }) => {
        if (cancelled) return
        const units = data ?? []
        const consumed = {}
        const quantities = {}
        const builtLines = existing.sale_items.map((item) => {
          const product = getProduct(item.product_id)
          quantities[item.product_id] = (quantities[item.product_id] || 0) + item.quantity
          const line = newSaleLine()
          line.productId = item.product_id
          line.quantity = String(item.quantity)
          line.unitPrice = String(item.unit_price)
          if (product?.tracks_serial) {
            const already = consumed[item.product_id] || 0
            const productUnits = units.filter((u) => u.product_id === item.product_id)
            line.unitIds = productUnits.slice(already, already + item.quantity).map((u) => u.id)
            consumed[item.product_id] = already + item.quantity
          }
          return line
        })

        setCustomerId(existing.customer_id || '')
        setReference(existing.reference || '')
        setInvoiceDate(existing.sale_date)
        setDueDate(existing.due_date || '')
        setNotes(existing.notes || '')
        setLines(builtLines.length > 0 ? builtLines : [newSaleLine()])
        setOwnUnits(units)
        setOriginalQuantities(quantities)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, loaded, sales, products, id])

  const mergedAvailableUnits = {
    ...availableUnits,
    forProduct: (productId) => [
      ...availableUnits.forProduct(productId),
      ...ownUnits.filter((u) => u.product_id === productId),
    ],
  }

  const customerOptions = customers.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.phone || c.email || '',
  }))

  const handleCreateCustomer = async (name) => {
    const { data, error: createError } = await addCustomer({ name })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  const resetForm = () => {
    setCustomerId('')
    setReference('')
    setInvoiceDate(todayISO())
    setDueDate(addDaysISO(30))
    setNotes('')
    setLines([newSaleLine()])
    setError(null)
  }

  const total = saleLineTotal(lines)

  const submit = async ({ andNew }) => {
    if (!customerId) {
      setError('Select a customer for this invoice.')
      return
    }
    const validationError = validateSaleLines(lines, getProduct, originalQuantities)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)

    const payload = {
      customerId,
      type: 'invoice',
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      saleDate: invoiceDate || null,
      dueDate: dueDate || null,
      items: buildSaleItems(lines, getProduct),
    }

    const { error: submitError } = isEdit
      ? await updateSale(id, payload)
      : await createSale(payload)

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchProducts()
    availableUnits.refetch()

    if (andNew && !isEdit) resetForm()
    else navigate('/dashboard/sales')
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100 dark:bg-dark-900">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600 dark:text-clay-400">
            <FileText size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
            {isEdit ? 'Edit invoice' : 'New invoice'}
          </h1>
        </div>
        <button
          onClick={() => navigate('/dashboard/sales')}
          aria-label="Cancel"
          className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 dark:hover:bg-dark-700 dark:hover:text-cream-200"
        >
          <X size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          {!loaded ? (
            <div className="flex justify-center py-16">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-400/25 bg-cream-50 py-16 text-center dark:border-cream-100/15 dark:bg-dark-800">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
                <ShoppingBag size={20} />
              </span>
              <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
                Add a product first
              </p>
              <p className="mt-1 max-w-xs text-xs text-ink-400">
                You need at least one product in stock before you can invoice a customer.
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
                  <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Customer</span>
                  <div className="mt-1.5">
                    <SearchSelect
                      value={customerId}
                      onChange={setCustomerId}
                      options={customerOptions}
                      placeholder="Select a customer"
                      createLabel="Add new"
                      onCreate={handleCreateCustomer}
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
                  <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Invoice date</span>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
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
                  <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Invoice no.</span>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={isEdit ? 'Optional' : 'Auto (e.g. S3) — leave blank'}
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
                <SaleLineItemsEditor
                  lines={lines}
                  setLines={setLines}
                  products={products}
                  availableUnits={mergedAvailableUnits}
                  priceLabel="Rate"
                  stockAdjustments={originalQuantities}
                />
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
                <span className="text-xs font-medium text-ink-500 dark:text-cream-400">Message on invoice</span>
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

      {loaded && products.length > 0 && (
        <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-400/10 bg-cream-50 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] dark:border-cream-100/10 dark:bg-dark-800 sm:px-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard/sales')}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {!isEdit && (
              <Button variant="outline" disabled={loading} onClick={() => submit({ andNew: true })}>
                {loading ? 'Saving…' : 'Save and new'}
              </Button>
            )}
            <Button variant="primary" disabled={loading} onClick={() => submit({ andNew: false })}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </footer>
      )}
    </div>
  )
}
