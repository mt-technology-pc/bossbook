import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ArrowLeft, AlertCircle, X, Trash2, Check, ShieldCheck, Pencil,
} from 'lucide-react'
import { useTeamUsers } from '../../hooks/useTeamUsers'
import { useTeamRoles } from '../../hooks/useTeamRoles'
import { useMyPermissions } from '../../hooks/useMyPermissions'

const ACCENT = '#2f6fed'
const ACCENT_HOVER = '#2559c9'

// Kept in sync with the page `key`s in DashboardLayout.jsx's nav/
// topBarShortcuts, and the page_key values my_permissions() (schema.sql)
// checks against. "team" itself is deliberately not offered here — Team
// access is gated purely by full_access (is_team_manager()), never by a
// checkbox, so a limited role can never grant itself team management.
const PAGE_OPTIONS = [
  { key: 'sales', label: 'Sales' },
  { key: 'credit_notes', label: 'Credit Notes' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'purchase_returns', label: 'Purchase Returns' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'journal_entries', label: 'Journal Entries' },
  { key: 'customers', label: 'Customers' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'reports', label: 'Reports' },
  { key: 'serial_tracking', label: 'Serial tracking' },
  { key: 'sales_reps', label: 'Sales Reps' },
  { key: 'receivables', label: 'Receivables' },
  { key: 'payables', label: 'Payables' },
  { key: 'backup', label: 'Backup' },
  { key: 'settings', label: 'Settings' },
]

function randomPassword() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

