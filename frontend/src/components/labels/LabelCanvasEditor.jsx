import { useRef } from 'react'
import { RotateCcw, ScanLine, QrCode } from 'lucide-react'

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

const ELEMENT_META = {
  name: { label: 'Name' },
  code: { label: 'Number' },
  barcode: { label: 'Barcode' },
  qr: { label: 'QR' },
}

// A free-positioning canvas, like a stripped-down design tool: drag a box to
// move it, drag its corner handle to resize it. Coordinates are stored as
// fractions (0–1) of the label's width/height so a layout stays valid across
// label sizes rather than being pinned to one physical size in mm.
export default function LabelCanvasEditor({ labelWidth, labelHeight, elements, visible, onChange, onReset, sample }) {
  const canvasRef = useRef(null)

  const scale = Math.min(7, 380 / Math.max(labelWidth, 1))
  const pxW = Math.max(labelWidth, 1) * scale
  const pxH = Math.max(labelHeight, 1) * scale

  const dragBox = (key, mode) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    const start = elements[key] || { x: 0, y: 0, w: 0.3, h: 0.2 }
    const startX = e.clientX
    const startY = e.clientY

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / pxW
      const dy = (ev.clientY - startY) / pxH
      if (mode === 'move') {
        onChange(key, {
          ...start,
          x: clamp(start.x + dx, 0, 1 - start.w),
          y: clamp(start.y + dy, 0, 1 - start.h),
        })
      } else {
        onChange(key, {
          ...start,
          w: clamp(start.w + dx, 0.06, 1 - start.x),
          h: clamp(start.h + dy, 0.06, 1 - start.y),
        })
      }
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const activeKeys = Object.keys(ELEMENT_META).filter((k) => visible[k])

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500">Drag to move, corner handle to resize</span>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-clay-600"
        >
          <RotateCcw size={12} /> Reset layout
        </button>
      </div>

      <div
        ref={canvasRef}
        className="relative mt-2 select-none rounded-lg border border-dashed border-ink-400/30 bg-white"
        style={{ width: pxW, height: pxH }}
      >
        {activeKeys.length === 0 && (
          <p className="flex h-full items-center justify-center px-3 text-center text-xs text-ink-400">
            Turn on an element above to place it on the label
          </p>
        )}
        {activeKeys.map((key) => {
          const el = elements[key]
          if (!el) return null
          return (
            <div
              key={key}
              onMouseDown={dragBox(key, 'move')}
              className="group absolute flex cursor-move items-center justify-center overflow-hidden rounded border border-clay-500/50 bg-clay-500/10 hover:bg-clay-500/15"
              style={{
                left: el.x * pxW,
                top: el.y * pxH,
                width: el.w * pxW,
                height: el.h * pxH,
              }}
            >
              <span className="pointer-events-none absolute left-0.5 top-0.5 rounded bg-clay-600/90 px-1 text-[8px] font-medium leading-tight text-cream-50">
                {ELEMENT_META[key].label}
              </span>

              {key === 'name' && (
                <span className="pointer-events-none truncate px-2 text-[10px] font-semibold text-ink-900">
                  {sample.name}
                </span>
              )}
              {key === 'code' && (
                <span className="pointer-events-none truncate px-2 font-mono text-[9px] text-ink-600">
                  {sample.code}
                </span>
              )}
              {key === 'barcode' && <ScanLine size={16} className="pointer-events-none text-ink-500" />}
              {key === 'qr' && <QrCode size={16} className="pointer-events-none text-ink-500" />}

              <div
                onMouseDown={dragBox(key, 'resize')}
                className="absolute bottom-0 right-0 h-2.5 w-2.5 cursor-se-resize rounded-tl bg-clay-500"
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
