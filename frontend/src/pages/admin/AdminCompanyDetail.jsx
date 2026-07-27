import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, AlertCircle, Mail, Clock, ShieldCheck, UserPlus, UserMinus,
  Check, DatabaseBackup, Wallet, ChevronDown, PauseCircle, PlayCircle,
} from 'lucide-react'
import { apiFetch, apiFetchBlob } from '../../lib/api'
import { downloadBlob } from '../../lib/exportTable'
import { formatCurrency } from '../../lib/currency'

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
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

  const [outstanding, setOutstanding] = useState({ outstandingSales: [], outstandingPurchases: [], accounts: [] })
  const [outstandingLoading, setOutstandingLoading] = useState(true)

  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addUserEmail, setAddUserEmail] = useState('')
  const [addUserPassword, setAddUserPassword] = useState('')
  const [addUserRole, setAddUserRole] = useState('staff')
  const [addUserSubmitting, setAddUserSubmitting] = useState(false)
  const [addUserError, setAddUserError] = useState(null)
  const [createdUserBanner, setCreatedUserBanner] = useState(null)
  const [removingUserId, setRemovingUserId] = useState(null)

  const [paymentRow, setPaymentRow] = useState(null) // { kind: 'sale'|'purchase', row }
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState(null)

  const [backupDownloading, setBackupDownloading] = useState(false)
  const [pauseSaving, setPauseSaving] = useState(false)

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

  const loadOutstanding = () => {
    setOutstandingLoading(true)
    apiFetch(`/api/admin/companies/${id}/outstanding`)
      .then(setOutstanding)
      .catch((err) => setError(err.message))
      .finally(() => setOutstandingLoading(false))
  }

  useEffect(load, [id])
  useEffect(loadOutstanding, [id])

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

  const ownerCount = users.filter((u) => u.role === 'owner').length

  const submitAddUser = async (e) => {
    e.preventDefault()
    setAddUserSubmitting(true)
    setAddUserError(null)
    try {
      const data = await apiFetch(`/api/admin/companies/${id}/users`, {
        method: 'POST',
        body: JSON.stringify({ email: addUserEmail.trim(), password: addUserPassword, role: addUserRole }),
      })
      setCreatedUserBanner(data.user)
      setAddUserEmail('')
      setAddUserPassword('')
      setAddUserRole('staff')
      setAddUserOpen(false)
      load()
    } catch (err) {
      setAddUserError(err.message)
    } finally {
      setAddUserSubmitting(false)
    }
  }

  const removeUser = async (userId) => {
    if (!window.confirm('Remove this user? Their login will be deleted entirely — this cannot be undone.')) return
    setRemovingUserId(userId)
    setError(null)
    try {
      await apiFetch(`/api/admin/companies/${id}/users/${userId}`, { method: 'DELETE' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemovingUserId(null)
    }
  }

  const openPaymentForm = (kind, row) => {
    setPaymentRow({ kind, row })
    setPaymentAccountId(outstanding.accounts[0]?.id || '')
    setPaymentAmount(String(row.outstanding))
    setPaymentDate(new Date().toISOString().slice(0, 10))
    setPaymentNote('')
    setPaymentError(null)
  }

  const submitPayment = async (e) => {
    e.preventDefault()
    if (!paymentRow) return
    setPaymentSubmitting(true)
    setPaymentError(null)
    try {
      const { kind, row } = paymentRow
      const path = kind === 'sale'
        ? `/api/admin/companies/${id}/receive-payment`
        : `/api/admin/companies/${id}/pay-bill`
      const body = kind === 'sale'
        ? { customerId: row.customer_id, accountId: paymentAccountId, amount: Number(paymentAmount), note: paymentNote, paymentDate, saleId: row.sale_id }
        : { supplierId: row.supplier_id, accountId: paymentAccountId, amount: Number(paymentAmount), note: paymentNote, paymentDate, purchaseId: row.purchase_id }
      await apiFetch(path, { method: 'POST', body: JSON.stringify(body) })
      setPaymentRow(null)
      loadOutstanding()
    } catch (err) {
      setPaymentError(err.message)
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const handleBackup = async () => {
    setBackupDownloading(true)
    setError(null)
    try {
      const blob = await apiFetchBlob(`/api/admin/companies/${id}/backup`)
      const safeName = (company?.name || 'company').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      downloadBlob(blob, `bossbooks-backup-${safeName}-${new Date().toISOString().slice(0, 10)}.zip`)
    } catch (err) {
      setError(err.message || 'Could not generate the backup.')
    } finally {
      setBackupDownloading(false)
    }
  }

  const togglePause = async () => {
    const nextPaused = !company.paused
    if (nextPaused && !window.confirm(`Pause ${company.name}? Every user there will be locked out immediately.`)) return
    setPauseSaving(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/admin/companies/${id}/pause`, {
        method: 'PATCH',
        body: JSON.stringify({ paused: nextPaused }),
      })
      setCompany(data.company)
    } catch (err) {
      setError(err.message)
    } finally {
      setPauseSaving(false)
    }
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">{company.name}</h1>
            {company.paused && (
              <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-red-400">
                Paused
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-cream-50/60">Created {formatDate(company.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            disabled={pauseSaving}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              company.paused
                ? 'border-green-500/40 text-green-400 hover:bg-green-500/10'
                : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
            }`}
          >
            {company.paused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
            {pauseSaving ? 'Saving…' : company.paused ? 'Unpause' : 'Pause'}
          </button>
          <button
            onClick={handleBackup}
            disabled={backupDownloading}
            className="flex items-center gap-1.5 rounded-full border border-cream-50/20 px-4 py-2 text-sm font-medium text-cream-50 hover:border-clay-500 hover:text-clay-400 disabled:opacity-50"
          >
            <DatabaseBackup size={14} />
            {backupDownloading ? 'Preparing…' : 'Download backup'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {createdUserBanner && (
        <div className="mt-6 flex items-start justify-between gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-2.5 text-sm text-green-400">
          <span className="flex items-start gap-2">
            <Check size={16} className="mt-0.5 shrink-0" />
            Created {createdUserBanner.email} — temporary password: <span className="font-mono">{createdUserBanner.temporaryPassword}</span> (copy this now, it won't be shown again)
          </span>
          <button onClick={() => setCreatedUserBanner(null)} className="shrink-0 text-xs font-medium text-green-400/70 hover:text-green-400">Dismiss</button>
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
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold">
              Users ({users.length})
            </h2>
            <button
              onClick={() => setAddUserOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-medium text-cream-50/60 hover:text-clay-400"
            >
              <UserPlus size={13} /> Add user
            </button>
          </div>

          {addUserOpen && (
            <form onSubmit={submitAddUser} className="mt-3 space-y-2 rounded-lg bg-cream-50/5 p-3.5">
              {addUserError && (
                <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={12} /> {addUserError}</p>
              )}
              <input
                type="email"
                required
                value={addUserEmail}
                onChange={(e) => setAddUserEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-cream-50/15 bg-ink-800 px-3 py-2 text-xs text-cream-50 placeholder:text-cream-50/40 outline-none focus:border-clay-500"
              />
              <div className="flex gap-2">
                <input
                  required
                  minLength={8}
                  value={addUserPassword}
                  onChange={(e) => setAddUserPassword(e.target.value)}
                  placeholder="Temporary password"
                  className="flex-1 rounded-lg border border-cream-50/15 bg-ink-800 px-3 py-2 font-mono text-xs text-cream-50 placeholder:text-cream-50/40 outline-none focus:border-clay-500"
                />
                <button
                  type="button"
                  onClick={() => setAddUserPassword(randomPassword())}
                  className="shrink-0 rounded-lg border border-cream-50/15 px-2.5 text-xs text-cream-50/70 hover:border-clay-500"
                >
                  Generate
                </button>
              </div>
              <select
                value={addUserRole}
                onChange={(e) => setAddUserRole(e.target.value)}
                className="w-full rounded-lg border border-cream-50/15 bg-ink-800 px-3 py-2 text-xs text-cream-50 outline-none focus:border-clay-500"
              >
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
              <button
                type="submit"
                disabled={addUserSubmitting}
                className="w-full rounded-lg bg-clay-500 px-3 py-2 text-xs font-medium text-cream-50 hover:bg-clay-600 disabled:opacity-50"
              >
                {addUserSubmitting ? 'Creating…' : 'Create user'}
              </button>
            </form>
          )}

          <ul className="mt-4 space-y-2">
            {users.map((u) => (
              <li key={u.userId} className="rounded-lg bg-cream-50/5 px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {u.orphaned ? <span className="italic text-cream-50/40">Deleted account</span> : (u.fullName || u.email)}
                  </span>
                  <div className="flex items-center gap-2">
                    {u.role === 'owner' && (
                      <span className="flex items-center gap-1 rounded-full bg-clay-500/20 px-2 py-0.5 text-[10px] font-semibold text-clay-300">
                        <ShieldCheck size={10} /> Owner
                      </span>
                    )}
                    <button
                      onClick={() => removeUser(u.userId)}
                      disabled={removingUserId === u.userId || (u.role === 'owner' && ownerCount <= 1)}
                      title={u.role === 'owner' && ownerCount <= 1 ? 'Cannot remove the only owner' : 'Remove user'}
                      className="rounded-lg p-1 text-cream-50/40 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
                    >
                      <UserMinus size={13} />
                    </button>
                  </div>
                </div>
                {!u.orphaned && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream-50/50">
                    <span className="flex items-center gap-1"><Mail size={11} /> {u.email}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> Joined {formatDate(u.joinedAt)}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-cream-50/10 p-5 lg:col-span-2">
          <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold">
            <Wallet size={16} /> Outstanding balances
          </h2>
          <p className="mt-1 text-xs text-cream-50/50">
            Mark an invoice or bill as paid — creates a real payment and journal entry, same as the owner's own Receive Payment / Pay Bill pages.
          </p>

          {outstandingLoading ? (
            <div className="mt-4 flex justify-center py-6">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cream-50/20 border-t-cream-50" />
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-cream-50/40">Unpaid invoices</h3>
                {outstanding.outstandingSales.length === 0 ? (
                  <p className="mt-2 text-xs text-cream-50/40">Nothing outstanding.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {outstanding.outstandingSales.map((row) => (
                      <li key={row.sale_id} className="rounded-lg bg-cream-50/5 px-3.5 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span>{row.customer_name || 'Unknown'} · {row.reference || '—'}</span>
                          <span className="font-semibold">{formatCurrency(row.outstanding)}</span>
                        </div>
                        <button
                          onClick={() => openPaymentForm('sale', row)}
                          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-clay-400 hover:text-clay-300"
                        >
                          <ChevronDown size={12} /> Record payment
                        </button>
                        {paymentRow?.kind === 'sale' && paymentRow.row.sale_id === row.sale_id && (
                          <PaymentForm
                            accounts={outstanding.accounts}
                            accountId={paymentAccountId} setAccountId={setPaymentAccountId}
                            amount={paymentAmount} setAmount={setPaymentAmount}
                            date={paymentDate} setDate={setPaymentDate}
                            note={paymentNote} setNote={setPaymentNote}
                            submitting={paymentSubmitting}
                            error={paymentError}
                            onSubmit={submitPayment}
                            onCancel={() => setPaymentRow(null)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-cream-50/40">Unpaid bills</h3>
                {outstanding.outstandingPurchases.length === 0 ? (
                  <p className="mt-2 text-xs text-cream-50/40">Nothing outstanding.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {outstanding.outstandingPurchases.map((row) => (
                      <li key={row.purchase_id} className="rounded-lg bg-cream-50/5 px-3.5 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span>{row.supplier_name || 'Unknown'} · {row.reference || '—'}</span>
                          <span className="font-semibold">{formatCurrency(row.outstanding)}</span>
                        </div>
                        <button
                          onClick={() => openPaymentForm('purchase', row)}
                          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-clay-400 hover:text-clay-300"
                        >
                          <ChevronDown size={12} /> Record payment
                        </button>
                        {paymentRow?.kind === 'purchase' && paymentRow.row.purchase_id === row.purchase_id && (
                          <PaymentForm
                            accounts={outstanding.accounts}
                            accountId={paymentAccountId} setAccountId={setPaymentAccountId}
                            amount={paymentAmount} setAmount={setPaymentAmount}
                            date={paymentDate} setDate={setPaymentDate}
                            note={paymentNote} setNote={setPaymentNote}
                            submitting={paymentSubmitting}
                            error={paymentError}
                            onSubmit={submitPayment}
                            onCancel={() => setPaymentRow(null)}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PaymentForm({
  accounts, accountId, setAccountId, amount, setAmount, date, setDate, note, setNote,
  submitting, error, onSubmit, onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2 rounded-lg bg-ink-800 p-3">
      {error && <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={12} /> {error}</p>}
      <select
        required
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="w-full rounded-lg border border-cream-50/15 bg-ink-900 px-2.5 py-1.5 text-xs text-cream-50 outline-none focus:border-clay-500"
      >
        <option value="" disabled>Deposit / pay from account…</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="number" step="0.01" min="0.01" required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-1/2 rounded-lg border border-cream-50/15 bg-ink-900 px-2.5 py-1.5 text-xs text-cream-50 outline-none focus:border-clay-500"
        />
        <input
          type="date" required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-1/2 rounded-lg border border-cream-50/15 bg-ink-900 px-2.5 py-1.5 text-xs text-cream-50 outline-none focus:border-clay-500"
        />
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full rounded-lg border border-cream-50/15 bg-ink-900 px-2.5 py-1.5 text-xs text-cream-50 placeholder:text-cream-50/40 outline-none focus:border-clay-500"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !accountId}
          className="flex-1 rounded-lg bg-clay-500 px-3 py-1.5 text-xs font-medium text-cream-50 hover:bg-clay-600 disabled:opacity-50"
        >
          {submitting ? 'Recording…' : 'Record payment'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-cream-50/15 px-3 py-1.5 text-xs text-cream-50/70 hover:border-cream-50/30"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
