import { useState } from 'react'
import { ScanLine, AlertCircle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const categories = [
  'Electronics', 'Mobile & Accessories', 'Apparel', 'Food & Beverage',
  'Home & Living', 'Other',
]

const initialForm = {
  name: '', sku: '', category: '', price: '', cost: '', stockQuantity: '',
  tracksSerial: null,
}

export default function AddProductModal({ open, onClose, onSubmit }) {
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

    if (form.tracksSerial === null) {
      setError('Let us know if this product needs IMEI/serial tracking.')
      return
    }

    setError(null)
    setLoading(true)

    const { error: submitError } = await onSubmit({
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category || null,
      price: Number(form.price) || 0,
      cost: form.cost ? Number(form.cost) : 0,
      stock_quantity: Number(form.stockQuantity) || 0,
      tracks_serial: form.tracksSerial === 'yes',
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
      title="Add a product"
      subtitle="Add an item to your catalog. You can edit details anytime."
    >
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field
          label="Product name *"
          required
          value={form.name}
          onChange={update('name')}
          placeholder="e.g. iPhone 15 Pro 256GB"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="SKU"
            value={form.sku}
            onChange={update('sku')}
            placeholder="Auto (e.g. P3) — leave blank"
          />
          <label className="block">
            <span className="text-xs font-medium text-ink-500">Category</span>
            <select
              value={form.category}
              onChange={update('category')}
              className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field
            label="Price *"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.price}
            onChange={update('price')}
            placeholder="0.00"
          />
          <Field
            label="Cost"
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={update('cost')}
            placeholder="0.00"
          />
          <Field
            label="Stock qty *"
            type="number"
            min="0"
            step="1"
            required
            value={form.stockQuantity}
            onChange={update('stockQuantity')}
            placeholder="0"
          />
        </div>

        <div className="rounded-xl border border-ink-400/15 bg-cream-100 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
              <ScanLine size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">
                Does this product need IMEI / serial number tracking?
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                Turn this on for phones, laptops or anything you need to
                trace unit by unit. You can register individual serial
                numbers after adding it.
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, tracksSerial: 'yes' }))}
              className={optionClass(form.tracksSerial === 'yes')}
            >
              Yes, track by serial/IMEI
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, tracksSerial: 'no' }))}
              className={optionClass(form.tracksSerial === 'no')}
            >
              No, track by quantity
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding…' : 'Add product'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function optionClass(active) {
  return `rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
    active
      ? 'border-clay-500 bg-clay-500/10 text-clay-600'
      : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
  }`
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
