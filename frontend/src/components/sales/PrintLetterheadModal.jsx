import { FileText, Building2 } from 'lucide-react'
import Modal from '../ui/Modal'

// Asked fresh every time Print is pressed (Formal format only — POS
// receipts have no letterhead concept) rather than a silently-persisted
// setting, since the right call can genuinely differ print to print (a
// customer-facing copy vs. an internal reprint, say).
export default function PrintLetterheadModal({ open, onChoose }) {
  return (
    <Modal
      open={open}
      onClose={() => onChoose(true)}
      title="Print with letterhead?"
      subtitle="Choose how this copy's header should look."
    >
      <div className="mt-5 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => onChoose(true)}
          className="flex items-center gap-3 rounded-xl border border-ink-400/20 px-4 py-3 text-left transition-colors hover:border-clay-500 hover:bg-clay-500/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
            <Building2 size={16} />
          </span>
          <span>
            <span className="block text-sm font-medium text-ink-900">With letterhead</span>
            <span className="block text-xs text-ink-500">Logo, address and contact details at the top</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoose(false)}
          className="flex items-center gap-3 rounded-xl border border-ink-400/20 px-4 py-3 text-left transition-colors hover:border-clay-500 hover:bg-clay-500/5"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-400/10 text-ink-500">
            <FileText size={16} />
          </span>
          <span>
            <span className="block text-sm font-medium text-ink-900">Plain header</span>
            <span className="block text-xs text-ink-500">Just the company name — no logo or address block</span>
          </span>
        </button>
      </div>
    </Modal>
  )
}
