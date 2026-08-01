import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, ScanLine, ChevronDown, ChevronUp } from 'lucide-react'
import { useImeiHistory } from '../../hooks/useImeiHistory'
import { exportToCsv } from '../../lib/exportTable'

const EVENT_LABELS = {
  purchased: { label: 'Purchased', color: 'bg-blue-500/10 text-blue-700' },
  sold: { label: 'Sold', color: 'bg-green-500/10 text-green-700' },
  customer_return: { label: 'Customer Return', color: 'bg-amber-500/10 text-amber-700' },
  returned_to_supplier: { label: 'Returned to Supplier', color: 'bg-slate-500/10 text-slate-600' },
  customer_return_reversed: { label: 'Return Reversed', color: 'bg-red-500/10 text-red-600' },
  return_to_supplier_reversed: { label: 'Return Reversed', color: 'bg-red-500/10 text-red-600' },
}

const STATUS_LABELS = {
  in_stock: 'In Stock',
  sold: 'Sold',
  returned_by_customer: 'Returned by Customer',
  returned_to_supplier: 'Returned to Supplier',
}

function formatDateTime(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('en-LK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ImeiHistory() {
  const navigate = useNavigate()
  const [serial, setSerial] = useState('')
  const [eventType, setEventType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expanded, setExpanded] = useState(null)

  const { events, loading, error } = useImeiHistory({
    serialNumber: serial,
    eventType: eventType || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const handleExport = () => {
    if (!events.length) return
    exportToCsv({
      columns: [
        { key: 'datetime', label: 'Date/Time' },
        { key: 'serial', label: 'IMEI / Serial' },
        { key: 'product', label: 'Product' },
        { key: 'event', label: 'Event' },
        { key: 'document', label: 'Document' },
        { key: 'customer', label: 'Customer' },
        { key: 'supplier', label: 'Supplier' },
        { key: 'prev_status', label: 'Previous Status' },
        { key: 'new_status', label: 'New Status' },
        { key: 'notes', label: 'Notes' },
      ],
      rows: events.map(e => ({
        datetime: formatDateTime(e.created_at),
        serial: e.serial_number,
        product: e.products?.name || '',
        event: EVENT_LABELS[e.event_type]?.label || e.event_type,
        document: e.source_reference || '',
        customer: e.customers?.name || '',
        supplier: e.suppliers?.name || '',
        prev_status: STATUS_LABELS[e.previous_status] || e.previous_status || '',
        new_status: STATUS_LABELS[e.new_status] || e.new_status,
        notes: e.notes || '',
      })),
      filename: `imei-history-${new Date().toISOString().slice(0, 10)}.csv`,
    })
  }

  const stats = {
    total: events.length,
    purchased: events.filter(e => e.event_type === 'purchased').length,
    sold: events.filter(e => e.event_type === 'sold').length,
    returned: events.filter(e => e.event_type === 'customer_return' || e.event_type === 'returned_to_supplier').length,
  }

  const statCards = [
    { label: 'Total Events', value: stats.total },
    { label: 'Purchases', value: stats.purchased },
    { label: 'Sales', value: stats.sold },
    { label: 'Returns', value: stats.returned },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate('/dashboard/serial-tracking')}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
        >
          <ArrowLeft size={15} /> Serial Tracking
        </button>
        <button
          onClick={handleExport}
          disabled={!events.length}
          className="flex items-center gap-1.5 rounded-lg border border-ink-400/20 px-3 py-2 text-xs font-medium text-ink-600 transition-colors hover:border-clay-500 hover:text-clay-600 disabled:opacity-40"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <div className="mt-4">
        <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">IMEI History</h1>
        <p className="mt-1 text-sm text-ink-500">
          Complete immutable log of every IMEI/serial number movement.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="rounded-2xl border border-ink-400/15 bg-cream-50 p-4"
          >
            <p className="font-heading text-2xl font-semibold text-ink-900">{s.value}</p>
            <p className="mt-0.5 text-xs text-ink-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-ink-400/15 bg-cream-50 p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">
            <ScanLine size={11} className="mr-1 inline" /> IMEI / Serial
          </label>
          <input
            value={serial}
            onChange={e => setSerial(e.target.value)}
            placeholder="Search IMEI…"
            className="w-48 rounded-xl border border-ink-400/20 bg-cream-100 px-3 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">Event Type</label>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="rounded-xl border border-ink-400/20 bg-cream-100 px-3 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          >
            <option value="">All events</option>
            <option value="purchased">Purchased</option>
            <option value="sold">Sold</option>
            <option value="customer_return">Customer Return</option>
            <option value="returned_to_supplier">Returned to Supplier</option>
            <option value="customer_return_reversed">Return Reversed</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-xl border border-ink-400/20 bg-cream-100 px-3 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-xl border border-ink-400/20 bg-cream-100 px-3 py-2 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
        </div>
        {(serial || eventType || dateFrom || dateTo) && (
          <button
            onClick={() => { setSerial(''); setEventType(''); setDateFrom(''); setDateTo('') }}
            className="text-xs text-ink-400 hover:text-ink-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Event list */}
      <div className="mt-4 rounded-2xl border border-ink-400/15 bg-cream-50">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-600">{error}</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
              <ScanLine size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink-600">No IMEI events found</p>
            <p className="mt-1 text-xs text-ink-400">Events are logged automatically when IMEIs are purchased, sold, or returned.</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-400/10">
            {events.map((e, i) => {
              const isOpen = expanded === e.id
              const badge = EVENT_LABELS[e.event_type]
              const party = e.customers?.name || e.suppliers?.name || null
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                >
                  <button
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-cream-100"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-ink-900">{e.serial_number}</span>
                        {badge && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                        {e.source_reference && (
                          <span className="text-xs text-ink-400">{e.source_reference}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-ink-400">
                        <span>{e.products?.name || 'Unknown product'}</span>
                        {party && <><span>·</span><span>{party}</span></>}
                        <span>·</span>
                        <span>{formatDateTime(e.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {e.previous_status && (
                        <span className="hidden sm:block text-xs text-ink-400">
                          {STATUS_LABELS[e.previous_status] || e.previous_status}
                          {' → '}
                          {STATUS_LABELS[e.new_status] || e.new_status}
                        </span>
                      )}
                      {isOpen
                        ? <ChevronUp size={15} className="text-ink-400" />
                        : <ChevronDown size={15} className="text-ink-400" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mx-4 mb-3 rounded-xl bg-cream-100 px-4 py-3">
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                        <div>
                          <dt className="text-ink-400">Serial / IMEI</dt>
                          <dd className="mt-0.5 font-mono font-medium text-ink-900">{e.serial_number}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Product</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{e.products?.name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Event</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{EVENT_LABELS[e.event_type]?.label || e.event_type}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Document</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{e.source_reference || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Customer</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{e.customers?.name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Supplier</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{e.suppliers?.name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Previous Status</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{STATUS_LABELS[e.previous_status] || e.previous_status || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">New Status</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{STATUS_LABELS[e.new_status] || e.new_status}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-400">Date / Time</dt>
                          <dd className="mt-0.5 font-medium text-ink-900">{formatDateTime(e.created_at)}</dd>
                        </div>
                        {e.notes && (
                          <div className="col-span-2 sm:col-span-3">
                            <dt className="text-ink-400">Notes</dt>
                            <dd className="mt-0.5 text-ink-700">{e.notes}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
