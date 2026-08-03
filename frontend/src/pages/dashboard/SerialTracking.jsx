import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ScanLine, PackageCheck, PackageX, AlertCircle, Download, History,
  RotateCcw, ArchiveRestore, ArrowLeft,
} from 'lucide-react'
import { useProductUnits } from '../../hooks/useProductUnits'
import { exportToCsv } from '../../lib/exportTable'

const ACCENT = '#2f6fed'

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'sold', label: 'Sold' },
  { value: 'returned_by_customer', label: 'Returned by customer' },
  { value: 'returned_to_supplier', label: 'Returned to supplier' },
]

const STATUS_BADGE = {
  in_stock: { label: 'In stock', bg: '#eaf1ff', color: '#2f6fed' },
  sold: { label: 'Sold', bg: '#eef0f3', color: '#6b7280' },
  returned_by_customer: { label: 'Returned by customer', bg: '#fdeee3', color: '#d9772f' },
  returned_to_supplier: { label: 'Returned to supplier', bg: '#e9f7ee', color: '#2b9e5c' },
}

const STATUS_CSV_LABEL = {
  in_stock: 'In stock',
  sold: 'Sold',
  returned_by_customer: 'Returned by customer',
  returned_to_supplier: 'Returned to supplier',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
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

export default function SerialTracking() {
  const navigate = useNavigate()
  const { units, loading, error } = useProductUnits()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')

  const products = useMemo(() => {
    const map = new Map()
    units.forEach((u) => {
      if (u.products) map.set(u.products.id, u.products.name)
    })
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [units])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return units.filter((u) => {
      if (statusFilter && u.status !== statusFilter) return false
      if (productFilter && u.products?.id !== productFilter) return false
      if (q) {
        const haystack = `${u.serial_number} ${u.products?.name ?? ''} ${u.sales?.customers?.name ?? ''} ${u.purchases?.suppliers?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [units, query, statusFilter, productFilter])

  const inStockCount = units.filter((u) => u.status === 'in_stock').length
  const soldCount = units.filter((u) => u.status === 'sold').length
  const returnedByCustomerCount = units.filter((u) => u.status === 'returned_by_customer').length
  const returnedToSupplierCount = units.filter((u) => u.status === 'returned_to_supplier').length

  const stats = [
    { icon: ScanLine, label: 'Total tracked', value: units.length },
    { icon: PackageCheck, label: 'In stock', value: inStockCount },
    { icon: PackageX, label: 'Sold', value: soldCount },
    { icon: RotateCcw, label: 'Returned by customer', value: returnedByCustomerCount },
    { icon: ArchiveRestore, label: 'Returned to supplier', value: returnedToSupplierCount },
  ]

  const handleExportCsv = () => {
    exportToCsv({
      columns: [
        { key: 'serial', label: 'Serial / IMEI' },
        { key: 'product', label: 'Product' },
        { key: 'status', label: 'Status' },
        { key: 'purchaseRef', label: 'Purchased on bill' },
        { key: 'purchaseDate', label: 'Bill date' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'saleRef', label: 'Sold on' },
        { key: 'saleDate', label: 'Sale date' },
        { key: 'customer', label: 'Customer' },
      ],
      rows: filtered.map((u) => ({
        serial: u.serial_number,
        product: u.products?.name ?? '',
        status: STATUS_CSV_LABEL[u.status] ?? u.status,
        purchaseRef: u.purchases?.reference ?? '',
        purchaseDate: u.purchases?.bill_date ?? '',
        supplier: u.purchases?.suppliers?.name ?? '',
        saleRef: u.sales?.reference ?? '',
        saleDate: u.sales?.sale_date ?? '',
        customer: u.sales?.customers?.name ?? '',
      })),
      filename: `serial-imei-tracking-${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }

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
          <h1 className="text-[22px] font-bold text-[#2b3648]">Serial / IMEI Tracking</h1>
          <p className="mt-1 text-[13px] text-[#8b93a1]">
            Every individually tracked unit, where it came from, and where it went.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate('/dashboard/serial-tracking/history')}
            className="flex items-center gap-2 rounded-md border border-[#dfe3e8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#4a5568] transition-colors hover:border-[#2f6fed] hover:text-[#2f6fed]"
          >
            <History size={14} /> IMEI History
          </button>
          <button
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 rounded-md border border-[#dfe3e8] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#4a5568] transition-colors hover:border-[#2f6fed] hover:text-[#2f6fed] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4.5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} value={s.value} label={s.label} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="block text-xs font-semibold text-[#4a5568]">Search</span>
          <div className="mt-1.5 flex min-w-[280px] items-center gap-2 rounded-md border border-[#dfe3e8] bg-white px-3.5 py-2.5">
            <Search size={14} className="shrink-0 text-[#9aa2ad]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Serial/IMEI, product, customer or supplier"
              className="w-full border-none bg-transparent text-[13px] text-[#333] outline-none placeholder:text-[#9aa2ad]"
            />
          </div>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-[#4a5568]">Product</span>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="mt-1.5 min-w-[150px] rounded-md border border-[#dfe3e8] bg-white px-3 py-2.5 text-[13px] text-[#333] outline-none"
          >
            <option value="">All products</option>
            {products.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </label>
        <div>
          <span className="block text-xs font-semibold text-[#4a5568]">Status</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((s) => {
              const active = statusFilter === s.value
              return (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className="rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-colors"
                  style={
                    active
                      ? { borderColor: ACCENT, color: ACCENT, background: '#eaf1ff' }
                      : { borderColor: '#dfe3e8', color: '#4a5568' }
                  }
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4.5 overflow-x-auto rounded-lg border border-[#e3e6ea] bg-white">
        {error && (
          <div className="m-4.5 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
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
              <ScanLine size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-[#4a5568]">
              {units.length === 0 ? 'No serial/IMEI units tracked yet' : 'No matches'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-[#8b93a1]">
              {units.length === 0
                ? 'Turn on serial/IMEI tracking for a product, then enter serials when you record a bill for it.'
                : 'Try a different search term or filter.'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[820px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-[#eef0f3]">
                <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Serial / IMEI</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Product</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Status</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Purchased</th>
                <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Sold to</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const badge = STATUS_BADGE[u.status] ?? { label: u.status, bg: '#eef0f3', color: '#6b7280' }
                return (
                  <tr key={u.id} className="border-b border-[#f1f3f6] last:border-0 hover:bg-[#fafbfc]">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] tracking-wide text-[#4a5568]">
                      {u.serial_number}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-[#2b3648]">
                      {u.products?.name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#333]">
                      {u.purchases ? (
                        <>
                          {u.purchases.reference || 'Bill'}
                          <span className="text-[#8b93a1]"> · {formatDate(u.purchases.bill_date)}</span>
                          {u.purchases.suppliers?.name && (
                            <span className="text-[#8b93a1]"> · {u.purchases.suppliers.name}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#c3c9d1]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[#333]">
                      {u.sales ? (
                        <>
                          {u.sales.reference || (u.sales.type === 'invoice' ? 'Invoice' : 'Receipt')}
                          <span className="text-[#8b93a1]"> · {formatDate(u.sales.sale_date)}</span>
                          {u.sales.customers?.name && (
                            <span className="text-[#8b93a1]"> · {u.sales.customers.name}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[#c3c9d1]">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
