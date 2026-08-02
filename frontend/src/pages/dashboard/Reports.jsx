import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutGrid, BarChart3, Receipt, ShoppingBag, Package, BookOpen,
  Search, Star, ArrowRight, ArrowLeft,
  Boxes, FileBarChart, ClipboardList, Landmark, BookMarked,
  Scale, TrendingUp, PenLine, ShieldCheck, ScanLine,
} from 'lucide-react'

const FAVORITES_KEY = 'bossbooks_report_favorites'

const CATEGORIES = [
  { key: 'all', label: 'All Reports', icon: LayoutGrid },
  {
    key: 'overview', label: 'Business Overview', icon: BarChart3,
    reports: [
      { label: 'Income Statement', path: '/dashboard/reports/income-statement', desc: 'Revenue, cost of goods and gross profit over any date range', icon: FileBarChart },
      { label: 'Gain & Loss', path: '/dashboard/reports/gain-and-loss', desc: 'Realized profit per product — sold quantity, cost, and margin', icon: TrendingUp },
      { label: 'Trial Balance', path: '/dashboard/reports/trial-balance', desc: 'Every account as of a chosen date — proves debits equal credits', icon: Scale },
      { label: 'Control Accounts', path: '/dashboard/reports/control-accounts', desc: 'T-account view of Trade Receivables and Trade Payables', icon: ShieldCheck },
    ],
  },
  {
    key: 'sales', label: 'Sales', icon: Receipt,
    reports: [
      { label: 'Sales Day Book', path: '/dashboard/reports/sales-day-book', desc: 'Every sale line item, chronologically, with running totals', icon: Receipt },
      { label: 'Accounts Receivable', path: '/dashboard/receivables', desc: 'Outstanding customer balances and payment history', icon: BookOpen },
    ],
  },
  {
    key: 'purchases', label: 'Purchases', icon: ShoppingBag,
    reports: [
      { label: 'Purchase Day Book', path: '/dashboard/reports/purchase-day-book', desc: 'Every bill line item, chronologically, with supplier payments', icon: ClipboardList },
      { label: 'Accounts Payable', path: '/dashboard/payables', desc: 'Outstanding supplier balances and payments made', icon: Landmark },
    ],
  },
  {
    key: 'inventory', label: 'Inventory', icon: Package,
    reports: [
      { label: 'Inventory Valuation', path: '/dashboard/reports/inventory-valuation', desc: 'Quantity on hand and value — FIFO, weighted average, or standard cost', icon: Boxes },
      { label: 'IMEI Tracking', path: '/dashboard/serial-tracking', desc: 'Every individually tracked unit — where it came from and where it went', icon: ScanLine },
      { label: 'IMEI History', path: '/dashboard/serial-tracking/history', desc: 'Immutable event log for every serial number movement', icon: ScanLine },
    ],
  },
  {
    key: 'accounting', label: 'Accounting', icon: BookOpen,
    reports: [
      { label: 'Chart of Accounts', path: '/dashboard/reports/chart-of-accounts', desc: 'All accounts with current balances — assets, liabilities, equity, income, expenses', icon: Landmark },
      { label: 'General Ledger', path: '/dashboard/reports/general-ledger', desc: 'Every journal entry line for any account, with running balance', icon: BookMarked },
      { label: 'Journal Entries', path: '/dashboard/journal-entries', desc: 'Manual double-entry postings — adjustments, corrections, opening balances', icon: PenLine },
    ],
  },
]

const ALL_REPORTS = CATEGORIES.slice(1).flatMap((c) => c.reports)

function ReportCard({ report, starred, onToggleFavorite }) {
  const navigate = useNavigate()
  const Icon = report.icon
  return (
    <div
      className="group relative h-full cursor-pointer rounded-2xl border border-ink-400/15 bg-cream-50 p-5 transition-all hover:border-clay-500/30 hover:shadow-md hover:shadow-clay-500/10"
      onClick={() => navigate(report.path)}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(report.path) }}
        className={`absolute right-3 top-3 rounded p-1 transition-opacity ${
          starred ? 'text-clay-500' : 'text-ink-300 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Star size={13} fill={starred ? 'currentColor' : 'none'} />
      </button>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-500/10 text-clay-600">
        <Icon size={18} />
      </span>
      <p className="mt-3 font-heading text-sm font-semibold text-ink-900">{report.label}</p>
      <p className="mt-1 text-xs leading-relaxed text-ink-400">{report.desc}</p>
      <span className="mt-3 flex items-center gap-1 text-xs font-medium text-clay-600">
        Open <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </div>
  )
}

export default function Reports() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') } catch { return [] }
  })

  const toggleFavorite = (path) => {
    setFavorites((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
      return next
    })
  }

  const visibleReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      return ALL_REPORTS.filter(
        (r) => r.label.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q),
      )
    }
    if (activeCategory === 'all') return ALL_REPORTS
    return CATEGORIES.find((c) => c.key === activeCategory)?.reports ?? []
  }, [activeCategory, searchQuery])

  const favoriteReports = ALL_REPORTS.filter((r) => favorites.includes(r.path))
  const showFavorites = favoriteReports.length > 0 && !searchQuery

  const activeCategoryLabel = searchQuery
    ? `Search results (${visibleReports.length})`
    : CATEGORIES.find((c) => c.key === activeCategory)?.label ?? 'All Reports'

  return (
    <div className="flex min-h-screen w-full bg-cream-100">
      {/* Dark left sidebar */}
      <aside className="hidden w-52 shrink-0 flex-col border-r border-ink-800 bg-ink-900 md:flex">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-5 text-sm font-medium text-ink-300 transition-colors hover:text-cream-50"
        >
          <ArrowLeft size={15} /> Dashboard
        </button>
        <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-500">
          Reports
        </div>
        <nav className="flex flex-col">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const active = activeCategory === cat.key && !searchQuery
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setSearchQuery('') }}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-clay-600/25 text-cream-50'
                    : 'text-ink-400 hover:bg-ink-800 hover:text-ink-200'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                {cat.label}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8">
        {/* Mobile back link */}
        <button
          onClick={() => navigate('/dashboard')}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600 md:hidden"
        >
          <ArrowLeft size={15} /> Dashboard
        </button>

        {/* Mobile category pills */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 md:hidden">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setSearchQuery('') }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === cat.key && !searchQuery
                  ? 'border-clay-500 bg-clay-500/10 text-clay-600'
                  : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="relative max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports…"
            className="w-full rounded-xl border border-ink-400/20 bg-cream-50 py-2.5 pl-9 pr-3.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>

        {/* Favorites section */}
        {showFavorites && (
          <section className="mt-8">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
              Favorites
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {favoriteReports.map((r) => (
                <ReportCard
                  key={r.path}
                  report={r}
                  starred
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </section>
        )}

        {/* Category / search results */}
        <section className="mt-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
            {activeCategoryLabel}
          </h2>
          {visibleReports.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-400">
              No reports match &ldquo;{searchQuery}&rdquo;
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleReports.map((r, i) => (
                <motion.div
                  key={r.path}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                >
                  <ReportCard
                    report={r}
                    starred={favorites.includes(r.path)}
                    onToggleFavorite={toggleFavorite}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
