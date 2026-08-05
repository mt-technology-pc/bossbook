import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ScanLine, Loader2, AlertCircle, Plus } from 'lucide-react'
import { useSerialSlotValidation } from '../../hooks/useSerialSlotValidation'

const emptySlot = () => ({ status: 'empty', value: '', unitId: null, error: null })

function setAt(arr, index, patch) {
  const next = arr.slice()
  next[index] = { ...next[index], ...patch }
  return next
}

function lockedIdsKey(slots) {
  return slots.filter((s) => s.status === 'locked').map((s) => s.unitId).join(',')
}

// One input slot per unit on a serialized line item, scan-driven: typing a
// serial and hitting Enter (exactly what a barcode scanner does) validates
// it against real inventory, locks it in on success, and auto-focuses the
// next empty slot — no click or tab needed between scans. Replaces the old
// manual checkbox-picker entirely.
//
// `line.unitIds` only ever holds *locked* units — this component keeps its
// own richer local state (empty/loading/locked/error per slot) and derives
// `unitIds` from it, rather than the other way around.
export default function SerialSlotGrid({
  line, product, availableUnits, stockAdjustment = 0, usedElsewhere,
  autoFocus, onChangeUnitIds, onGrowQuantity, onLineComplete, ref,
}) {
  const { validate } = useSerialSlotValidation()
  const qty = Math.max(0, Number(line.quantity) || 0)

  const [slots, setSlots] = useState(() => {
    const resolveSerial = (unitId) => availableUnits.forProduct(product.id).find((u) => u.id === unitId)?.serial_number || ''
    const built = line.unitIds.map((unitId) => ({ status: 'locked', value: resolveSerial(unitId), unitId, error: null }))
    while (built.length < qty) built.push(emptySlot())
    return built.slice(0, qty)
  })

  const slotInputRefs = useRef([])
  const requestSeqRef = useRef([])
  const pendingFocusIndexRef = useRef(null)

  // Reset/resize `slots` during render (React's documented pattern for
  // adjusting state in response to a prop change) rather than useEffect.
  // An effect here would apply the reset one commit *after* this render,
  // so the autoFocus effect below — which fires in the same commit a
  // product/qty change lands — could read `slots` before the reset took
  // effect, since effects run in declaration order within a commit but
  // don't see each other's setState calls synchronously.
  const [prevProductId, setPrevProductId] = useState(product?.id)
  const [prevQty, setPrevQty] = useState(qty)

  if (product?.id !== prevProductId) {
    // Product swapped on this line — old locked serials belong to a
    // different product entirely, full reset.
    setPrevProductId(product?.id)
    setPrevQty(qty)
    setSlots(Array.from({ length: qty }, emptySlot))
  } else if (qty !== prevQty) {
    setPrevQty(qty)
    // Resize densely. Growing appends empty slots; shrinking drops the
    // trailing ones (locked or not), same as the old checkbox grid's
    // truncate-only behavior.
    setSlots((prev) => {
      if (qty > prev.length) return [...prev, ...Array.from({ length: qty - prev.length }, emptySlot)]
      return prev.slice(0, qty)
    })
  }

  // Focusing a freshly-appended slot (from the "add another unit" button)
  // is a real DOM side effect, so it still belongs in an effect — just
  // decoupled from the array resize itself, which now happens above.
  useEffect(() => {
    if (pendingFocusIndexRef.current == null) return
    const i = pendingFocusIndexRef.current
    pendingFocusIndexRef.current = null
    requestAnimationFrame(() => slotInputRefs.current[i]?.focus())
  }, [qty])

  // Push the derived locked-id list up to the parent whenever it actually
  // changes (not on loading/error-only churn), and advance focus/complete
  // the line exactly when a NEW lock just happened (lockedCount grew) —
  // not when one was released via reopenSlot (lockedCount shrank), and
  // not on mount for a line hydrated already-complete from edit mode.
  // Deliberately an effect, not logic inside the setSlots updater above:
  // StrictMode double-invokes updater functions in dev, which would have
  // fired onLineComplete/focus twice.
  const lockedKey = lockedIdsKey(slots)
  const prevLockedCountRef = useRef(null)
  useEffect(() => {
    onChangeUnitIds(slots.filter((s) => s.status === 'locked').map((s) => s.unitId))

    const lockedCount = lockedKey === '' ? 0 : lockedKey.split(',').length
    if (prevLockedCountRef.current !== null && lockedCount > prevLockedCountRef.current) {
      const nextEmpty = slots.findIndex((s) => s.status === 'empty')
      if (nextEmpty !== -1) slotInputRefs.current[nextEmpty]?.focus()
      else onLineComplete()
    }
    prevLockedCountRef.current = lockedCount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedKey])

  const focusFirstEmptySlot = () => {
    const i = slots.findIndex((s) => s.status === 'empty')
    if (i !== -1) slotInputRefs.current[i]?.focus()
  }

  useImperativeHandle(ref, () => ({ focusFirstEmptySlot }))

  // Depends on `autoFocus` itself, not just mount — a line switching from
  // one serialized product to another stays mounted (SerialSlotGrid resets
  // its own slots internally rather than remounting), so a mount-only
  // effect would miss re-focusing on that transition.
  useEffect(() => {
    if (autoFocus) focusFirstEmptySlot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  const handleEnter = async (index, rawValue) => {
    const seq = (requestSeqRef.current[index] = (requestSeqRef.current[index] || 0) + 1)
    setSlots((prev) => setAt(prev, index, { status: 'loading', value: rawValue, error: null }))

    const trimmed = rawValue.trim()
    const dupeInLine = slots.some((s, i) => i !== index && s.status === 'locked' && s.value === trimmed)
    if (dupeInLine) {
      setSlots((prev) => setAt(prev, index, { status: 'error', value: rawValue, error: 'Already scanned in this line.' }))
      return
    }

    const result = await validate({ serial: rawValue, productId: product.id })
    if (requestSeqRef.current[index] !== seq) return

    if (!result.ok) {
      setSlots((prev) => setAt(prev, index, { status: 'error', value: rawValue, error: result.message }))
      return
    }
    if (usedElsewhere.has(result.unitId)) {
      setSlots((prev) => setAt(prev, index, { status: 'error', value: rawValue, error: 'Already added to another line on this sale.' }))
      return
    }

    setSlots((prev) => setAt(prev, index, { status: 'locked', value: trimmed, unitId: result.unitId, error: null }))
  }

  const reopenSlot = (index) => {
    setSlots((prev) => setAt(prev, index, emptySlot()))
    requestAnimationFrame(() => slotInputRefs.current[index]?.focus())
  }

  const available = (product.stock_quantity || 0) + stockAdjustment
  // Growing no longer waits on every current slot being filled first —
  // scanning/typing serials in here is optional, not a gate the sale has
  // to clear, so there's no reason a slot left empty should also block
  // adding room for more.
  const canGrow = qty < available
  const lockedCount = slots.filter((s) => s.status === 'locked').length

  return (
    <div className="mt-3 rounded-lg border border-clay-500/20 bg-clay-500/5 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-clay-600">
        <ScanLine size={12} /> Scan serial/IMEI (optional)
        <span className="ml-auto font-semibold">{lockedCount}/{qty} scanned</span>
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot, i) => {
          if (slot.status === 'locked') {
            return (
              <button
                key={i}
                type="button"
                onClick={() => reopenSlot(i)}
                className="flex items-center justify-between gap-1.5 rounded-lg border border-clay-500 bg-clay-500/10 px-2.5 py-1.5 text-left text-xs font-mono text-clay-700"
              >
                <span className="truncate">{slot.value}</span>
              </button>
            )
          }
          return (
            <div key={i}>
              <div className="relative">
                <input
                  ref={(el) => { slotInputRefs.current[i] = el }}
                  value={slot.value}
                  onChange={(e) => {
                    // Editing invalidates any validation still in flight
                    // for this slot from a previous Enter — otherwise a
                    // late response could land after the user's already
                    // typed something new and silently overwrite it.
                    requestSeqRef.current[i] = (requestSeqRef.current[i] || 0) + 1
                    const value = e.target.value
                    setSlots((prev) => setAt(prev, i, { status: 'empty', value, error: null }))
                    // A standard IMEI is exactly 15 characters — once
                    // that many are in, validate immediately rather than
                    // waiting for Enter, since some scanners don't send a
                    // trailing Enter and this is faster for manual typing
                    // too. Matched on length alone (not digits-only) so a
                    // stored serial with any non-numeric character still
                    // triggers correctly.
                    if (value.trim().length === 15) handleEnter(i, value)
                  }}
                  onKeyDown={(e) => {
                    // Barcode scanners are keyboard emulators — most send
                    // Enter as the terminator after the code, but some are
                    // configured to send Tab instead. Treat both the same
                    // way: validate now, and prevent Tab's default (moving
                    // focus natively) since our own focus-advance already
                    // takes over once the scan locks in.
                    if (e.key !== 'Enter' && e.key !== 'Tab') return
                    e.preventDefault()
                    // If the 15-char auto-trigger above already kicked off
                    // a validation for this exact value, don't fire a
                    // redundant second one.
                    if (slot.status === 'loading') return
                    if (slot.value.trim()) handleEnter(i, slot.value)
                  }}
                  placeholder={`Unit ${i + 1}`}
                  className={`w-full rounded-lg border bg-cream-50 px-2.5 py-1.5 pr-7 text-xs font-mono text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 ${
                    slot.status === 'error' ? 'border-red-500/40 bg-red-500/5 text-red-600' : 'border-ink-400/20'
                  }`}
                />
                {slot.status === 'loading' && (
                  <Loader2 size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-clay-500" />
                )}
              </div>
              {slot.status === 'error' && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-red-600">
                  <AlertCircle size={10} /> {slot.error}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {canGrow && (
        <button
          type="button"
          onClick={() => {
            pendingFocusIndexRef.current = qty
            onGrowQuantity(qty + 1)
          }}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-clay-600 hover:text-clay-700"
        >
          <Plus size={12} /> Add another unit
        </button>
      )}
    </div>
  )
}
