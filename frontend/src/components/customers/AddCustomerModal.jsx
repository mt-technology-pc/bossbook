import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const initialForm = { name: '', phone: '', email: '', address: '', notes: '' }

export default function AddCustomerModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const close = () => {
    setForm(initialForm)
    setError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: submitError } = await onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
    })

    setLoading(false)

    if (submitError) {
      setError(submitError.message)
      return
    }

    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a customer"
      subtitle="Save their details so you can invoice or bill them faster next time."
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field
          label="Full name *"
          required
          value={form.name}
          onChange={update('name')}
          placeholder="e.g. Nimal Perera"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={update('phone')}
            placeholder="07X XXX XXXX"
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="Optional"
          />
        </div>

        <Field
          label="Address"
          value={form.address}
          onChange={update('address')}
          placeholder="Optional"
        />

        <label className="block">
          <span className="text-xs font-medium text-ink-500">Notes</span>
          <textarea
            value={form.notes}
            onChange={update('notes')}
            rows={3}
            placeholder="Optional — anything worth remembering about this customer"
            className="mt-1.5 w-full resize-none rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding…' : 'Add customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-500">{label}</span>
      <input
        {...props}
        className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
      />
    </label>
  )
}
