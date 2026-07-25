import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, AlertCircle, Mail, Clock, ShieldCheck } from 'lucide-react'
import { apiFetch } from '../../lib/api'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

export default function AdminCompanyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [newFeatureKey, setNewFeatureKey] = useState('')

  const load = () => {
    setLoading(true)
    apiFetch(`/api/admin/companies/${id}`)
      .then((data) => {
        setCompany(data.company)
        setUsers(data.users)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const updateFeatures = async (features) => {
    setSaving(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/admin/companies/${id}/features`, {
        method: 'PATCH',
        body: JSON.stringify({ features }),
      })
      setCompany(data.company)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleFeature = (key, value) => updateFeatures({ [key]: value })

  const addFeature = () => {
    const key = newFeatureKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (!key) return
    updateFeatures({ [key]: true })
    setNewFeatureKey('')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-cream-50/20 border-t-cream-50" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        {error || 'Company not found.'}
      </div>
    )
  }

  const featureEntries = Object.entries(company.features || {})

  return (
    <div>
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-1.5 text-sm text-cream-50/60 hover:text-cream-50"
      >
        <ArrowLeft size={15} /> Companies
      </button>

      <h1 className="mt-4 font-heading text-2xl font-semibold">{company.name}</h1>
      <p className="mt-1 text-sm text-cream-50/60">Created {formatDate(company.created_at)}</p>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-cream-50/10 p-5">
          <h2 className="font-heading text-base font-semibold">Features</h2>
          <p className="mt-1 text-xs text-cream-50/50">
            Toggle what this company has access to, or add a new feature key.
          </p>

          <div className="mt-4 space-y-2">
            {featureEntries.map(([key, value]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-lg bg-cream-50/5 px-3.5 py-2.5 text-sm">
                <span className="font-mono text-xs text-cream-50/80">{key}</span>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  disabled={saving}
                  onChange={(e) => toggleFeature(key, e.target.checked)}
                  className="h-4 w-4 rounded border-cream-50/30 text-clay-500 focus:ring-clay-500"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={newFeatureKey}
              onChange={(e) => setNewFeatureKey(e.target.value)}
              placeholder="new_feature_key"
              className="flex-1 rounded-lg border border-cream-50/15 bg-ink-800 px-3 py-2 text-xs text-cream-50 placeholder:text-cream-50/40 outline-none focus:border-clay-500"
            />
            <button
              onClick={addFeature}
              disabled={saving || !newFeatureKey.trim()}
              className="flex items-center gap-1 rounded-lg border border-cream-50/15 px-3 py-2 text-xs font-medium text-cream-50 hover:border-clay-500 disabled:opacity-40"
            >
              <Plus size={13} /> Add
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-cream-50/10 p-5">
          <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold">
            Users ({users.length})
          </h2>

          <ul className="mt-4 space-y-2">
            {users.map((u) => (
              <li key={u.userId} className="rounded-lg bg-cream-50/5 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{u.fullName || u.email}</span>
                  {u.role === 'owner' && (
                    <span className="flex items-center gap-1 rounded-full bg-clay-500/20 px-2 py-0.5 text-[10px] font-semibold text-clay-300">
                      <ShieldCheck size={10} /> Owner
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream-50/50">
                  <span className="flex items-center gap-1"><Mail size={11} /> {u.email}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> Joined {formatDate(u.joinedAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
