// Formal (A4 letterhead) vs POS (80mm receipt) switch, shared by every
// page that prints a sale document — keeps the segmented-control markup
// in one place instead of copied across NewInvoice/NewSalesReceipt/Sales.
export default function PrintFormatToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-cream-200 p-0.5 print:hidden">
      <button
        type="button"
        onClick={() => onChange('formal')}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          value === 'formal' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
        }`}
      >
        Formal
      </button>
      <button
        type="button"
        onClick={() => onChange('pos')}
        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
          value === 'pos' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'
        }`}
      >
        POS (80mm)
      </button>
    </div>
  )
}
