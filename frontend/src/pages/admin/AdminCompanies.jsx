import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Users, Search, AlertCircle } from 'lucide-react'
import { apiFetch } from '../../lib/api'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiFetch('/api/admin/companies')
      .then((data) => setCompanies(data.companies))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => c.name.toLowerCase().includes(q))
  }, [companies, search])

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Companies</h1>
      <p className="mt-1 text-sm text-cream-50/60">
        {companies.length} compan{companies.length === 1 ? 'y' : 'ies'} on the platform.
      </p>

      <div className="mt-6">
        <div className="relative max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cream-50/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            className="w-full rounded-xl border border-cream-50/15 bg-ink-800 py-2.5 pl-10 pr-4 text-sm text-cream-50 placeholder:text-cream-50/40 outline-none focus:border-clay-500"
          />
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-cream-50/10">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-cream-50/20 border-t-cream-50" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Building2 size={22} className="text-cream-50/30" />
            <p className="mt-3 text-sm text-cream-50/60">No companies found</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-cream-50/10 text-xs text-cream-50/50">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Users</th>
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Features</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const enabledCount = Object.values(c.features || {}).filter(Boolean).length
                return (
                  <tr key={c.id} className="border-b border-cream-50/5 last:border-0 hover:bg-cream-50/5">
                    <td className="px-5 py-3">
                      <Link to={`/admin/companies/${c.id}`} className="font-medium text-cream-50 hover:text-clay-400">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-cream-50/70">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} /> {c.userCount}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-cream-50/70">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-3 text-cream-50/70">{enabledCount} enabled</td>
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
