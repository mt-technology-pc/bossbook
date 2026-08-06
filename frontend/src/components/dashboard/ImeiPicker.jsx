import { useEffect, useRef, useState } from 'react'
import { ScanLine, CheckSquare, Square, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function ImeiPicker({
  productId, saleId, purchaseId, value = [], onChange, mode, requiredCount, creditNoteId,
}) {
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(false)
  const [scanInput, setScanInput] = useState('')
  const [scanError, setScanError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (!productId) return
    const fetchUnits = async () => {
      setLoading(true)
      let query = supabase
        .from('product_units')
        .select('id, serial_number, status')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (mode === 'credit_note' && saleId) {
        // Units this exact credit note already returned are sitting at
        // 'returned_by_customer', not 'sold' — editing the credit note
        // must still let those be (re)selected, or a user could never
        // save an edit that touches a serialized line without first
        // being able to pick the units it already has.
        let ownIds = []
        if (creditNoteId) {
          const { data: events } = await supabase
            .from('product_unit_events')
            .select('product_unit_id')
            .eq('source_table', 'credit_notes')
            .eq('source_id', creditNoteId)
            .eq('event_type', 'customer_return')
          ownIds = (events ?? []).map((e) => e.product_unit_id).filter(Boolean)
        }
        query = query.eq('sale_id', saleId)
        query = ownIds.length > 0
          ? query.or(`status.eq.sold,id.in.(${ownIds.join(',')})`)
          : query.eq('status', 'sold')
      } else if (mode === 'purchase_return' && purchaseId) {
        query = query.eq('purchase_id', purchaseId).eq('status', 'in_stock')
      }

      const { data } = await query
      setUnits(data ?? [])
      setLoading(false)
    }
    fetchUnits()
  }, [productId, saleId, purchaseId, mode, creditNoteId])

  const toggle = (unitId) => {
    setScanError('')
    if (value.includes(unitId)) {
      onChange(value.filter(id => id !== unitId))
    } else {
      onChange([...value, unitId])
    }
  }

  // Narrows the visible list as the user types — a real search, not just
  // an all-or-nothing exact match — so finding the right unit by eye (no
  // scanner in hand) doesn't mean scrolling a long, unfiltered list.
  const query = scanInput.trim().toLowerCase()
  const filteredUnits = query
    ? units.filter(u => u.serial_number.toLowerCase().includes(query))
    : units

  const handleScan = (e) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return
    e.preventDefault()
    const serial = scanInput.trim()
    if (!serial) return

    // A full scan/paste of the exact code is the common case (barcode
    // scanners send the whole thing at once) — try that first.
    let match = units.find(u => u.serial_number === serial)

    // Manual typing rarely reaches the full code before Enter feels
    // natural — if what's typed so far narrows the list (searching, as
    // above) down to exactly one not-yet-selected unit, treat Enter as
    // picking that one too, same as a full exact match would.
    if (!match) {
      const selectable = filteredUnits.filter(u => !value.includes(u.id))
      if (selectable.length === 1) match = selectable[0]
    }

    if (!match) {
      setScanError(
        filteredUnits.length > 1
          ? `Multiple matches for "${serial}" — keep typing or tap the one you want.`
          : `IMEI "${serial}" not found in this ${mode === 'credit_note' ? 'invoice' : 'bill'}`,
      )
      return
    }
    if (value.includes(match.id)) {
      setScanError(`IMEI "${match.serial_number}" already selected`)
      return
    }
    onChange([...value, match.id])
    setScanInput('')
    setScanError('')
    inputRef.current?.focus()
  }

  const countLabel = requiredCount
    ? `${value.length} / ${requiredCount} selected`
    : `${value.length} selected`
  const countOk = !requiredCount || value.length === requiredCount

  if (!productId) return null

  return (
    <div className="mt-2 rounded-xl border border-ink-400/15 bg-cream-100 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
          <ScanLine size={12} /> IMEI / Serial
        </span>
        <span className={`text-xs font-semibold ${countOk ? 'text-green-600' : 'text-amber-600'}`}>
          {countLabel}
        </span>
      </div>

      {/* Scan/type input */}
      <div className="mb-2 flex gap-1.5">
        <input
          ref={inputRef}
          value={scanInput}
          onChange={e => { setScanInput(e.target.value); setScanError('') }}
          onKeyDown={handleScan}
          placeholder="Scan or type IMEI, press Enter"
          className="flex-1 rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
        />
      </div>

      {scanError && (
        <p className="mb-2 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={11} /> {scanError}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-3">
          <span className="h-4 w-4 animate-spin rounded-full border border-clay-500/30 border-t-clay-500" />
        </div>
      ) : units.length === 0 ? (
        <p className="py-2 text-center text-xs text-ink-400">
          No IMEI units found for this {mode === 'credit_note' ? 'invoice' : 'bill'}
        </p>
      ) : filteredUnits.length === 0 ? (
        <p className="py-2 text-center text-xs text-ink-400">
          No match for &quot;{scanInput.trim()}&quot;
        </p>
      ) : (
        <div className="max-h-40 space-y-0.5 overflow-y-auto">
          {filteredUnits.map(u => {
            const selected = value.includes(u.id)
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => toggle(u.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                  selected
                    ? 'bg-clay-500/10 text-clay-700'
                    : 'text-ink-700 hover:bg-cream-200'
                }`}
              >
                {selected
                  ? <CheckSquare size={13} className="shrink-0 text-clay-600" />
                  : <Square size={13} className="shrink-0 text-ink-300" />}
                <span className="font-mono">{u.serial_number}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
