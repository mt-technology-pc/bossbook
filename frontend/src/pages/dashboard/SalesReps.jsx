import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus, Search, UserRound, TrendingUp, Trash2, AlertCircle, ChevronRight, ArrowLeft,
} from 'lucide-react'
import { useSalesReps } from '../../hooks/useSalesReps'
import { useRepSales } from '../../hooks/useRepSales'
import { periodRange } from '../../lib/dateBuckets'
import { formatCurrency } from '../../lib/currency'
import AddSalesRepModal from '../../components/salesReps/AddSalesRepModal'

const ACCENT = '#2f6fed'
const ACCENT_HOVER = '#2559c9'

const PERIODS = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
]

function AddButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors"
      style={{ background: ACCENT }}
      onMouseEnter={(e) => { e.currentTarget.style.background = ACCENT_HOVER }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT }}
    >
      {children}
    </button>
  )
}

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-lg border border-[#e3e6ea] bg-white p-4.5">
      <span
        className="mb-3.5 flex h-9.5 w-9.5 items-center justify-center rounded-lg"
        style={{ background: '#eaf1ff', color: ACCENT }}
      >
        <Icon size={16} />
      </span>
      <p className="text-[26px] font-bold leading-none text-[#2b3648]">{value}</p>
      <p className="mt-1.5 text-[13px] text-[#8b93a1]">{label}</p>
    </div>
  )
}

export default function SalesReps() {
  const { salesReps, loading, error, addSalesRep, deleteSalesRep } = useSalesReps()
  const { sales: repSales, refetch: refetchRepSales } = useRepSales()
  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('all')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.state?.autoOpen) {
      setModalOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [rangeStart, rangeEnd] = period === 'custom'
    ? [customStart || null, customEnd || null]
    : periodRange(period)

  const totalsByRep = useMemo(() => {
    const map = new Map()
    for (const s of repSales) {
      if (rangeStart && s.sale_date < rangeStart) continue
      if (rangeEnd && s.sale_date > rangeEnd) continue
      const entry = map.get(s.sales_rep_id) ?? { count: 0, total: 0 }
      entry.count += 1
      entry.total += Number(s.total_amount)
      map.set(s.sales_rep_id, entry)
    }
    return map
  }, [repSales, rangeStart, rangeEnd])

  const filtered = salesReps.filter((r) => {
    const q = query.toLowerCase()
    return (
      r.name.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.code?.toLowerCase().includes(q)
    )
  })

  const totalSalesAllReps = Array.from(totalsByRep.values()).reduce((sum, t) => sum + t.total, 0)

  const handleDelete = async (e, id, name) => {
    e.stopPropagation()
    if (!window.confirm(`Remove "${name}" from your sales reps? Their past sales stay recorded, just unattributed.`)) return
    await deleteSalesRep(id)
    refetchRepSales()
  }

  const handleAddSalesRep = async (payload) => {
    const result = await addSalesRep(payload)
    if (!result.error) refetchRepSales()
    return result
  }

  const stats = [
    { icon: UserRound, label: 'Sales reps', value: salesReps.length },
    { icon: TrendingUp, label: 'Total attributed sales', value: formatCurrency(totalSalesAllReps) },
  ]

  return (
    <div className="min-h-screen w-full bg-[#eef1f5] p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium text-[#9aa2ad] transition-colors hover:text-[#2f6fed]"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-bold text-[#2b3648]">Sales Reps</h1>
          <p className="mt-1 text-[13px] text-[#8b93a1]">
            Attribute invoices and receipts to who made the sale, and see how each rep is doing.
          </p>
        </div>
        <AddButton onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Add sales rep
        </AddButton>
      </div>

      <div className="mt-4.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} />
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-[#e3e6ea] bg-white p-4.5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-[280px] max-w-xs items-center gap-2 rounded-md border border-[#dfe3e8] bg-white px-3.5 py-2.5">
            <Search size={14} className="shrink-0 text-[#9aa2ad]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, code, phone or email"
              className="w-full border-none bg-transparent text-[13px] text-[#333] outline-none placeholder:text-[#9aa2ad]"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#4a5568]">Totals for</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {PERIODS.map((p) => {
                const active = period === p.value
                return (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value)}
                    className="rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors"
                    style={
                      active
                        ? { borderColor: ACCENT, color: ACCENT, background: '#eaf1ff' }
                        : { borderColor: '#dfe3e8', color: '#4a5568' }
                    }
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {period === 'custom' && (
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="block text-xs font-semibold text-[#4a5568]">Start date</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1.5 rounded-md border border-[#dfe3e8] bg-white px-3.5 py-2.5 text-[13px] text-[#333] outline-none"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-[#4a5568]">End date</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1.5 rounded-md border border-[#dfe3e8] bg-white px-3.5 py-2.5 text-[13px] text-[#333] outline-none"
              />
            </label>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#2f6fed]/30 border-t-[#2f6fed]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: '#eaf1ff', color: ACCENT }}>
              <UserRound size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-[#2b3648]">
              {salesReps.length === 0 ? 'No sales reps yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-[#8b93a1]">
              {salesReps.length === 0
                ? 'Add your sales team so invoices and receipts can be attributed to whoever made the sale.'
                : 'Try a different search term.'}
            </p>
            {salesReps.length === 0 && (
              <div className="mt-5">
                <AddButton onClick={() => setModalOpen(true)}>
                  <Plus size={15} /> Add sales rep
                </AddButton>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-[#eef0f3]">
                  <th className="whitespace-nowrap px-0 py-3.5 text-xs font-semibold text-[#8b93a1]">Rep</th>
                  <th className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-[#8b93a1]">Code</th>
                  <th className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-[#8b93a1]">Phone</th>
                  <th className="whitespace-nowrap px-3 py-3.5 text-xs font-semibold text-[#8b93a1]">Sales</th>
                  <th className="whitespace-nowrap px-3 py-3.5 text-right text-xs font-semibold text-[#8b93a1]">Total</th>
                  <th className="px-3 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const t = totalsByRep.get(r.id)
                  return (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/dashboard/sales-reps/${r.id}`)}
                      className="cursor-pointer border-b border-[#f1f3f6] last:border-0 hover:bg-[#fafbfc]"
                    >
                      <td className="py-4 pr-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                            style={{ background: ACCENT }}
                          >
                            {r.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-bold text-[#2b3648]">{r.name}</p>
                            {r.email && <p className="text-xs text-[#8b93a1]">{r.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 font-mono text-xs text-[#8b93a1]">{r.code || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-[#333]">{r.phone || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-[#333]">{t?.count ?? 0}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-right font-bold text-[#2b3648]">
                        {formatCurrency(t?.total ?? 0)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleDelete(e, r.id, r.name)}
                            aria-label={`Remove ${r.name}`}
                            className="rounded-lg p-2 text-[#9aa2ad] transition-colors hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                          <ChevronRight size={15} className="text-[#c3c9d1]" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddSalesRepModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddSalesRep}
      />
    </div>
  )
}
