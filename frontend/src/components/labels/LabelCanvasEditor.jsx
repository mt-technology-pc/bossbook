import { useRef, useState } from 'react'
import { RotateCcw, ScanLine, QrCode, Type, Image as ImageIcon, Trash2 } from 'lucide-react'

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

let layerId = 0
const newId = () => `layer-${Date.now()}-${++layerId}`

const NEW_LAYER_DEFAULTS = {
  text: { w: 0.5, h: 0.18 },
  barcode: { w: 0.5, h: 0.35 },
  qr: { w: 0.32, h: 0.35 },
  image: { w: 0.3, h: 0.3 },
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result
      const img = new window.Image()
      img.onload = () => resolve({ src, naturalW: img.naturalWidth, naturalH: img.naturalHeight })
      img.onerror = reject
      img.src = src
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// A free-positioning label canvas, closer to a lightweight design tool than
// a form: add text/barcode/QR/image layers from the toolbar, drag a layer to
// move it, drag its corner handle to resize it, click it to edit details.
export default function LabelCanvasEditor({ labelWidth, labelHeight, elements, onChange, sample }) {
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [selectedId, setSelectedId] = useState(null)

  const scale = Math.min(7, 380 / Math.max(labelWidth, 1))
  const pxW = Math.max(labelWidth, 1) * scale
  const pxH = Math.max(labelHeight, 1) * scale

  const updateLayer = (id, patch) => {
    onChange(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)))
  }
  const removeLayer = (id) => {
    onChange(elements.filter((el) => el.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const addLayer = (type) => {
    if (type === 'image') {
      fileInputRef.current?.click()
      return
    }
    const size = NEW_LAYER_DEFAULTS[type]
    const layer = {
      id: newId(),
      type,
      x: clamp(0.5 - size.w / 2, 0, 1 - size.w),
      y: clamp(0.5 - size.h / 2, 0, 1 - size.h),
      ...size,
      ...(type === 'text' ? { field: null, text: 'Custom text' } : {}),
    }
    onChange([...elements, layer])
    setSelectedId(layer.id)
  }

  const onImagePicked = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { src, naturalW, naturalH } = await readImageFile(file)
    const size = NEW_LAYER_DEFAULTS.image
    const layer = {
      id: newId(),
      type: 'image',
      x: clamp(0.5 - size.w / 2, 0, 1 - size.w),
      y: clamp(0.5 - size.h / 2, 0, 1 - size.h),
      ...size,
      src,
      naturalW,
      naturalH,
    }
    onChange([...elements, layer])
    setSelectedId(layer.id)
  }

  const replaceImage = async (e, id) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { src, naturalW, naturalH } = await readImageFile(file)
    updateLayer(id, { src, naturalW, naturalH })
  }

  const dragLayer = (id, mode) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedId(id)
    const start = elements.find((el) => el.id === id)
    if (!start) return
    const startX = e.clientX
    const startY = e.clientY

    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / pxW
      const dy = (ev.clientY - startY) / pxH
      if (mode === 'move') {
        updateLayer(id, {
          x: clamp(start.x + dx, 0, 1 - start.w),
          y: clamp(start.y + dy, 0, 1 - start.h),
        })
      } else {
        updateLayer(id, {
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

  const selected = elements.find((el) => el.id === selectedId) || null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => addLayer('text')} className="flex items-center gap-1 rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600">
            <Type size={13} /> Text
          </button>
          <button type="button" onClick={() => addLayer('barcode')} className="flex items-center gap-1 rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600">
            <ScanLine size={13} /> Barcode
          </button>
          <button type="button" onClick={() => addLayer('qr')} className="flex items-center gap-1 rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600">
            <QrCode size={13} /> QR
          </button>
          <button type="button" onClick={() => addLayer('image')} className="flex items-center gap-1 rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600">
            <ImageIcon size={13} /> Image
          </button>
        </div>
        <button
          type="button"
          onClick={() => { onChange([]); setSelectedId(null) }}
          className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-clay-600"
        >
          <RotateCcw size={12} /> Clear
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onImagePicked} className="hidden" />

      <div
        ref={canvasRef}
        onMouseDown={() => setSelectedId(null)}
        className="relative mt-3 select-none rounded-lg border border-dashed border-ink-400/30 bg-white"
        style={{ width: pxW, height: pxH }}
      >
        {elements.length === 0 && (
          <p className="flex h-full items-center justify-center px-3 text-center text-xs text-ink-400">
            Add text, a barcode, a QR code, or an image to design this label
          </p>
        )}
        {elements.map((el) => (
          <div
            key={el.id}
            onMouseDown={dragLayer(el.id, 'move')}
            className={`group absolute flex cursor-move items-center justify-center overflow-hidden rounded border bg-clay-500/10 hover:bg-clay-500/15 ${
              selectedId === el.id ? 'border-clay-600 ring-2 ring-clay-500/30' : 'border-clay-500/50'
            }`}
            style={{ left: el.x * pxW, top: el.y * pxH, width: el.w * pxW, height: el.h * pxH }}
          >
            {el.type === 'text' && (
              <span className="pointer-events-none truncate px-2 text-[10px] font-semibold text-ink-900">
                {el.field === 'name' ? sample.name : el.field === 'code' ? sample.code : (el.text || 'Custom text')}
              </span>
            )}
            {el.type === 'barcode' && <ScanLine size={16} className="pointer-events-none text-ink-500" />}
            {el.type === 'qr' && <QrCode size={16} className="pointer-events-none text-ink-500" />}
            {el.type === 'image' && el.src && (
              <img src={el.src} alt="" className="pointer-events-none h-full w-full object-contain" />
            )}

            <div
              onMouseDown={dragLayer(el.id, 'resize')}
              className="absolute bottom-0 right-0 h-2.5 w-2.5 cursor-se-resize rounded-tl bg-clay-500"
            />
          </div>
        ))}
      </div>

      {selected && (
        <div className="mt-3 rounded-xl border border-ink-400/15 bg-cream-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-700">
              {selected.type === 'text' ? 'Text' : selected.type === 'barcode' ? 'Barcode' : selected.type === 'qr' ? 'QR code' : 'Image'}
            </span>
            <button
              type="button"
              onClick={() => removeLayer(selected.id)}
              className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-red-500"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>

          {selected.type === 'text' && (
            <div className="mt-2 space-y-2">
              <select
                value={selected.field || 'custom'}
                onChange={(e) => {
                  const v = e.target.value
                  updateLayer(selected.id, { field: v === 'custom' ? null : v })
                }}
                className="w-full rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 outline-none focus:border-clay-500"
              >
                <option value="name">Product name</option>
                <option value="code">Product number</option>
                <option value="custom">Custom text</option>
              </select>
              {!selected.field && (
                <input
                  value={selected.text || ''}
                  onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                  placeholder="Text to print on every label"
                  className="w-full rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 outline-none focus:border-clay-500"
                />
              )}
            </div>
          )}

          {selected.type === 'barcode' && (
            <p className="mt-2 text-xs text-ink-400">Encodes each label's product number automatically.</p>
          )}
          {selected.type === 'qr' && (
            <p className="mt-2 text-xs text-ink-400">Encodes each label's product name and number automatically.</p>
          )}
          {selected.type === 'image' && (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600">
              <ImageIcon size={13} /> Replace image
              <input type="file" accept="image/*" className="hidden" onChange={(e) => replaceImage(e, selected.id)} />
            </label>
          )}
        </div>
      )}
    </div>
  )
}
