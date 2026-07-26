import { useState } from 'react'
import { Receipt, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../lib/currency'

let localId = 0
const newFakeLine = () => ({ key: `decoy-${++localId}`, product: '', quantity: '', price: '' })

// Shown instead of the entire real app while locked (App.jsx renders this
// in place of <Routes> — no sidebar, no other page is ever mounted).
// Deliberately has NO real data or backend access at all: no Supabase
// import, no product/customer/sales hooks — every field is local-only
// component state, so there is nothing real to leak even if someone
// pokes around in it. Visually mirrors NewSalesReceipt.jsx so it reads as
// the real app to anyone glancing at the screen. The only way out is the
// same keyboard shortcut that locked it (see PrivacyQuickSwitch.jsx) —
// deliberately no visible button for this, since an obvious "unlock"
// control would give away that this isn't the real page.
export default function DecoySalesReceipt() {
  const [customer, setCustomer] = useState('')
  const [salesRep, setSalesRep] = useState('')
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [depositAccount, setDepositAccount] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newFakeLine()])

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0)

  const updateLine = (key, patch) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }
  const addLine = () => setLines((prev) => [...prev, newFakeLine()])
  const removeLine = (key) => setLines((prev) => prev.filter((l) => l.key !== key))

  return (
    <div className="flex min-h-screen flex-col bg-cream-100">
      <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-ink-400/10 bg-cream-50 px-4 sm:px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
          <Receipt size={16} />
        </span>
        <h1 className="font-heading text-lg font-semibold text-ink-900">New sales receipt</h1>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="w-full max-w-sm">
              <span className="text-xs font-medium text-ink-500">
                Customer <span className="font-normal text-ink-400">(optional)</span>
              </span>
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Walk-in customer"
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Amount received</p>
              <p className="font-heading text-3xl font-semibold text-ink-900">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="mt-6 w-full max-w-sm">
            <span className="text-xs font-medium text-ink-500">
              Sales rep <span className="font-normal text-ink-400">(optional)</span>
            </span>
            <input
              value={salesRep}
              onChange={(e) => setSalesRep(e.target.value)}
              placeholder="Who made this sale?"
              className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
            />
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
                placeholder="Auto (e.g. R3) — leave blank"
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-500">Deposit to *</span>
              <input
                value={depositAccount}
                onChange={(e) => setDepositAccount(e.target.value)}
                placeholder="Choose an account"
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </label>
          </div>

          <div className="mt-8">
            <h2 className="font-heading text-base font-semibold text-ink-900">Items</h2>
            <div className="mt-3 overflow-hidden rounded-2xl border border-ink-400/15 bg-cream-50">
              <div className="hidden grid-cols-[2fr_80px_100px_100px_72px] gap-2 border-b border-ink-400/10 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-400 sm:grid">
                <span>Product</span>
                <span>Qty</span>
                <span>Rate</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {lines.map((line) => (
                <div key={line.key} className="border-b border-ink-400/10 px-4 py-3 last:border-0">
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[2fr_80px_100px_100px_72px] sm:items-center">
                    <div className="col-span-2 sm:col-span-1">
                      <input
                        value={line.product}
                        onChange={(e) => updateLine(line.key, { product: e.target.value })}
                        placeholder="Select a product…"
                        className="w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500"
                      />
                    </div>
                    <input
                      type="number"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      placeholder="Qty"
                      className="rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500"
                    />
                    <input
                      type="number"
                      value={line.price}
                      onChange={(e) => updateLine(line.key, { price: e.target.value })}
                      placeholder="0.00"
                      className="rounded-lg border border-ink-400/20 bg-cream-100 px-2.5 py-2 text-sm text-ink-900 outline-none focus:border-clay-500"
                    />
                    <div className="col-span-2 flex items-center justify-between gap-1 sm:justify-end">
                      <span className="whitespace-nowrap text-sm font-semibold text-ink-900">
                        {formatCurrency((Number(line.quantity) || 0) * (Number(line.price) || 0))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        disabled={lines.length === 1}
                        aria-label="Remove line"
                        className="rounded-lg p-1.5 text-ink-400 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addLine}
                className="flex w-full items-center gap-1.5 border-t border-ink-400/10 px-4 py-3 text-sm font-medium text-clay-600 hover:bg-cream-100"
              >
                <Plus size={15} /> Add lines
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <p className="text-sm text-ink-500">
                Total <span className="font-heading text-lg font-semibold text-ink-900">{formatCurrency(total)}</span>
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
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 flex items-center justify-end gap-3 border-t border-ink-400/10 bg-cream-50 px-4 py-3.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] sm:px-6">
        <button type="button" className="rounded-full px-5 py-2.5 text-sm font-medium text-ink-700 hover:bg-cream-300">
          Save and new
        </button>
        <button type="button" className="rounded-full bg-clay-500 px-5 py-2.5 text-sm font-medium text-cream-50 hover:bg-clay-600">
          Save
        </button>
      </footer>
    </div>
  )
}
