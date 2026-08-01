import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Printer, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useControlAccountsReport } from '../../hooks/useControlAccountsReport'
import { formatCurrency } from '../../lib/currency'
import PrintFrame from '../../components/print/PrintFrame'

function StatusBadge({ reconciled }) {
  return (
    <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      reconciled ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
    }`}>
      {reconciled
        ? <><ShieldCheck size={11} /> Reconciled</>
        : <><ShieldAlert size={11} /> Discrepancy</>}
    </span>
  )
}

function DiffCell({ diff }) {
  if (diff === null || diff < 0.01) {
    return <span className="text-ink-300">—</span>
  }
  return <span className="font-semibold text-red-600">{formatCurrency(diff)}</span>
}

function ControlCell({ control }) {
  if (control === null) {
    return <span className="text-ink-400 italic">Not set up</span>
  }
  return <span>{formatCurrency(control)}</span>
}

function Section({ title, reconciled, rows }) {
  return (
    <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5 sm:p-6 print:border-0 print:p-0 print:mb-8">
      <div className="flex items-center justify-between gap-2 print:mb-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{title}</h2>
        <span className="print:hidden"><StatusBadge reconciled={reconciled} /></span>
        <span className="hidden print:inline text-xs font-semibold text-ink-500">
          {reconciled ? '✓ Reconciled' : '! Discrepancy'}
        </span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-400/10 text-xs text-ink-400">
              <th className="pb-2.5 font-medium">Account</th>
              <th className="pb-2.5 text-right font-medium">GL Control</th>
              <th className="pb-2.5 text-right font-medium">Subsidiary Ledger</th>
              <th className="pb-2.5 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-ink-400/10 last:border-0">
                <td className="py-2.5 pr-3 text-ink-900">{row.name}</td>
                <td className="py-2.5 pr-3 text-right text-ink-700">
                  <ControlCell control={row.control} />
                </td>
                <td className="py-2.5 pr-3 text-right text-ink-700">
                  {formatCurrency(row.subsidiary)}
                </td>
                <td className="py-2.5 text-right">
                  <DiffCell diff={row.diff} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ControlAccountsReport() {
  const navigate = useNavigate()
  const { data, loading, error } = useControlAccountsReport()

  const allReconciled = data
    ? data.ar.reconciled && data.ap.reconciled && data.inventory.reconciled && data.cashAccounts.every(a => a.reconciled)
    : true

  const discrepancyCount = data
    ? [data.ar, data.ap, data.inventory, ...data.cashAccounts].filter(a => !a.reconciled).length
    : 0

  return (
    <div>
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => navigate('/dashboard/reports')}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
        >
          <ArrowLeft size={15} /> Reports
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600"
        >
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      <h1 className="mt-4 font-heading text-2xl font-semibold text-ink-900 sm:text-3xl print:hidden">
        Control Accounts
      </h1>
      <p className="mt-1 text-sm text-ink-500 print:hidden">
        Reconciles General Ledger control accounts against their subsidiary ledgers — highlights any posting discrepancy.
      </p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : data && (
        <PrintFrame title="Control Accounts" subtitle="General Ledger vs Subsidiary Ledger Reconciliation">
          <div className="mt-6 space-y-4">
            {/* Summary banner */}
            <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium print:hidden ${
              allReconciled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {allReconciled
                ? <><ShieldCheck size={16} /> All control accounts reconcile — no discrepancies found.</>
                : <><ShieldAlert size={16} /> {discrepancyCount} {discrepancyCount === 1 ? 'discrepancy' : 'discrepancies'} found — review the highlighted section{discrepancyCount > 1 ? 's' : ''} below.</>}
            </div>

            <Section
              title="Accounts Receivable"
              reconciled={data.ar.reconciled}
              rows={[{
                name: 'Accounts Receivable',
                control: data.ar.control,
                subsidiary: data.ar.subsidiary,
                diff: data.ar.diff,
              }]}
            />

            <Section
              title="Accounts Payable"
              reconciled={data.ap.reconciled}
              rows={[{
                name: 'Accounts Payable',
                control: data.ap.control,
                subsidiary: data.ap.subsidiary,
                diff: data.ap.diff,
              }]}
            />

            <Section
              title="Inventory"
              reconciled={data.inventory.reconciled}
              rows={[{
                name: 'Inventory',
                control: data.inventory.control,
                subsidiary: data.inventory.subsidiary,
                diff: data.inventory.diff,
              }]}
            />

            {data.cashAccounts.length > 0 && (
              <Section
                title="Cash & Bank Accounts"
                reconciled={data.cashAccounts.every(a => a.reconciled)}
                rows={data.cashAccounts.map(a => ({
                  name: a.name + (a.type === 'bank' ? ' (Bank)' : ' (Cash)'),
                  control: a.control,
                  subsidiary: a.subsidiary,
                  diff: a.diff,
                }))}
              />
            )}
          </div>
        </PrintFrame>
      )}
    </div>
  )
}