function AccentButton({ children, onClick, disabled, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: ACCENT }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = ACCENT_HOVER }}
      onMouseLeave={(e) => { if (!disabled) e.currentTarget.style.background = ACCENT }}
    >
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-[#e3e6ea] bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#2b3648]">{title}</h3>
          <button onClick={onClose} className="text-[#9aa2ad] hover:text-[#2b3648]">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function AddUserModal({ roles, onClose, onSubmit }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(randomPassword())
  const [roleId, setRoleId] = useState(roles[0]?.id || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: submitError } = await onSubmit({ email: email.trim(), password, roleId: roleId || null })
    setSubmitting(false)
    if (submitError) setError(submitError.message)
  }

  return (
    <Modal title="Add user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <p className="flex items-center gap-1.5 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={13} /> {error}
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#4a5568]">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            className="w-full rounded-md border border-[#dfe3e8] px-3 py-2.5 text-sm text-[#333] outline-none focus:border-[#2f6fed]"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#4a5568]">Temporary password</span>
          <div className="flex gap-2">
            <input
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 rounded-md border border-[#dfe3e8] px-3 py-2.5 font-mono text-sm text-[#333] outline-none focus:border-[#2f6fed]"
            />
            <button
              type="button"
              onClick={() => setPassword(randomPassword())}
              className="shrink-0 rounded-md border border-[#dfe3e8] px-3 text-xs font-semibold text-[#4a5568] hover:border-[#2f6fed] hover:text-[#2f6fed]"
            >
              Generate
            </button>
          </div>
          <p className="mt-1 text-[11px] text-[#8b93a1]">You'll need to share this with them yourself — it's shown once, on the next screen.</p>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#4a5568]">Role</span>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full rounded-md border border-[#dfe3e8] px-3 py-2.5 text-sm text-[#333] outline-none focus:border-[#2f6fed]"
          >
            <option value="">No role (no page access yet)</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
        <AccentButton type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create user'}
        </AccentButton>
      </form>
    </Modal>
  )
}

function RoleModal({ role, onClose, onSubmit }) {
  const [name, setName] = useState(role?.name || '')
  const [fullAccess, setFullAccess] = useState(role?.full_access ?? false)
  const [pageKeys, setPageKeys] = useState(role?.pageKeys || [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const togglePage = (key) => {
    setPageKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: submitError } = await onSubmit({ name: name.trim(), fullAccess, pageKeys })
    setSubmitting(false)
    if (submitError) setError(submitError.message)
  }

  return (
    <Modal title={role ? 'Edit role' : 'Add role'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <p className="flex items-center gap-1.5 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            <AlertCircle size={13} /> {error}
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-[#4a5568]">Role name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales Assistant"
            className="w-full rounded-md border border-[#dfe3e8] px-3 py-2.5 text-sm text-[#333] outline-none focus:border-[#2f6fed]"
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-md border border-[#dfe3e8] px-3.5 py-2.5">
          <span>
            <span className="block text-sm font-semibold text-[#2b3648]">Full system access</span>
            <span className="block text-[11px] text-[#8b93a1]">Every page, no restrictions — like an owner.</span>
          </span>
          <input
            type="checkbox"
            checked={fullAccess}
            onChange={(e) => setFullAccess(e.target.checked)}
            className="h-4 w-4 shrink-0"
            style={{ accentColor: ACCENT }}
          />
        </label>

        {!fullAccess && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-[#4a5568]">Pages this role can access</span>
            <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border border-[#dfe3e8] p-2.5">
              {PAGE_OPTIONS.map((p) => (
                <label key={p.key} className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-xs text-[#333] hover:bg-[#f6f8fb]">
                  <input
                    type="checkbox"
                    checked={pageKeys.includes(p.key)}
                    onChange={() => togglePage(p.key)}
                    style={{ accentColor: ACCENT }}
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
        )}

        <AccentButton type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : role ? 'Save changes' : 'Create role'}
        </AccentButton>
      </form>
    </Modal>
  )
}

export default function Team() {
  const navigate = useNavigate()
  const { isFullAccess } = useMyPermissions()
  const { users, loading: usersLoading, error: usersError, addUser, setUserRole, removeUser } = useTeamUsers()
  const { roles, loading: rolesLoading, error: rolesError, addRole, updateRole, deleteRole } = useTeamRoles()

  const [tab, setTab] = useState('users')
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)
  const [roleModal, setRoleModal] = useState(null) // null | { role: existingRole | null }
  const [busyUserId, setBusyUserId] = useState(null)

  const roleName = (u) => {
    if (u.role === 'owner') return 'Primary admin'
    const role = roles.find((r) => r.id === u.roleId)
    return role?.name || 'No role assigned'
  }

  const handleAddUser = async (payload) => {
    const { data, error } = await addUser(payload)
    if (error) return { error }
    setCreatedUser(data)
    setAddUserOpen(false)
    return {}
  }

  const handleRemoveUser = async (u) => {
    if (!window.confirm(`Remove ${u.email}? Their login will be deleted entirely — this can't be undone.`)) return
    setBusyUserId(u.userId)
    await removeUser(u.userId)
    setBusyUserId(null)
  }

  const handleRoleChange = async (u, roleId) => {
    setBusyUserId(u.userId)
    await setUserRole(u.userId, roleId || null)
    setBusyUserId(null)
  }

  const handleSaveRole = async (payload) => {
    const { error } = roleModal.role
      ? await updateRole(roleModal.role.id, payload)
      : await addRole(payload)
    if (error) return { error }
    setRoleModal(null)
    return {}
  }

  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete the "${role.name}" role? Anyone assigned to it will lose those page permissions.`)) return
    const { error } = await deleteRole(role.id)
    if (error) window.alert(error.message)
  }

  return (
    <div className="min-h-screen w-full bg-[#eef1f5] p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium text-[#9aa2ad] transition-colors hover:text-[#2f6fed]"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <h1 className="text-[22px] font-bold text-[#2b3648]">Manage users</h1>

      <div className="mt-4 flex gap-6 border-b border-[#e3e6ea]">
        {[{ key: 'users', label: 'Users' }, { key: 'roles', label: 'Roles' }].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="relative pb-3 text-sm font-semibold transition-colors"
            style={{ color: tab === t.key ? ACCENT : '#8b93a1' }}
          >
            {t.label}
            {tab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ background: ACCENT }} />
            )}
          </button>
        ))}
      </div>

      {createdUser && (
        <div className="mt-5 flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          <span className="flex items-start gap-2">
            <Check size={16} className="mt-0.5 shrink-0" />
            Created {createdUser.email} — temporary password:{' '}
            <span className="font-mono font-semibold">{createdUser.temporaryPassword}</span>{' '}
            (copy this now, it won't be shown again)
          </span>
          <button onClick={() => setCreatedUser(null)} className="shrink-0 text-xs font-semibold text-emerald-700/70 hover:text-emerald-700">
            Dismiss
          </button>
        </div>
      )}

      {tab === 'users' ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#8b93a1]">{users.length} {users.length === 1 ? 'person' : 'people'} on your team</p>
            {isFullAccess && (
              <AccentButton onClick={() => setAddUserOpen(true)}>
                <Plus size={15} /> Add user
              </AccentButton>
            )}
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[#e3e6ea] bg-white">
            {usersError && (
              <div className="m-4.5 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
                <AlertCircle size={15} className="mt-0.5 shrink-0" /> {usersError}
              </div>
            )}
            {usersLoading ? (
              <div className="flex justify-center py-16">
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#2f6fed]/30 border-t-[#2f6fed]" />
              </div>
            ) : (
              <table className="w-full min-w-[720px] text-left text-[13.5px]">
                <thead>
                  <tr className="border-b border-[#eef0f3]">
                    <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Name</th>
                    <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Email</th>
                    <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Status</th>
                    <th className="whitespace-nowrap px-5 py-3.5 text-xs font-semibold text-[#8b93a1]">Role</th>
                    <th className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold text-[#8b93a1]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.userId} className="border-b border-[#f1f3f6] last:border-0">
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-[#2b3648]">
                        {u.orphaned ? <span className="italic text-[#c3c9d1]">Deleted account</span> : (u.fullName || u.email)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#333]">{u.email || '—'}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#333]">{u.orphaned ? 'Removed' : 'Active'}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-[#333]">
                        {u.role === 'owner' || !isFullAccess ? (
                          <span className="flex items-center gap-1.5">
                            {u.role === 'owner' && <ShieldCheck size={13} style={{ color: ACCENT }} />}
                            {roleName(u)}
                          </span>
                        ) : (
                          <select
                            value={u.roleId || ''}
                            disabled={busyUserId === u.userId}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="rounded-md border border-[#dfe3e8] px-2 py-1.5 text-xs text-[#333] outline-none focus:border-[#2f6fed]"
                          >
                            <option value="">No role assigned</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {isFullAccess && u.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveUser(u)}
                            disabled={busyUserId === u.userId}
                            className="rounded-md p-2 text-[#9aa2ad] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                            aria-label={`Remove ${u.email}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[#8b93a1]">Roles control which pages a teammate can open</p>
            {isFullAccess && (
              <AccentButton onClick={() => setRoleModal({ role: null })}>
                <Plus size={15} /> Add role
              </AccentButton>
            )}
          </div>

          {rolesError && (
            <div className="mt-4 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /> {rolesError}
            </div>
          )}

          {rolesLoading ? (
            <div className="flex justify-center py-16">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#2f6fed]/30 border-t-[#2f6fed]" />
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e3e6ea] bg-white px-4.5 py-3.5">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold text-[#2b3648]">
                    <ShieldCheck size={14} style={{ color: ACCENT }} /> Primary admin
                  </p>
                  <p className="mt-0.5 text-xs text-[#8b93a1]">Full system access — the account that owns this company.</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#eef0f3] px-2.5 py-1 text-[11px] font-semibold text-[#6b7280]">System</span>
              </div>

              {roles.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#e3e6ea] bg-white px-4.5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#2b3648]">{r.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[#8b93a1]">
                      {r.full_access ? 'Full system access' : r.pageKeys.length > 0
                        ? r.pageKeys.map((k) => PAGE_OPTIONS.find((p) => p.key === k)?.label || k).join(', ')
                        : 'No pages granted yet'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {r.is_system ? (
                      <span className="rounded-full bg-[#eef0f3] px-2.5 py-1 text-[11px] font-semibold text-[#6b7280]">System</span>
                    ) : isFullAccess && (
                      <>
                        <button
                          onClick={() => setRoleModal({ role: r })}
                          className="rounded-md p-2 text-[#9aa2ad] hover:bg-[#f6f8fb] hover:text-[#2f6fed]"
                          aria-label={`Edit ${r.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="rounded-md p-2 text-[#9aa2ad] hover:bg-red-50 hover:text-red-500"
                          aria-label={`Delete ${r.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {addUserOpen && (
        <AddUserModal roles={roles} onClose={() => setAddUserOpen(false)} onSubmit={handleAddUser} />
      )}
      {roleModal && (
        <RoleModal role={roleModal.role} onClose={() => setRoleModal(null)} onSubmit={handleSaveRole} />
      )}
    </div>
  )
}
