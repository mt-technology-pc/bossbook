import { useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Circle, Line as KonvaLine, Text as KonvaText, Image as KonvaImage, Transformer, Group } from 'react-konva'
import useImage from 'use-image'
import {
  RotateCcw, ScanLine, QrCode, Type, Image as ImageIcon, Square, Minus, Circle as CircleIcon,
} from 'lucide-react'
import BarcodeImageNode from './nodes/BarcodeImageNode'
import QrImageNode from './nodes/QrImageNode'
import { validateBarcode } from '../../lib/barcodeValidation'
import { fit } from '../../lib/labelPdf'

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)
const SNAP_PX = 5

let layerId = 0
const newId = () => `layer-${Date.now()}-${++layerId}`

const NEW_LAYER_DEFAULTS = {
  text: { w: 0.5, h: 0.18 },
  barcode: { w: 0.5, h: 0.35 },
  qr: { w: 0.32, h: 0.35 },
  image: { w: 0.3, h: 0.3 },
  shape: { w: 0.3, h: 0.2 },
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

function centerOf(el) {
  return { cx: el.x + el.w / 2, cy: el.y + el.h / 2 }
}

function fieldValue(el, sample) {
  if (el.field === 'name') return sample.name
  if (el.field === 'code') return sample.code
  if (el.field === 'price') return sample.price
  return el.text || ''
}

function ImageElementNode({ el, ...groupProps }) {
  const [img] = useImage(el.src || '')
  if (!img) return null
  const { width, height, ...rest } = groupProps
  const fitted = fit(el.naturalW || width, el.naturalH || height, width, height)
  return (
    <KonvaImage
      image={img}
      width={fitted.w}
      height={fitted.h}
      x={(width - fitted.w) / 2}
      y={(height - fitted.h) / 2}
      {...rest}
    />
  )
}

// Konva-based free-positioning label canvas: drag to move, drag a corner to
// resize, drag the rotate handle to rotate, shift-click to multi-select.
// Barcode/QR layers render live (via labelCodes.js's same helpers PDF
// export uses), not placeholder icons, so this is a true WYSIWYG preview.
export default function LabelCanvasEditor({
  labelWidth, labelHeight, elements, onChange, sample, undo, redo, canUndo, canRedo, stageRef: externalStageRef,
}) {
  const fileInputRef = useRef(null)
  const internalStageRef = useRef(null)
  const stageRef = externalStageRef || internalStageRef
  const transformerRef = useRef(null)
  const nodeRefs = useRef({})
  const [selectedIds, setSelectedIds] = useState([])
  const [guides, setGuides] = useState({ x: null, y: null })

  const scale = Math.min(7, 380 / Math.max(labelWidth, 1))
  const pxW = Math.max(labelWidth, 1) * scale
  const pxH = Math.max(labelHeight, 1) * scale

  useEffect(() => {
    const tr = transformerRef.current
    if (!tr) return
    const nodes = selectedIds.map((id) => nodeRefs.current[id]).filter(Boolean)
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds, elements])

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo?.()
        else undo?.()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo?.()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        onChange(elements.filter((el) => !selectedIds.includes(el.id)))
        setSelectedIds([])
        return
      }
      const nudge = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key]
      if (nudge && selectedIds.length > 0) {
        e.preventDefault()
        const step = (e.shiftKey ? 10 : 1) / scale
        const [dx, dy] = nudge
        onChange(elements.map((el) => (selectedIds.includes(el.id)
          ? { ...el, x: clamp(el.x + (dx * step) / pxW, 0, 1 - el.w), y: clamp(el.y + (dy * step) / pxH, 0, 1 - el.h) }
          : el)))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [elements, selectedIds, onChange, undo, redo, scale, pxW, pxH])

  const updateLayer = (id, patch) => {
    onChange(elements.map((el) => (el.id === id ? { ...el, ...patch } : el)))
  }

  const addLayer = (type, shapeKind) => {
    if (type === 'image') {
      fileInputRef.current?.click()
      return
    }
    const size = NEW_LAYER_DEFAULTS[type]
    const layer = {
      id: newId(),
      type,
      rotation: 0,
      x: clamp(0.5 - size.w / 2, 0, 1 - size.w),
      y: clamp(0.5 - size.h / 2, 0, 1 - size.h),
      ...size,
      ...(type === 'text' ? { field: null, text: 'Custom text', fontSize: 12, align: 'left', color: '#2c2a26' } : {}),
      ...(type === 'barcode' ? { format: 'CODE128', showText: false, textFontSize: 8 } : {}),
      ...(type === 'shape' ? { shapeKind, fill: '#f2ddc9', stroke: '#c8763a', strokeWidth: 2, radius: 4 } : {}),
    }
    onChange([...elements, layer])
    setSelectedIds([layer.id])
  }

  const onImagePicked = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { src, naturalW, naturalH } = await readImageFile(file)
    const size = NEW_LAYER_DEFAULTS.image
    const layer = {
      id: newId(), type: 'image', rotation: 0,
      x: clamp(0.5 - size.w / 2, 0, 1 - size.w), y: clamp(0.5 - size.h / 2, 0, 1 - size.h),
      ...size, src, naturalW, naturalH,
    }
    onChange([...elements, layer])
    setSelectedIds([layer.id])
  }

  const duplicateSelected = () => {
    const clones = elements
      .filter((el) => selectedIds.includes(el.id))
      .map((el) => ({ ...el, id: newId(), x: clamp(el.x + 0.03, 0, 1 - el.w), y: clamp(el.y + 0.03, 0, 1 - el.h) }))
    if (clones.length === 0) return
    onChange([...elements, ...clones])
    setSelectedIds(clones.map((c) => c.id))
  }

  const reorderSelected = (direction) => {
    if (selectedIds.length !== 1) return
    const id = selectedIds[0]
    const idx = elements.findIndex((el) => el.id === id)
    if (idx === -1) return
    const next = elements.filter((el) => el.id !== id)
    const el = elements[idx]
    if (direction === 'front') next.push(el)
    else next.unshift(el)
    onChange(next)
  }

  // Aligns relative to the selection's own bounding box when 2+ elements
  // are selected (align to each other), or relative to the whole label
  // (0–1) when exactly 1 is selected (a quick "center on label" shortcut).
  const alignSelected = (edge) => {
    if (selectedIds.length === 0) return
    const sel = elements.filter((el) => selectedIds.includes(el.id))
    const bounds = selectedIds.length > 1
      ? {
          minX: Math.min(...sel.map((el) => el.x)),
          maxX: Math.max(...sel.map((el) => el.x + el.w)),
          minY: Math.min(...sel.map((el) => el.y)),
          maxY: Math.max(...sel.map((el) => el.y + el.h)),
        }
      : { minX: 0, maxX: 1, minY: 0, maxY: 1 }

    onChange(elements.map((el) => {
      if (!selectedIds.includes(el.id)) return el
      if (edge === 'left') return { ...el, x: bounds.minX }
      if (edge === 'right') return { ...el, x: bounds.maxX - el.w }
      if (edge === 'center-h') return { ...el, x: bounds.minX + (bounds.maxX - bounds.minX) / 2 - el.w / 2 }
      if (edge === 'top') return { ...el, y: bounds.minY }
      if (edge === 'bottom') return { ...el, y: bounds.maxY - el.h }
      if (edge === 'center-v') return { ...el, y: bounds.minY + (bounds.maxY - bounds.minY) / 2 - el.h / 2 }
      return el
    }))
  }

  // Evenly spaces the elements between the first and last (by position) —
  // needs 3+ selected, since with only 2 there's nothing to distribute.
  const distributeSelected = (axis) => {
    if (selectedIds.length < 3) return
    const sel = elements.filter((el) => selectedIds.includes(el.id))
    const sorted = [...sel].sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y))
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const span = axis === 'h' ? last.x - first.x : last.y - first.y
    const gap = span / (sorted.length - 1)
    const patches = new Map()
    sorted.forEach((el, i) => {
      if (i === 0 || i === sorted.length - 1) return
      patches.set(el.id, axis === 'h' ? { x: first.x + gap * i } : { y: first.y + gap * i })
    })
    onChange(elements.map((el) => (patches.has(el.id) ? { ...el, ...patches.get(el.id) } : el)))
  }

  // Snap threshold converted from screen px to fractional units, checked
  // against every other element's edges/centers plus the label's own
  // edges/center — standard "smart guides" pattern.
  const snapCandidates = (excludeId) => {
    const xs = [0, 0.5, 1]
    const ys = [0, 0.5, 1]
    elements.forEach((el) => {
      if (el.id === excludeId) return
      const { cx, cy } = centerOf(el)
      xs.push(el.x, cx, el.x + el.w)
      ys.push(el.y, cy, el.y + el.h)
    })
    return { xs, ys }
  }

  const handleDragMove = (id) => (e) => {
    const node = e.target
    const el = elements.find((l) => l.id === id)
    if (!el) return
    const w = el.w * pxW
    const h = el.h * pxH
    const { xs, ys } = snapCandidates(id)
    const nodeXs = [node.x(), node.x() + w / 2, node.x() + w]
    const nodeYs = [node.y(), node.y() + h / 2, node.y() + h]

    let snapX = null
    let snapY = null
    for (const cand of xs) {
      const candPx = cand * pxW
      for (let i = 0; i < nodeXs.length; i += 1) {
        if (Math.abs(nodeXs[i] - candPx) < SNAP_PX) {
          node.x(node.x() + (candPx - nodeXs[i]))
          snapX = candPx
          break
        }
      }
      if (snapX !== null) break
    }
    for (const cand of ys) {
      const candPx = cand * pxH
      for (let i = 0; i < nodeYs.length; i += 1) {
        if (Math.abs(nodeYs[i] - candPx) < SNAP_PX) {
          node.y(node.y() + (candPx - nodeYs[i]))
          snapY = candPx
          break
        }
      }
      if (snapY !== null) break
    }
    setGuides({ x: snapX, y: snapY })
  }

  const handleDragEnd = (id) => (e) => {
    setGuides({ x: null, y: null })
    const node = e.target
    const el = elements.find((l) => l.id === id)
    if (!el) return
    const newX = clamp(node.x() / pxW, 0, 1 - el.w)
    const newY = clamp(node.y() / pxH, 0, 1 - el.h)
    const dx = newX - el.x
    const dy = newY - el.y

    // Move every other selected element by the same delta, so a
    // multi-selection drags together even though Konva only fires this
    // event on the node the user actually grabbed.
    if (selectedIds.includes(id) && selectedIds.length > 1) {
      onChange(elements.map((l) => (selectedIds.includes(l.id)
        ? { ...l, x: clamp(l.x + dx, 0, 1 - l.w), y: clamp(l.y + dy, 0, 1 - l.h) }
        : l)))
    } else {
      updateLayer(id, { x: newX, y: newY })
    }
  }

  const handleTransformEnd = (id) => (e) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    updateLayer(id, {
      x: clamp(node.x() / pxW, 0, 0.98),
      y: clamp(node.y() / pxH, 0, 0.98),
      w: clamp((node.width() * scaleX) / pxW, 0.03, 1),
      h: clamp((node.height() * scaleY) / pxH, 0.03, 1),
      rotation: node.rotation(),
    })
  }

  const selectNode = (id, e) => {
    const additive = e?.evt?.shiftKey
    setSelectedIds((prev) => {
      if (additive) return prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
      return [id]
    })
  }

  const selected = selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : null

  const registerRef = (id) => (node) => {
    if (node) nodeRefs.current[id] = node
    else delete nodeRefs.current[id]
  }

  const commonProps = (el) => ({
    ref: registerRef(el.id),
    x: el.x * pxW,
    y: el.y * pxH,
    width: el.w * pxW,
    height: el.h * pxH,
    rotation: el.rotation || 0,
    draggable: true,
    onClick: (e) => selectNode(el.id, e),
    onTap: (e) => selectNode(el.id, e),
    onDragMove: handleDragMove(el.id),
    onDragEnd: handleDragEnd(el.id),
    onTransformEnd: handleTransformEnd(el.id),
  })

  const toolButtons = useMemo(() => ([
    { key: 'text', icon: Type, label: 'Text', onClick: () => addLayer('text') },
    { key: 'barcode', icon: ScanLine, label: 'Barcode', onClick: () => addLayer('barcode') },
    { key: 'qr', icon: QrCode, label: 'QR', onClick: () => addLayer('qr') },
    { key: 'rect', icon: Square, label: 'Rect', onClick: () => addLayer('shape', 'rect') },
    { key: 'line', icon: Minus, label: 'Line', onClick: () => addLayer('shape', 'line') },
    { key: 'circle', icon: CircleIcon, label: 'Circle', onClick: () => addLayer('shape', 'circle') },
    { key: 'image', icon: ImageIcon, label: 'Image', onClick: () => addLayer('image') },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [elements])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {toolButtons.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={t.onClick}
              className="flex items-center gap-1 rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600"
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={!canUndo} onClick={undo} className="rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600 disabled:opacity-30">
            Undo
          </button>
          <button type="button" disabled={!canRedo} onClick={redo} className="rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600 disabled:opacity-30">
            Redo
          </button>
          <button
            type="button"
            onClick={() => { onChange([]); setSelectedIds([]) }}
            className="flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-clay-600"
          >
            <RotateCcw size={12} /> Clear
          </button>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" onChange={onImagePicked} className="hidden" />

      <div className="mt-3 overflow-hidden rounded-lg border border-dashed border-ink-400/30 bg-white" style={{ width: pxW, height: pxH }}>
        <Stage
          ref={stageRef}
          width={pxW}
          height={pxH}
          onMouseDown={(e) => { if (e.target === e.target.getStage()) setSelectedIds([]) }}
        >
          <Layer>
            {elements.map((el) => {
              const isSelected = selectedIds.includes(el.id)
              const stroke = isSelected ? '#0047ab' : 'rgba(138,132,120,0.5)'
              const strokeWidth = isSelected ? 1.5 : 1
              const dash = isSelected ? undefined : [3, 3]

              if (el.type === 'text') {
                const content = fieldValue(el, sample) || 'Custom text'
                return (
                  <Group key={el.id} {...commonProps(el)}>
                    <Rect width={el.w * pxW} height={el.h * pxH} fill={el.background || 'transparent'} stroke={stroke} strokeWidth={strokeWidth} dash={dash} />
                    <KonvaText
                      width={el.w * pxW}
                      height={el.h * pxH}
                      text={content}
                      fontSize={el.fontSize || 12}
                      fontFamily={el.fontFamily || 'Segoe UI, Arial, sans-serif'}
                      fontStyle={[el.bold ? 'bold' : '', el.italic ? 'italic' : ''].filter(Boolean).join(' ') || 'normal'}
                      textDecoration={el.underline ? 'underline' : ''}
                      fill={el.color || '#2c2a26'}
                      align={el.align || 'left'}
                      letterSpacing={el.letterSpacing || 0}
                      verticalAlign="middle"
                      padding={2}
                      listening={false}
                    />
                  </Group>
                )
              }

              if (el.type === 'barcode') {
                return (
                  <Group key={el.id} {...commonProps(el)}>
                    <BarcodeImageNode value={el.field ? fieldValue(el, sample) : sample.code} format={el.format} showText={el.showText} textFontSize={el.textFontSize} width={el.w * pxW} height={el.h * pxH} listening={false} />
                    <Rect width={el.w * pxW} height={el.h * pxH} stroke={stroke} strokeWidth={strokeWidth} dash={dash} />
                  </Group>
                )
              }

              if (el.type === 'qr') {
                return (
                  <Group key={el.id} {...commonProps(el)}>
                    <QrImageNode value={`${sample.name} | ${sample.code}`} width={el.w * pxW} height={el.h * pxH} listening={false} />
                    <Rect width={el.w * pxW} height={el.h * pxH} stroke={stroke} strokeWidth={strokeWidth} dash={dash} />
                  </Group>
                )
              }

              if (el.type === 'image') {
                return (
                  <Group key={el.id} {...commonProps(el)}>
                    <ImageElementNode el={el} width={el.w * pxW} height={el.h * pxH} listening={false} />
                    <Rect width={el.w * pxW} height={el.h * pxH} stroke={stroke} strokeWidth={strokeWidth} dash={dash} />
                  </Group>
                )
              }

              if (el.type === 'shape') {
                const w = el.w * pxW
                const h = el.h * pxH
                return (
                  <Group key={el.id} {...commonProps(el)}>
                    {el.shapeKind === 'rect' && (
                      <Rect width={w} height={h} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 1} cornerRadius={el.radius || 0} />
                    )}
                    {el.shapeKind === 'circle' && (
                      <Circle x={w / 2} y={h / 2} radius={Math.min(w, h) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth || 1} />
                    )}
                    {el.shapeKind === 'line' && (
                      <KonvaLine points={[0, h / 2, w, h / 2]} stroke={el.stroke || el.fill} strokeWidth={el.strokeWidth || 2} />
                    )}
                    {isSelected && <Rect width={w} height={h} stroke="#0047ab" strokeWidth={1} dash={[3, 3]} />}
                  </Group>
                )
              }

              return null
            })}

            {guides.x !== null && <KonvaLine points={[guides.x, 0, guides.x, pxH]} stroke="#0047ab" strokeWidth={1} dash={[4, 4]} listening={false} />}
            {guides.y !== null && <KonvaLine points={[0, guides.y, pxW, guides.y]} stroke="#0047ab" strokeWidth={1} dash={[4, 4]} listening={false} />}

            <Transformer ref={transformerRef} rotateEnabled anchorSize={7} borderStroke="#0047ab" anchorStroke="#0047ab" anchorFill="#fff" />
          </Layer>
        </Stage>
      </div>

      {(selected || selectedIds.length > 1) && (
        <div className="mt-3 rounded-xl border border-ink-400/15 bg-cream-100 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-700">
              {selectedIds.length > 1 ? `${selectedIds.length} selected` : selected.type === 'text' ? 'Text' : selected.type === 'barcode' ? 'Barcode' : selected.type === 'qr' ? 'QR code' : selected.type === 'shape' ? 'Shape' : 'Image'}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={duplicateSelected} className="text-xs font-medium text-ink-400 hover:text-clay-600">Duplicate</button>
              {selectedIds.length === 1 && (
                <>
                  <button type="button" onClick={() => reorderSelected('front')} className="text-xs font-medium text-ink-400 hover:text-clay-600">To front</button>
                  <button type="button" onClick={() => reorderSelected('back')} className="text-xs font-medium text-ink-400 hover:text-clay-600">To back</button>
                </>
              )}
              <button
                type="button"
                onClick={() => { onChange(elements.filter((el) => !selectedIds.includes(el.id))); setSelectedIds([]) }}
                className="text-xs font-medium text-ink-400 hover:text-red-500"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-ink-400/10 pt-2">
            <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">Align</span>
            <button type="button" onClick={() => alignSelected('left')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Left</button>
            <button type="button" onClick={() => alignSelected('center-h')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Center</button>
            <button type="button" onClick={() => alignSelected('right')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Right</button>
            <button type="button" onClick={() => alignSelected('top')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Top</button>
            <button type="button" onClick={() => alignSelected('center-v')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Middle</button>
            <button type="button" onClick={() => alignSelected('bottom')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Bottom</button>
            {selectedIds.length >= 3 && (
              <>
                <span className="ml-2 mr-1 text-[10px] font-medium uppercase tracking-wide text-ink-400">Distribute</span>
                <button type="button" onClick={() => distributeSelected('h')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Horiz.</button>
                <button type="button" onClick={() => distributeSelected('v')} className="rounded-lg border border-ink-400/20 px-2 py-1 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600">Vert.</button>
              </>
            )}
          </div>

          {selected?.type === 'text' && (
            <div className="mt-2 space-y-2">
              <select
                value={selected.field || 'custom'}
                onChange={(e) => { const v = e.target.value; updateLayer(selected.id, { field: v === 'custom' ? null : v }) }}
                className="w-full rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 outline-none focus:border-clay-500"
              >
                <option value="name">Product name</option>
                <option value="code">Product number</option>
                <option value="price">Price</option>
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
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => updateLayer(selected.id, { bold: !selected.bold })} className={`rounded-lg border px-2 py-1 text-xs font-bold ${selected.bold ? 'border-clay-500 bg-clay-500/10 text-clay-600' : 'border-ink-400/20 text-ink-600'}`}>B</button>
                <button type="button" onClick={() => updateLayer(selected.id, { italic: !selected.italic })} className={`rounded-lg border px-2 py-1 text-xs italic ${selected.italic ? 'border-clay-500 bg-clay-500/10 text-clay-600' : 'border-ink-400/20 text-ink-600'}`}>I</button>
                <button type="button" onClick={() => updateLayer(selected.id, { underline: !selected.underline })} className={`rounded-lg border px-2 py-1 text-xs underline ${selected.underline ? 'border-clay-500 bg-clay-500/10 text-clay-600' : 'border-ink-400/20 text-ink-600'}`}>U</button>
                <select value={selected.align || 'left'} onChange={(e) => updateLayer(selected.id, { align: e.target.value })} className="rounded-lg border border-ink-400/20 bg-cream-50 px-2 py-1 text-xs text-ink-900 outline-none focus:border-clay-500">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
                <input type="number" min="5" max="72" value={selected.fontSize || 12} onChange={(e) => updateLayer(selected.id, { fontSize: Number(e.target.value) })} className="w-16 rounded-lg border border-ink-400/20 bg-cream-50 px-2 py-1 text-xs text-ink-900 outline-none focus:border-clay-500" />
                <input type="color" value={selected.color || '#2c2a26'} onChange={(e) => updateLayer(selected.id, { color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-ink-400/20 bg-transparent p-0.5" />
              </div>
            </div>
          )}

          {selected?.type === 'barcode' && (() => {
            const barcodeValue = selected.field ? fieldValue(selected, sample) : sample.code
            const barcodeError = validateBarcode(selected.format || 'CODE128', barcodeValue)
            return (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={selected.format || 'CODE128'}
                    onChange={(e) => updateLayer(selected.id, { format: e.target.value })}
                    className="rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 outline-none focus:border-clay-500"
                  >
                    <option value="CODE128">Code 128</option>
                    <option value="EAN13">EAN-13</option>
                    <option value="UPC">UPC-A</option>
                  </select>
                  <select
                    value={selected.field || 'code'}
                    onChange={(e) => updateLayer(selected.id, { field: e.target.value })}
                    className="rounded-lg border border-ink-400/20 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-900 outline-none focus:border-clay-500"
                  >
                    <option value="code">Product number</option>
                    <option value="name">Product name</option>
                    <option value="price">Price</option>
                  </select>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-ink-600">
                  <input type="checkbox" checked={!!selected.showText} onChange={(e) => updateLayer(selected.id, { showText: e.target.checked })} className="h-3.5 w-3.5 rounded border-ink-400/30 text-clay-500 focus:ring-clay-500" />
                  Show human-readable text
                </label>
                {barcodeError ? (
                  <p className="text-xs text-red-500">{barcodeError} (using "{barcodeValue}")</p>
                ) : (
                  <p className="text-xs text-ink-400">Encodes each label's bound field automatically.</p>
                )}
              </div>
            )
          })()}
          {selected?.type === 'qr' && (
            <p className="mt-2 text-xs text-ink-400">Encodes each label's product name and number automatically.</p>
          )}
          {selected?.type === 'image' && (
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-ink-400/20 px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-clay-500 hover:text-clay-600">
              <ImageIcon size={13} /> Replace image
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                const { src, naturalW, naturalH } = await readImageFile(file)
                updateLayer(selected.id, { src, naturalW, naturalH })
              }}
              />
            </label>
          )}
          {selected?.type === 'shape' && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-ink-600">
                Fill <input type="color" value={selected.fill || '#f2ddc9'} onChange={(e) => updateLayer(selected.id, { fill: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-ink-400/20 bg-transparent p-0.5" />
              </label>
              <label className="flex items-center gap-1 text-xs text-ink-600">
                Border <input type="color" value={selected.stroke || '#c8763a'} onChange={(e) => updateLayer(selected.id, { stroke: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-ink-400/20 bg-transparent p-0.5" />
              </label>
              {selected.shapeKind === 'rect' && (
                <label className="flex items-center gap-1 text-xs text-ink-600">
                  Radius <input type="number" min="0" max="40" value={selected.radius || 0} onChange={(e) => updateLayer(selected.id, { radius: Number(e.target.value) })} className="w-14 rounded-lg border border-ink-400/20 bg-cream-50 px-2 py-1 text-xs text-ink-900 outline-none focus:border-clay-500" />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
