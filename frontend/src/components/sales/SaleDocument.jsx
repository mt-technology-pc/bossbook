import logoSrc from '../../assets/logo.png'
import { formatCurrency } from '../../lib/currency'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

// Read-only letterhead-style document — hidden on screen (only rendered
// inside a `hidden print:block` wrapper by the page) and used as the native
// print source for window.print(). The PDF download path in
// saleDocumentPdf.js mirrors this same content/order independently, since
// jsPDF can't render this DOM directly.
export default function SaleDocument({ data }) {
  return (
    <div className="bg-white p-10 text-ink-900">
      <div className="flex items-start justify-between border-b border-ink-900/15 pb-6">
        <img src={logoSrc} alt="BossBooks" className="h-12 w-auto object-contain" />
        <div className="text-right">
          <p className="font-heading text-2xl font-semibold uppercase tracking-wide text-ink-900">
            {data.docTypeLabel}
          </p>
          <p className="mt-1 text-sm text-ink-500">No. {data.reference}</p>
          <p className="text-sm text-ink-500">Date: {formatDate(data.date)}</p>
          {data.isInvoice && (
            <p className="text-sm text-ink-500">Due: {formatDate(data.dueDate)}</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Bill to</p>
        {data.customer ? (
          <div className="mt-1.5 text-sm text-ink-700">
            <p className="font-medium text-ink-900">{data.customer.name}</p>
            {data.customer.address && <p>{data.customer.address}</p>}
            {data.customer.phone && <p>{data.customer.phone}</p>}
            {data.customer.email && <p>{data.customer.email}</p>}
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-ink-700">Walk-in customer</p>
        )}
      </div>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink-900/20 text-left text-xs uppercase tracking-wide text-ink-500">
            <th className="py-2 pr-3 font-semibold">Item</th>
            <th className="py-2 pr-3 text-right font-semibold">Qty</th>
            <th className="py-2 pr-3 text-right font-semibold">Unit Price</th>
            <th className="py-2 text-right font-semibold">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((li, i) => (
            <tr key={i} className="border-b border-ink-900/10">
              <td className="py-2.5 pr-3">
                <p className="font-medium text-ink-900">{li.name}</p>
                {li.sku && <p className="font-mono text-xs text-ink-400">{li.sku}</p>}
              </td>
              <td className="py-2.5 pr-3 text-right">{li.quantity}</td>
              <td className="py-2.5 pr-3 text-right">{formatCurrency(li.unitPrice)}</td>
              <td className="py-2.5 text-right font-medium">{formatCurrency(li.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between border-t-2 border-ink-900/20 pt-2 text-base font-semibold text-ink-900">
            <span>Total</span>
            <span>{formatCurrency(data.total)}</span>
          </div>
        </div>
      </div>

      {data.isInvoice && data.dueDate && (
        <p className="mt-6 text-xs text-ink-500">
          Payment due by {formatDate(data.dueDate)}.
        </p>
      )}

      {data.notes && (
        <div className="mt-6 border-t border-ink-900/10 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700">{data.notes}</p>
        </div>
      )}
    </div>
  )
}
