import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { X, Plus, AlertCircle, Receipt, ShoppingBag, Download, Printer, Mail, MessageSquare } from 'lucide-react'
import { useSales } from '../../hooks/useSales'
import { useProducts } from '../../hooks/useProducts'
import { useCustomers } from '../../hooks/useCustomers'
import { useCustomerBalances } from '../../hooks/useCustomerBalances'
import { useSalesReps } from '../../hooks/useSalesReps'
import { useAccounts } from '../../hooks/useAccounts'
import { useAvailableUnits } from '../../hooks/useAvailableUnits'
import { useCompany } from '../../hooks/useCompany'
import { usePrintFormat } from '../../hooks/usePrintFormat'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/currency'
import { newSaleLine, saleLineTotal, validateSaleLines, buildSaleItems } from '../../lib/saleLines'
import { buildSaleDocumentData, saleDocumentFilename } from '../../lib/saleDocument'
import { buildSaleDocumentPdf } from '../../lib/saleDocumentPdf'
import { buildSaleDocumentPosPdf } from '../../lib/saleDocumentPosPdf'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'
import SaleLineItemsEditor from '../../components/sales/SaleLineItemsEditor'
import SaleDocument from '../../components/sales/SaleDocument'
import SaleDocumentPos from '../../components/sales/SaleDocumentPos'
import PrintFormatToggle from '../../components/sales/PrintFormatToggle'
import PrintLetterheadModal from '../../components/sales/PrintLetterheadModal'
import EmailInvoiceModal from '../../components/sales/EmailInvoiceModal'
import SmsInvoiceModal from '../../components/sales/SmsInvoiceModal'
import WalkInCustomerModal from '../../components/sales/WalkInCustomerModal'
import FormSkeleton from '../../components/ui/FormSkeleton'
import Toast from '../../components/ui/Toast'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewSalesReceipt() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { sales, createSale, updateSale, attachCustomer } = useSales()
  const { products, loading: productsLoading, refetch: refetchProducts } = useProducts()
  const { customers, addCustomer } = useCustomers()
  const { balanceFor: customerBalanceFor, refetch: refetchCustomerBalances } = useCustomerBalances()
  const { salesReps, addSalesRep } = useSalesReps()
  const { accounts, addAccount, refetch: refetchAccounts } = useAccounts()
  const availableUnits = useAvailableUnits()
  const { company } = useCompany()
  const [printFormat, setPrintFormat] = usePrintFormat()
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [smsModalOpen, setSmsModalOpen] = useState(false)
  const [walkInModalOpen, setWalkInModalOpen] = useState(false)
  const [walkInChannel, setWalkInChannel] = useState('sms')
  // Not persisted like printFormat — asked fresh every print (Formal
  // format only) rather than silently remembered, since the right choice
  // can differ print to print (customer-facing copy vs. internal reprint).
  const [letterheadPromptOpen, setLetterheadPromptOpen] = useState(false)
  const [withLetterhead, setWithLetterhead] = useState(true)
  const [printTrigger, setPrintTrigger] = useState(0)
  const [savedToastOpen, setSavedToastOpen] = useState(false)

  const [customerId, setCustomerId] = useState('')
  const [salesRepId, setSalesRepId] = useState('')
  const [reference, setReference] = useState('')
  const [saleDate, setSaleDate] = useState(todayISO())
  const [depositAccountId, setDepositAccountId] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newSaleLine()])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  // Tracked per route id (not a plain boolean) — Save's post-save navigate
  // (see submit()) moves from the id-less create URL to this same sale's
  // edit URL via history replace, which React Router resolves to the SAME
  // component instance rather than a remount. A plain "have I loaded
  // once" boolean would stay stuck true from the create-mode default and
  // never fire the load effect below for the sale that just appeared in
  // the URL — confirmed live: ownUnits (and so serials on the printed
  // document) silently stayed empty after Save even though everything
  // else on the page looked correctly loaded.
  const [loadedForRouteId, setLoadedForRouteId] = useState(null)
  const loaded = !isEdit || loadedForRouteId === id
  const [ownUnits, setOwnUnits] = useState([])
  const [originalQuantities, setOriginalQuantities] = useState({})

  const getProduct = (id) => products.find((p) => p.id === id)

  // The URL param is the sale's reference (e.g. "R3") when it has one —
  // a raw database UUID is a poor thing to put in an address bar — with
  // the actual id as a fallback, both for sales that somehow have no
  // reference and for any link/bookmark still pointing at the old
  // UUID-only URL. Every backend call below still needs the real id
  // (`existing.id`), never this route param directly.
  const findSaleByRouteId = (routeId) =>
    sales.find((s) => s.reference && s.reference === routeId) || sales.find((s) => s.id === routeId)

  useEffect(() => {
    if (!isEdit || loaded || sales.length === 0 || productsLoading) return
    const existing = findSaleByRouteId(id)
    if (!existing) return

    let cancelled = false
    supabase.from('product_units').select('id, product_id, serial_number').eq('sale_id', existing.id)
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
        setSalesRepId(existing.sales_rep_id || '')
        setReference(existing.reference || '')
        setSaleDate(existing.sale_date)
        setDepositAccountId(existing.deposit_account_id || '')
        setNotes(existing.notes || '')
        setLines(builtLines.length > 0 ? builtLines : [newSaleLine()])
        setOwnUnits(units)
        setOriginalQuantities(quantities)
        setLoadedForRouteId(id)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, loaded, sales, productsLoading, id])

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

  const accountOptions = accounts.map((a) => ({
    id: a.account_id,
    label: a.name,
    sublabel: `${a.type === 'bank' ? 'Bank' : 'Cash'} · ${formatCurrency(a.balance)}`,
  }))

  const salesRepOptions = salesReps.map((r) => ({
    id: r.id,
    label: r.name,
    sublabel: r.code || '',
  }))

  const handleCreateCustomer = async (name) => {
    const { data, error: createError } = await addCustomer({ name })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  // Walk-in capture: create the customer, attach them to this already-
  // saved receipt (pure relabeling — see attach_customer_to_sale), then
  // hand off to whichever channel's modal was actually requested. Errors
  // surface inline in WalkInCustomerModal via its own { error } handling.
  const handleWalkInSubmit = async (payload) => {
    const { data: newCustomer, error: createError } = await addCustomer(payload)
    if (createError) return { error: createError }

    const existingSale = findSaleByRouteId(id)
    const { error: attachError } = await attachCustomer(existingSale?.id, newCustomer.id)
    if (attachError) return { error: attachError }

    if (walkInChannel === 'sms') setSmsModalOpen(true)
    else setEmailModalOpen(true)
    return { data: true }
  }

  const handleCreateSalesRep = async (name) => {
    const { data, error: createError } = await addSalesRep({ name })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  const handleCreateAccount = async (name) => {
    const { data, error: createError } = await addAccount({ name, type: 'cash', openingBalance: 0 })
    if (createError) {
      setError(createError.message)
      return null
    }
    return { id: data.id }
  }

  const resetForm = () => {
    setCustomerId('')
    setSalesRepId('')
    setReference('')
    setSaleDate(todayISO())
    setDepositAccountId('')
    setNotes('')
    setLines([newSaleLine()])
    setError(null)
  }

  const total = saleLineTotal(lines)

  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const documentData = useMemo(() => {
    if (!isEdit || !loaded) return null
    const existing = findSaleByRouteId(id)
    if (!existing) return null
    const customer = customers.find((c) => c.id === existing.customer_id) || null
    const customerBalance = customer ? customerBalanceFor(customer.id) : null
    return buildSaleDocumentData({ sale: existing, customer, products, customerBalance, company, units: ownUnits })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, loaded, sales, id, customers, products, customerBalanceFor, company, ownUnits])

  const requestPrint = () => {
    if (printFormat === 'formal') setLetterheadPromptOpen(true)
    else window.print()
  }

  // "Save & Print" lands here (edit URL, replace: true) with
  // state.autoPrint set — once the just-saved record's documentData is
  // actually ready, trigger the same letterhead-choice flow as the Print
  // button (or print immediately for POS, which has no such choice).
  useEffect(() => {
    if (!location.state?.autoPrint || !documentData) return
    requestPrint()
    navigate(location.pathname, { replace: true, state: {} })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, documentData])

  // window.print() has to fire after the render that applies the chosen
  // withLetterhead value has actually committed to the DOM — calling it
  // synchronously right after setWithLetterhead would still print
  // whatever was on screen before the choice. Tying it to this effect
  // (rather than a callback/setTimeout) guarantees that ordering.
  useEffect(() => {
    if (printTrigger === 0) return
    window.print()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printTrigger])

  const handleLetterheadChoice = (choice) => {
    setWithLetterhead(choice)
    setLetterheadPromptOpen(false)
    setPrintTrigger((n) => n + 1)
  }

  const handleDownloadPdf = async () => {
    if (!documentData) return
    setDownloadingPdf(true)
    try {
      const doc = printFormat === 'pos'
        ? await buildSaleDocumentPosPdf(documentData, company?.name)
        : await buildSaleDocumentPdf(documentData)
      doc.save(saleDocumentFilename(documentData))
    } catch (err) {
      setError(err.message || 'Could not generate the PDF.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const submit = async ({ andNew, andPrint }) => {
    if (!depositAccountId) {
      setError('Choose which account this sale is deposited to.')
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
      customerId: customerId || null,
      salesRepId: salesRepId || null,
      type: 'receipt',
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      saleDate: saleDate || null,
      depositAccountId,
      items: buildSaleItems(lines, getProduct),
    }

    const existingSale = isEdit ? findSaleByRouteId(id) : null
    if (isEdit && !existingSale) {
      setLoading(false)
      setError('Could not find this receipt.')
      return
    }

    const { data, error: submitError } = isEdit
      ? await updateSale(existingSale.id, payload)
      : await createSale(payload)

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    refetchProducts()
    availableUnits.refetch()
    refetchAccounts()
    // Awaited so a brand-new receipt's customer balance is already in
    // state before navigating into the auto-print view.
    await refetchCustomerBalances()

    if (andPrint) {
      const savedId = isEdit ? existingSale.id : data
      // A brand-new receipt's reference may have just been auto-assigned
      // server-side (create_sale fills it in when left blank) — the
      // client has no way to know that value without asking, so fetch it
      // back rather than assuming what was typed (or nothing) is final.
      const { data: savedRow } = await supabase.from('sales').select('reference').eq('id', savedId).single()
      const urlId = savedRow?.reference || savedId
      navigate(`/dashboard/sales/new-receipt/${urlId}`, { replace: true, state: { autoPrint: true } })
      return
    }

    if (andNew && !isEdit) {
      resetForm()
      return
    }

    // Plain Save stays on this receipt (its own edit view, so the saved
    // record — including any IMEIs just attached — is right there to
    // confirm) instead of leaving to the list, with a toast standing in
    // for the "closed the page" confirmation a navigate-away used to give.
    const savedId = isEdit ? existingSale.id : data
    const { data: savedRow } = await supabase.from('sales').select('reference').eq('id', savedId).single()
    const urlId = savedRow?.reference || savedId
    setSavedToastOpen(true)
    navigate(`/dashboard/sales/new-receipt/${urlId}`, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-ink-400/10 bg-cream-50 px-4 print:hidden sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <Receipt size={16} />
          </span>
          <h1 className="font-heading text-lg font-semibold text-ink-900">
            {isEdit ? 'Edit sales receipt' : 'New sales receipt'}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          {documentData && (
            <>
              <PrintFormatToggle value={printFormat} onChange={setPrintFormat} />
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                title="Download PDF"
                aria-label="Download PDF"
                className="ml-1 rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 disabled:opacity-50"
              >
                <Download size={18} />
              </button>
              <button
                onClick={requestPrint}
                title="Print"
                aria-label="Print"
                className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600"
              >
                <Printer size={18} />
              </button>
              <button
                onClick={() => {
                  if (documentData.customer) setEmailModalOpen(true)
                  else { setWalkInChannel('email'); setWalkInModalOpen(true) }
                }}
                disabled={documentData.customer && !documentData.customer.email}
                title={
                  documentData.customer
                    ? (documentData.customer.email ? 'Email to customer' : 'Add an email address for this customer first')
                    : 'Save this walk-in customer’s email to send them the receipt'
                }
                aria-label="Email to customer"
                className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 disabled:opacity-50"
              >
                <Mail size={18} />
              </button>
              <button
                onClick={() => {
                  if (documentData.customer) setSmsModalOpen(true)
                  else { setWalkInChannel('sms'); setWalkInModalOpen(true) }
                }}
                disabled={documentData.customer && !documentData.customer.phone}
                title={
                  documentData.customer
                    ? (documentData.customer.phone ? 'Send SMS to customer' : 'Add a phone number for this customer first')
                    : 'Save this walk-in customer’s phone number to text them the receipt'
                }
                aria-label="Send SMS to customer"
                className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600 disabled:opacity-50"
              >
                <MessageSquare size={18} />
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/dashboard/sales')}
            aria-label="Cancel"
            className="rounded-full p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-600"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-28 print:hidden">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          {!loaded || productsLoading ? (
            <FormSkeleton />
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-400/25 bg-cream-50 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
                <ShoppingBag size={20} />
              </span>
              <p className="mt-4 text-sm font-medium text-ink-600">
                Add a product first
              </p>
              <p className="mt-1 max-w-xs text-xs text-ink-400">
                You need at least one product in stock before you can ring up a sale.
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
                  <span className="text-xs font-medium text-ink-500">
                    Customer <span className="font-normal text-ink-400">(optional)</span>
                  </span>
                  <div className="mt-1.5">
                    <SearchSelect
                      value={customerId}
                      onChange={setCustomerId}
                      options={customerOptions}
                      placeholder="Walk-in customer"
                      createLabel="Add new"
                      onCreate={handleCreateCustomer}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
                    Amount received
                  </p>
                  <p className="font-heading text-3xl font-semibold text-ink-900">
                    {formatCurrency(total)}
                  </p>
                </div>
              </div>

              <div className="mt-6 w-full max-w-sm">
                <span className="text-xs font-medium text-ink-500">
                  Sales rep <span className="font-normal text-ink-400">(optional)</span>
                </span>
                <div className="mt-1.5">
                  <SearchSelect
                    value={salesRepId}
                    onChange={setSalesRepId}
                    options={salesRepOptions}
                    placeholder="Who made this sale?"
                    createLabel="Add new"
                    onCreate={handleCreateSalesRep}
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-medium text-ink-500">Sale date</span>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-500">Receipt no.</span>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={isEdit ? 'Optional' : 'Auto (e.g. R3) — leave blank'}
                    className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
                  />
                </label>
                <div>
                  <span className="text-xs font-medium text-ink-500">Deposit to *</span>
                  <div className="mt-1.5">
                    <SearchSelect
                      value={depositAccountId}
                      onChange={setDepositAccountId}
                      options={accountOptions}
                      placeholder="Choose an account"
                      createLabel="Add new cash account"
                      onCreate={handleCreateAccount}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
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
                  <p className="text-sm text-ink-500">
                    Total{' '}
                    <span className="font-heading text-lg font-semibold text-ink-900">
                      {formatCurrency(total)}
                    </span>
                  </p>
                </div>
              </div>

              <label className="mt-8 block max-w-xl">
                <span className="text-xs font-medium text-ink-500">Memo</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Optional"
                  className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {loaded && !productsLoading && products.length > 0 && (
        <footer className="fixed inset-x-0 bottom-0 flex items-center justify-between border-t border-ink-400/10 bg-cream-50 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] print:hidden sm:px-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard/sales')}>
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {!isEdit && (
              <Button variant="outline" disabled={loading} onClick={() => submit({ andNew: true })}>
                {loading ? 'Saving…' : 'Save and new'}
              </Button>
            )}
            <Button variant="outline" disabled={loading} onClick={() => submit({ andPrint: true })}>
              <Printer size={15} /> {loading ? 'Saving…' : 'Save & Print'}
            </Button>
            <Button variant="primary" disabled={loading} onClick={() => submit({ andNew: false })}>
              {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
            </Button>
          </div>
        </footer>
      )}

      {documentData && (
        <>
          {printFormat === 'pos' && <style>{'@page { size: 80mm auto; margin: 3mm; }'}</style>}
          <div className="hidden print:block">
            {printFormat === 'pos'
              ? <SaleDocumentPos data={documentData} companyName={company?.name} />
              : <SaleDocument data={{ ...documentData, showLetterhead: withLetterhead }} />}
          </div>
        </>
      )}

      <PrintLetterheadModal open={letterheadPromptOpen} onChoose={handleLetterheadChoice} />

      <Toast open={savedToastOpen} message="Receipt saved" onClose={() => setSavedToastOpen(false)} />

      <WalkInCustomerModal
        open={walkInModalOpen}
        onClose={() => setWalkInModalOpen(false)}
        channel={walkInChannel}
        onSubmit={handleWalkInSubmit}
      />

      <EmailInvoiceModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        documentData={documentData}
        printFormat={printFormat}
        company={company}
      />

      <SmsInvoiceModal
        open={smsModalOpen}
        onClose={() => setSmsModalOpen(false)}
        documentData={documentData}
        printFormat={printFormat}
        company={company}
      />
    </div>
  )
}
