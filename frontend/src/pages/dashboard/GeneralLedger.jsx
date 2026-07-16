import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, BookOpen } from 'lucide-react'
import { useChartOfAccounts } from '../../hooks/useChartOfAccounts'
import { useGeneralLedger } from '../../hooks/useGeneralLedger'
import { formatCurrency } from '../../lib/currency'
import SearchSelect from '../../components/ui/SearchSelect'

const SOURCE_LABELS = {
  sales: 'Sale',
  purchases: 'Bill',
  customer_transactions: 'Customer payment',
  supplier_payments: 'Supplier payment',
  expenses: 'Expense',
  accounts: 'Opening balance',
  products: 'Opening stock',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function GeneralLedger() {
  const { coaId } = useParams()
  const navigate = useNavigate()
  const { accounts } = useChartOfAccounts()
  const { account, lines, loading, error } = useGeneralLedger(coaId)

  const accountOptions = accounts.map((a) => ({
    id: a.coa_id,
    label: a.name,
    sublabel: `${a.type} · ${formatCurrency(a.balance)}`,
  }))

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ink-900 dark:text-cream-50 sm:text-3xl">
        General Ledger
      </h1>
      <p className="mt-1 text-sm text-ink-500 dark:text-cream-400">
        The real T-account for any account — every journal entry line, with a running balance.
      </p>

      <div className="mt-6 max-w-sm">
        <SearchSelect
          value={coaId ?? ''}
          onChange={(val) => navigate(`/dashboard/reports/general-ledger/${val}`)}
          options={accountOptions}
          placeholder="Choose an account"
        />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {!coaId ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-400/20 bg-cream-50 py-16 text-center dark:border-cream-100/15 dark:bg-dark-800">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600 dark:text-clay-400">
            <BookOpen size={20} />
          </span>
          <p className="mt-4 text-sm font-medium text-ink-600 dark:text-cream-300">
            Choose an account above to see its ledger
          </p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-24">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-ink-400/15 bg-cream-50 p-5 dark:border-cream-100/10 dark:bg-dark-800 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold text-ink-900 dark:text-cream-50">
                {account?.name}
              </h2>
              <p className="text-xs capitalize text-ink-400">
                {account?.type} · normally {account?.normal_balance}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-400">Current balance</p>
              <p className="font-heading text-xl font-semibold text-ink-900 dark:text-cream-50">
                {formatCurrency(account?.balance ?? 0)}
              </p>
            </div>
          </div>

          {lines.length === 0 ? (
            <p className="mt-8 py-8 text-center text-sm text-ink-400">
              No journal entries posted to this account yet.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-400/10 text-xs text-ink-400 dark:border-cream-100/10">
                    <th className="pb-2.5 font-medium">Date</th>
                    <th className="pb-2.5 font-medium">Memo</th>
                    <th className="pb-2.5 font-medium">Source</th>
                    <th className="pb-2.5 text-right font-medium">Debit</th>
                    <th className="pb-2.5 text-right font-medium">Credit</th>
                    <th className="pb-2.5 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.id} className="border-b border-ink-400/10 last:border-0 dark:border-cream-100/10">
                      <td className="py-2.5 pr-3 text-ink-500 dark:text-cream-400">
                        {formatDate(l.journal_entries?.entry_date)}
                      </td>
                      <td className="py-2.5 pr-3 text-ink-700 dark:text-cream-200">
                        {l.journal_entries?.memo || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-ink-400">
                        {SOURCE_LABELS[l.journal_entries?.source_table] || l.journal_entries?.source_table || '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {l.debit ? (
                          <span className="font-semibold text-clay-600 dark:text-clay-400">
                            {formatCurrency(l.debit)}
                          </span>
                        ) : (
                          <span className="text-ink-300 dark:text-cream-100/20">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        {l.credit ? (
                          <span className="font-semibold text-ink-700 dark:text-cream-200">
                            {formatCurrency(l.credit)}
                          </span>
                        ) : (
                          <span className="text-ink-300 dark:text-cream-100/20">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-ink-900 dark:text-cream-50">
                        {formatCurrency(l.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
