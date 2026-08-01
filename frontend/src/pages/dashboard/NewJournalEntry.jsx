import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Plus, Trash2, AlertCircle, BookOpen } from 'lucide-react'
import { useJournalEntries } from '../../hooks/useJournalEntries'
import { useChartOfAccounts } from '../../hooks/useChartOfAccounts'
import { formatCurrency } from '../../lib/currency'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'

let localId = 0
const newLine = () => ({ key: `line-${++localId}`, accountId: '', debit: '', credit: '' })

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function NewJournalEntry() {
  const navigate = useNavigate()
  const { createJournalEntry } = useJournalEntries()
  const { accounts, loading: accountsLoading } = useChartOfAccounts()

  const [entryDate, setEntryDate] = useState(todayISO())
  const [memo, setMemo] = useState('')
  const [lines, setLines] = useState([newLine(), newLine()])
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const accountOptions = accounts.map((a) => ({
    id: a.coa_id,
    label: a.name,
    sublabel: a.type,
  }))

  // coa_id → { normal_balance, type } for per-line increase/decrease hints
  const accountMap = Object.fromEntries(accounts.map((a) => [a.coa_id, a]))

  const updateLine = (key, field, value) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const updated = { ...l, [field]: value }
        if (field === 'debit' && value) updated.credit = ''
        if (field === 'credit' && value) updated.debit = ''
        return updated
      })
    )
  }

  const addLine = () => setLines((prev) => [...prev, newLine()])

  const removeLine = (key) => {
    if (lines.length <= 2) return
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const totalDebits = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredits = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
  const isBalanced = totalDebits > 0 && Math.abs(totalDebits - totalCredits) < 0.001
  const hasMinLines = lines.filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)).length >= 2
  const canSave = isBalanced && hasMinLines && !saving

  const handleSave = async () => {
    setError(null)
    setSaving(true)

    const payload = lines
      .filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
      .map((l) => ({
        account_id: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      }))

    const { error: saveError } = await createJournalEntry({
      entryDate,
      memo: memo.trim() || null,
      lines: payload,
    })

    setSaving(false)

    if (saveError) {
      setError(saveError.message)
      return
    }

    navigate('/dashboard/journal-entries')
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600">
              <BookOpen size={20} />
            </span>
            <h1 className="font-heading text-2xl font-semibold text-ink-900">
              New Journal Entry
            </h1>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="rounded-xl p-2 text-ink-400 transition-colors hover:bg-cream-200 hover:text-ink-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 rounded-2xl border border-ink-400/10 bg-cream-50 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-500">Memo</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Monthly depreciation"
                className="w-full rounded-xl border border-ink-400/20 bg-cream-50 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 grid grid-cols-[1fr_120px_120px_36px] items-center gap-3 px-1">
              <span className="text-xs font-medium text-ink-400">Account</span>
              <span className="text-right text-xs font-medium text-ink-400">Debit</span>
              <span className="text-right text-xs font-medium text-ink-400">Credit</span>
              <span />
            </div>

            <div className="space-y-2">
              {lines.map((line) => {
                const acct = accountMap[line.accountId]
                const nb = acct?.normal_balance // 'debit' | 'credit' | undefined
                const debitEffect = nb === 'debit' ? '+' : nb === 'credit' ? '−' : null
                const creditEffect = nb === 'credit' ? '+' : nb === 'debit' ? '−' : null
                return (
                  <motion.div
                    key={line.key}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-[1fr_120px_120px_36px] items-center gap-3"
                  >
                    <SearchSelect
                      value={line.accountId}
                      onChange={(val) => updateLine(line.key, 'accountId', val)}
                      options={accountOptions}
                      placeholder={accountsLoading ? 'Loading…' : 'Select account…'}
                    />
                    <div className="relative">
                      {debitEffect && (
                        <span className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold ${
                          debitEffect === '+' ? 'text-emerald-500' : 'text-ink-300'
                        }`}>
                          {debitEffect}
                        </span>
                      )}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => updateLine(line.key, 'debit', e.target.value)}
                        placeholder="0.00"
                        className={`w-full rounded-xl border bg-cream-50 py-2.5 text-right text-sm text-ink-900 placeholder:text-ink-300 outline-none focus:ring-2 focus:ring-clay-500/20 ${
                          debitEffect ? 'pl-6 pr-3' : 'px-3'
                        } ${
                          debitEffect === '+' ? 'border-emerald-200 focus:border-emerald-400' : 'border-ink-400/20 focus:border-clay-500'
                        }`}
                      />
                    </div>
                    <div className="relative">
                      {creditEffect && (
                        <span className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold ${
                          creditEffect === '+' ? 'text-emerald-500' : 'text-ink-300'
                        }`}>
                          {creditEffect}
                        </span>
                      )}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) => updateLine(line.key, 'credit', e.target.value)}
                        placeholder="0.00"
                        className={`w-full rounded-xl border bg-cream-50 py-2.5 text-right text-sm text-ink-900 placeholder:text-ink-300 outline-none focus:ring-2 focus:ring-clay-500/20 ${
                          creditEffect ? 'pl-6 pr-3' : 'px-3'
                        } ${
                          creditEffect === '+' ? 'border-emerald-200 focus:border-emerald-400' : 'border-ink-400/20 focus:border-clay-500'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length <= 2}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Trash2 size={15} />
                    </button>
                  </motion.div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={addLine}
              className="mt-3 flex items-center gap-1.5 text-sm text-clay-600 hover:text-clay-700"
            >
              <Plus size={15} /> Add line
            </button>
          </div>

          <div className={`flex items-center justify-end gap-8 rounded-xl border px-4 py-3 text-sm font-medium ${
            isBalanced
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-ink-400/15 bg-cream-100 text-ink-500'
          }`}>
            <span>
              Total Debits: <span className="font-semibold">{formatCurrency(totalDebits)}</span>
            </span>
            <span>
              Total Credits: <span className="font-semibold">{formatCurrency(totalCredits)}</span>
            </span>
            {totalDebits > 0 && !isBalanced && (
              <span className="text-red-600">
                Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
              </span>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!canSave}>
              {saving ? 'Saving…' : 'Post entry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
