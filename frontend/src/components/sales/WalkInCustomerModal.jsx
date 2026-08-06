import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const PHONE_RE = /^\+?\d{9,15}$/

// Purely a form — no data fetching of its own. The caller already has
// useCustomers()/useSales() instantiated (NewSalesReceipt.jsx does, for
// its own "Add new customer" quick-create), so `onSubmit` is the same
// { error } | { data } contract AddCustomerModal.jsx already uses,
// letting the caller own creating the customer, attaching it to the
// sale, and deciding what opens next.
export default function WalkInCustomerModal({ open, onClose, channel, onSubmit }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nic, setNic] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const close = () => {
    setName('')
    setPhone('')
    setEmail('')
    setNic('')
    setError(null)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const cleanedPhone = phone.trim().replace(/[\s-]/g, '')
    if (channel === 'sms' && !PHONE_RE.test(cleanedPhone)) {
      setError('Enter a valid phone number with country code (e.g. 94710000000).')
      return
    }
    if (channel === 'email' && !email.trim()) {
      setError('Enter an email address.')
      return
    }

    setLoading(true)
    const { error: submitError } = await onSubmit({
      name: name.trim() || 'Walk-in customer',
      phone: cleanedPhone || null,
      email: email.trim() || null,
      nic: nic.trim() || null,
      source: 'walk_in',
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
      title="Save this customer"
      subtitle={
        channel === 'sms'
          ? 'Add their phone number so you can text them this receipt — saved as a customer for next time too.'
          : 'Add their email so you can send them this receipt — saved as a customer for next time too.'
      }
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-ink-500">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Walk-in customer"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">
            Phone number {channel === 'sms' ? '*' : '(optional)'}
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="94710000000"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">
            Email {channel === 'email' ? '*' : '(optional)'}
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-ink-500">NIC (optional)</span>
          <input
            value={nic}
            onChange={(e) => setNic(e.target.value)}
            placeholder="Optional"
            className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </label>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving…' : 'Save & continue'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
