import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Search, BookOpen, FileText, Trash2, CalendarClock } from 'lucide-react'
import { useJournalEntries } from '../../hooks/useJournalEntries'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function JournalEntries() {
  const { entries, loading, error, deleteJournalEntry } = useJournalEntries()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const filtered = entries.filter((e) => {
    const q = query.toLowerCase()
    return !q || e.memo?.toLowerCase().includes(q)
  })

  const now = new Date()
  const thisMonthCount = entries.filter((e) => {
    const d = new Date(e.entry_date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const stats = [
    { icon: CalendarClock, label: 'This month', value: thisMonthCount },
    { icon: FileText, label: 'All time', value: entries.length },
  ]

  const handleDelete = async (id, memo) => {
    if (!window.confirm(`Delete this journal entry${memo ? ` "${memo}"` : ''}? This will reverse its effect on all account balances.`)) return
    await deleteJournalEntry(id)
  }

  const totalDebit = (entry) =>
    (entry.journal_entry_lines ?? []).reduce((sum, l) => sum + Number(l.debit), 0)

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Journal Entries
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Manual double-entry postings for adjustments, corrections, and opening balances.
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/journal-entries/new')} variant="primary">
          <Plus size={16} /> New entry
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-4 rounded-2xl border border-ink-400/10 bg-cream-50 p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600">
              <s.icon size={18} />
            </span>
            <div>
              <p className="text-xs text-ink-400">{s.label}</p>
              <p className="text-lg font-semibold text-ink-900">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-6">
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by memo…"
            className="w-full rounded-xl border border-ink-400/20 bg-cream-50 py-2.5 pl-9 pr-4 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-ink-400">Loading…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <BookOpen size={36} className="text-ink-300" />
            <p className="text-sm text-ink-400">
              {query ? 'No entries match your search.' : 'No manual journal entries yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-ink-400/10 bg-cream-50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-400/10 text-left text-xs font-medium text-ink-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Memo</th>
                  <th className="px-4 py-3 text-right">Lines</th>
                  <th className="px-4 py-3 text-right">Total Debit</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-400/10">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-cream-100">
                    <td className="px-4 py-3 text-ink-500">{formatDate(entry.entry_date)}</td>
                    <td className="px-4 py-3 font-medium text-ink-900">
                      {entry.memo || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-ink-500">
                      {entry.journal_entry_lines?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-ink-900">
                      {formatCurrency(totalDebit(entry))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(entry.id, entry.memo)}
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
