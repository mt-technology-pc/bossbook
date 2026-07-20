import { useMemo, useState } from 'react'
import { ArrowUpDown, AlertCircle, MapPin } from 'lucide-react'
import { useClientDistricts } from '../../hooks/useClientDistricts'

export default function ClientDistrictsCard() {
  const { rows, totalRegistered, totalActive, loading, error } = useClientDistricts()
  const [sort, setSort] = useState({ field: 'registered', dir: 'desc' })

  const sorted = useMemo(() => {
    const withoutUnspecified = rows.filter((r) => r.district !== 'Unspecified')
    const unspecified = rows.find((r) => r.district === 'Unspecified')

    withoutUnspecified.sort((a, b) => {
      let av = a[sort.field]
      let bv = b[sort.field]
      if (typeof av === 'string') {
        av = av.toLowerCase()
        bv = bv.toLowerCase()
      }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })

    return unspecified && unspecified.registered > 0
      ? [...withoutUnspecified, unspecified]
      : withoutUnspecified
  }, [rows, sort])

  const toggleSort = (field) => {
    setSort((prev) =>
      prev.field === field ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'desc' },
    )
  }

  const columns = [
    { key: 'district', label: 'District', align: 'left' },
    { key: 'registered', label: 'Registered', align: 'right' },
    { key: 'active', label: 'Active', align: 'right' },
  ]

  return (
    <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink-900">
            Nationwide Client Map
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            Registered vs Active Clients (Last 90 Days)
          </p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="font-heading text-xl font-semibold text-ink-900">{totalRegistered}</p>
            <p className="text-xs text-ink-400">Registered</p>
          </div>
          <div className="text-right">
            <p className="font-heading text-xl font-semibold text-clay-600">{totalActive}</p>
            <p className="text-xs text-ink-400">Active</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-400/10 text-xs text-ink-400">
                {columns.map((c) => (
                  <th key={c.key} className={`pb-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                    <button
                      onClick={() => toggleSort(c.key)}
                      className={`flex items-center gap-1 hover:text-ink-700 ${c.align === 'right' ? 'ml-auto' : ''}`}
                    >
                      {c.label}
                      <ArrowUpDown size={11} className={sort.field === c.key ? 'text-clay-500' : 'opacity-40'} />
                    </button>
                  </th>
                ))}
                <th className="pb-2.5 text-right font-medium">Active %</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.district} className="border-b border-ink-400/5 last:border-0">
                  <td className="py-2 pr-3 text-ink-700">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-ink-400" /> {r.district}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-right text-ink-900">{r.registered}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-clay-600">{r.active}</td>
                  <td className="py-2 text-right text-ink-400">
                    {r.registered > 0 ? `${((r.active / r.registered) * 100).toFixed(0)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
