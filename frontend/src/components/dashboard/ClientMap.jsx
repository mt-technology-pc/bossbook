import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import sriLanka from '@svg-maps/sri-lanka'
import { AlertCircle } from 'lucide-react'
import { useClientDistricts } from '../../hooks/useClientDistricts'
import Modal from '../ui/Modal'

const NEUTRAL_FILL = '#e5e2d9' // cream-400
const STROKE = '#8a8478' // ink-400

export default function ClientMap() {
  const { rows, totalRegistered, totalActive, loading, error } = useClientDistricts()
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [centers, setCenters] = useState({})
  const pathRefs = useRef({})

  const byName = useMemo(() => {
    const map = new Map()
    rows.forEach((r) => map.set(r.district, r))
    return map
  }, [rows])

  const maxRegistered = Math.max(1, ...rows.map((r) => r.registered))

  useEffect(() => {
    if (loading) return
    const next = {}
    sriLanka.locations.forEach((loc) => {
      const el = pathRefs.current[loc.id]
      if (el) {
        const box = el.getBBox()
        next[loc.id] = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      }
    })
    setCenters(next)
  }, [loading])

  const fillFor = (name) => {
    const bucket = byName.get(name)
    if (!bucket || bucket.registered === 0) return NEUTRAL_FILL
    const intensity = 0.3 + 0.6 * (bucket.registered / maxRegistered)
    return `rgba(0, 71, 171, ${intensity})`
  }

  const selectedBucket = selected ? byName.get(selected) : null
  const hoveredBucket = hovered ? byName.get(hovered) : null

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
        <div className="mt-5 flex flex-col items-center">
          <div className="relative w-full max-w-md">
            <svg viewBox={sriLanka.viewBox} className="w-full">
              {sriLanka.locations.map((loc) => (
                <path
                  key={loc.id}
                  ref={(el) => { pathRefs.current[loc.id] = el }}
                  d={loc.path}
                  fill={fillFor(loc.name)}
                  stroke={STROKE}
                  strokeWidth={0.6}
                  className="cursor-pointer transition-opacity hover:opacity-70"
                  onClick={() => setSelected(loc.name)}
                  onMouseEnter={() => setHovered(loc.name)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
              {sriLanka.locations.map((loc) => {
                const c = centers[loc.id]
                if (!c) return null
                const bucket = byName.get(loc.name)
                return (
                  <text
                    key={`${loc.id}-label`}
                    x={c.x}
                    y={c.y}
                    textAnchor="middle"
                    fontSize="7"
                    className="pointer-events-none select-none fill-ink-900 font-semibold"
                  >
                    {bucket ? `${bucket.registered}/${bucket.active}` : '0/0'}
                  </text>
                )
              })}
            </svg>

            {hoveredBucket && (
              <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-ink-900/90 px-2.5 py-1.5 text-xs text-cream-50">
                {hoveredBucket.district} — {hoveredBucket.registered} registered · {hoveredBucket.active} active
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-ink-400">
            Click a district to see its customers. Map data © svg-maps.com contributors (CC BY 4.0).
          </p>
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected}
        subtitle={
          selectedBucket
            ? `${selectedBucket.registered} registered · ${selectedBucket.active} active in the last 90 days`
            : ''
        }
      >
        {selectedBucket?.customers.length ? (
          <ul className="mt-4 max-h-96 space-y-1 overflow-y-auto">
            {selectedBucket.customers.map((c) => (
              <li key={c.id}>
                <Link
                  to={`/dashboard/customers/${c.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-800 hover:bg-cream-200"
                >
                  {c.name}
                  {c.active ? (
                    <span className="text-xs font-medium text-clay-600">Active</span>
                  ) : (
                    <span className="text-xs text-ink-400">Inactive</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-400">No customers tagged to this district yet.</p>
        )}
      </Modal>
    </div>
  )
}
