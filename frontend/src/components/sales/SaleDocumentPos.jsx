import { formatCurrency } from '../../lib/currency'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'short' })
}

function Divider() {
  return <div className="my-1.5 border-t border-dashed border-black/50" />
}

// 80mm thermal-receipt layout — the POS alternative to SaleDocument.jsx's
// A4 letterhead, picked via PrintFormatToggle. Printed at 80mm width using
// the @page rule the host page injects only while this format is active
// (jsPDF's mirror is saleDocumentPosPdf.js, for the Download button).
export default function SaleDocumentPos({ data, companyName }) {
  return (
    <div className="w-full bg-white p-2 text-[11px] leading-snug text-black">
      <div className="text-center">
        {companyName && <p className="text-sm font-bold">{companyName}</p>}
        {data.companyAddress && <p className="text-[10px]">{data.companyAddress}</p>}
        {data.companyPhone && <p className="text-[10px]">{data.companyPhone}</p>}
        {data.companyEmail && <p className="text-[10px]">{data.companyEmail}</p>}
        <p className="mt-0.5 font-semibold uppercase">{data.docTypeLabel}</p>
        <p className="text-[10px]">No. {data.reference}</p>
        <p className="text-[10px]">{formatDate(data.date)}</p>
      </div>

      <Divider />

      {(data.customer || data.salesRep) && (
        <>
          <div className="text-[10px]">
            {data.customer && <p>Customer: {data.customer.name}</p>}
            {data.salesRep && <p>Sales rep: {data.salesRep}</p>}
          </div>
          <Divider />
        </>
      )}

      <div>
        {data.lineItems.map((li, i) => (
          <div key={i} className="mb-1.5 last:mb-0">
            <p className="font-medium">{li.name}</p>
            <div className="flex justify-between text-[10px]">
              <span>{li.quantity} x {formatCurrency(li.unitPrice)}</span>
              <span className="font-medium">{formatCurrency(li.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      <div className="space-y-0.5">
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatCurrency(data.total)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>Amount Paid</span>
          <span>{formatCurrency(data.amountPaid)}</span>
        </div>
        {data.customerBalance != null && data.customerBalance > 0 && (
          <div className="flex justify-between text-[10px] font-semibold">
            <span>Total Owed</span>
            <span>{formatCurrency(data.customerBalance)}</span>
          </div>
        )}
      </div>

      {data.notes && (
        <>
          <Divider />
          <p className="whitespace-pre-wrap text-[10px]">{data.notes}</p>
        </>
      )}

      <Divider />
      <p className="text-center text-[10px]">Thank you!</p>
    </div>
  )
}
