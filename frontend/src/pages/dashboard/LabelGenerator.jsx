import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Plus, Trash2, Tag, Download, Printer, AlertCircle, Save, FolderOpen,
} from 'lucide-react'
import { useProducts } from '../../hooks/useProducts'
import { useLabelDesigns } from '../../hooks/useLabelDesigns'
import { buildLabelsPdf, expandInstances, computeA4Grid, THERMAL_PRESETS, DEFAULT_ELEMENTS } from '../../lib/labelPdf'
import Button from '../../components/ui/Button'
import SearchSelect from '../../components/ui/SearchSelect'
import LabelCanvasEditor from '../../components/labels/LabelCanvasEditor'

let localId = 0

const TOGGLES = [
  { key: 'showName', label: 'Product name' },
  { key: 'showCode', label: 'Product number' },
  { key: 'showBarcode', label: 'Barcode' },
  { key: 'showQr', label: 'QR code' },
  { key: 'showBorder', label: 'Border' },
]

export default function LabelGenerator() {
  const navigate = useNavigate()
  const { products } = useProducts()

  const [items, setItems] = useState([])
  const [productPick, setProductPick] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualCode, setManualCode] = useState('')

  const [mode, setMode] = useState('thermal')
  const [thermalPreset, setThermalPreset] = useState('50x20')
  const [customWidth, setCustomWidth] = useState('50')
  const [customHeight, setCustomHeight] = useState('20')

  const [toggles, setToggles] = useState({
    showName: true, showCode: true, showBarcode: true, showQr: true, showBorder: true,
  })
  const [elements, setElements] = useState(DEFAULT_ELEMENTS)

  const { designs, saveDesign, deleteDesign } = useLabelDesigns()
  const [designName, setDesignName] = useState('')
  const [savingDesign, setSavingDesign] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const productOptions = products.map((p) => ({
    id: p.id,
    label: p.name,
    sublabel: p.sku || 'No product number',
  }))

  const preset = THERMAL_PRESETS.find((p) => p.value === thermalPreset)
  const labelWidth = thermalPreset === 'custom' ? Number(customWidth) || 0 : preset.width
  const labelHeight = thermalPreset === 'custom' ? Number(customHeight) || 0 : preset.height

  const applyDesign = (design) => {
    setMode(design.mode)
    setThermalPreset('custom')
    setCustomWidth(String(design.label_width))
    setCustomHeight(String(design.label_height))
    setToggles({
      showBarcode: design.show_barcode,
      showQr: design.show_qr,
      showName: design.show_name,
      showCode: design.show_code,
      showBorder: design.show_border,
    })
    setElements({ ...DEFAULT_ELEMENTS, ...(design.elements || {}) })
  }

  const updateElement = (key, rect) => setElements((prev) => ({ ...prev, [key]: rect }))
  const resetLayout = () => setElements(DEFAULT_ELEMENTS)

  const handleSaveDesign = async () => {
    const trimmed = designName.trim()
    if (!trimmed) {
      setError('Enter a name for this design first.')
      return
    }
    if (!labelWidth || !labelHeight) {
      setError('Enter a valid label width and height before saving a design.')
      return
    }
    setSavingDesign(true)
    setError(null)
    const { error: saveError } = await saveDesign({
      name: trimmed,
      mode,
      label_width: labelWidth,
      label_height: labelHeight,
      show_barcode: toggles.showBarcode,
      show_qr: toggles.showQr,
      show_name: toggles.showName,
      show_code: toggles.showCode,
      show_border: toggles.showBorder,
      elements,
    })
    setSavingDesign(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    setDesignName('')
  }

  const handleDeleteDesign = async (e, id) => {
    e.stopPropagation()
    await deleteDesign(id)
  }

  const addItem = (name, code) => {
    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    if (!trimmedName || !trimmedCode) {
      setError('Enter both a product name and a product number.')
      return
    }
    setError(null)
    setItems((prev) => {
      const existing = prev.find((it) => it.code === trimmedCode)
      if (existing) {
        return prev.map((it) => (it.code === trimmedCode ? { ...it, quantity: it.quantity + 1 } : it))
      }
      return [...prev, { id: `label-${++localId}`, name: trimmedName, code: trimmedCode, quantity: 1 }]
    })
  }

  const handleAddFromCatalog = () => {
    const product = products.find((p) => p.id === productPick)
    if (!product) {
      setError('Select a product first.')
      return
    }
    if (!product.sku) {
      setError(`${product.name} has no product number/SKU set — add one in Inventory first.`)
      return
    }
    addItem(product.name, product.sku)
    setProductPick('')
  }

  const handleAddManual = () => {
    addItem(manualName, manualCode)
    if (!error) {
      setManualName('')
      setManualCode('')
    }
  }

  const updateQuantity = (id, quantity) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, quantity: Math.max(1, Number(quantity) || 1) } : it)))
  }

  const removeItem = (id) => setItems((prev) => prev.filter((it) => it.id !== id))

  const totalLabels = items.reduce((sum, it) => sum + it.quantity, 0)
  const grid = mode === 'a4' && labelWidth > 0 && labelHeight > 0 ? computeA4Grid(labelWidth, labelHeight) : null

  const generate = async (action) => {
    setError(null)

    if (items.length === 0) {
      setError('Add at least one product to print.')
      return
    }
    if (!labelWidth || !labelHeight || labelWidth <= 0 || labelHeight <= 0) {
      setError('Enter a valid label width and height.')
      return
    }
    if (!toggles.showBarcode && !toggles.showQr && !toggles.showName && !toggles.showCode) {
      setError('Turn on at least one thing to show on the label.')
      return
    }

    setGenerating(true)
    try {
      const doc = await buildLabelsPdf(items, {
        mode, labelWidth, labelHeight, ...toggles, elements,
      })
      if (action === 'download') {
        doc.save(`labels-${new Date().toISOString().slice(0, 10)}.pdf`)
      } else {
        const url = doc.output('bloburl')
        window.open(url, '_blank')
      }
    } catch (err) {
      setError(err.message || 'Could not generate the PDF.')
    } finally {
      setGenerating(false)
    }
  }

  const previewCount = useMemo(() => expandInstances(items).length, [items])

  return (
    <div>
      <button
        onClick={() => navigate('/dashboard/inventory')}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
      >
        <ArrowLeft size={15} /> Inventory
      </button>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">
            Barcode / QR Label Printing
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Add products, pick a layout, and print or download a PDF sized to your labels.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Left: add products + batch list */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
            <h2 className="font-heading text-base font-semibold text-ink-900">Add from inventory</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <SearchSelect
                  value={productPick}
                  onChange={setProductPick}
                  options={productOptions}
                  placeholder="Search a product…"
                />
              </div>
              <Button variant="outline" onClick={handleAddFromCatalog}>
                <Plus size={15} /> Add
              </Button>
            </div>

            <h2 className="mt-5 font-heading text-base font-semibold text-ink-900">Or add manually</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Product name"
                className="flex-1 rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Product number"
                className="flex-1 rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
              <Button variant="outline" onClick={handleAddManual}>
                <Plus size={15} /> Add
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-semibold text-ink-900">
                Labels to print
              </h2>
              <span className="text-xs text-ink-400">{totalLabels} label{totalLabels === 1 ? '' : 's'} total</span>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
                  <Tag size={18} />
                </span>
                <p className="mt-3 text-sm font-medium text-ink-600">No products added yet</p>
                <p className="mt-1 max-w-xs text-xs text-ink-400">
                  Add a product above — each one becomes a label, and you can print multiple copies of the same label.
                </p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-ink-400/10">
                {items.map((it) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">{it.name}</p>
                      <p className="font-mono text-xs text-ink-400">{it.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => updateQuantity(it.id, e.target.value)}
                        aria-label={`Copies of ${it.name}`}
                        className="w-16 rounded-lg border border-ink-400/20 bg-cream-100 px-2 py-1.5 text-center text-sm text-ink-900 outline-none focus:border-clay-500"
                      />
                      <button
                        onClick={() => removeItem(it.id)}
                        aria-label={`Remove ${it.name}`}
                        className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: layout + customization + generate */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
            <h2 className="flex items-center gap-1.5 font-heading text-base font-semibold text-ink-900">
              <FolderOpen size={16} className="text-clay-600" /> Saved designs
            </h2>
            <p className="mt-1 text-xs text-ink-400">
              A design is the layout + what's shown — save one to reuse across any product, not tied to a specific item.
            </p>

            {designs.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {designs.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => applyDesign(d)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-ink-400/15 px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:border-clay-500 hover:bg-clay-500/5"
                    >
                      <span className="truncate">
                        {d.name}
                        <span className="ml-1.5 text-xs text-ink-400">
                          {d.mode === 'a4' ? 'A4' : 'Thermal'} · {d.label_width}×{d.label_height}mm
                        </span>
                      </span>
                      <Trash2
                        size={13}
                        onClick={(e) => handleDeleteDesign(e, d.id)}
                        className="shrink-0 text-ink-400 hover:text-red-500"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex gap-2">
              <input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="Name this design…"
                className="flex-1 rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              />
              <Button variant="outline" disabled={savingDesign} onClick={handleSaveDesign}>
                <Save size={15} /> {savingDesign ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
            <h2 className="font-heading text-base font-semibold text-ink-900">Layout</h2>

            <div className="mt-3 flex gap-1.5">
              <button
                onClick={() => setMode('thermal')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'thermal' ? 'border-clay-500 bg-clay-500/10 text-clay-600' : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
                }`}
              >
                Thermal printer
              </button>
              <button
                onClick={() => setMode('a4')}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'a4' ? 'border-clay-500 bg-clay-500/10 text-clay-600' : 'border-ink-400/20 text-ink-500 hover:border-ink-400/40'
                }`}
              >
                A4 sheet
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-medium text-ink-500">Label size</span>
              <select
                value={thermalPreset}
                onChange={(e) => setThermalPreset(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
              >
                {THERMAL_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </label>

            {thermalPreset === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-ink-500">Width (mm)</span>
                  <input
                    type="number"
                    min="10"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-ink-500">Height (mm)</span>
                  <input
                    type="number"
                    min="10"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-ink-400/20 bg-cream-100 px-3.5 py-2.5 text-sm text-ink-900 outline-none focus:border-clay-500"
                  />
                </label>
              </div>
            )}

            {mode === 'a4' && grid && (
              <p className="mt-3 text-xs text-ink-400">
                {grid.cols} × {grid.rows} labels fit per A4 page ({grid.perPage} per sheet).
              </p>
            )}
            {mode === 'thermal' && (
              <p className="mt-3 text-xs text-ink-400">
                One label per print job/strip — {labelWidth || 0} × {labelHeight || 0} mm.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
            <h2 className="font-heading text-base font-semibold text-ink-900">What's on the label</h2>
            <div className="mt-3 space-y-2">
              {TOGGLES.map((t) => (
                <label key={t.key} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1 text-sm text-ink-700">
                  {t.label}
                  <input
                    type="checkbox"
                    checked={toggles[t.key]}
                    onChange={(e) => setToggles((prev) => ({ ...prev, [t.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-ink-400/30 text-clay-500 focus:ring-clay-500"
                  />
                </label>
              ))}
            </div>

            <div className="mt-4">
              <LabelCanvasEditor
                labelWidth={labelWidth || 1}
                labelHeight={labelHeight || 1}
                elements={elements}
                visible={{
                  name: toggles.showName,
                  code: toggles.showCode,
                  barcode: toggles.showBarcode,
                  qr: toggles.showQr,
                }}
                onChange={updateElement}
                onReset={resetLayout}
                sample={{
                  name: items[0]?.name || 'Product name',
                  code: items[0]?.code || 'PRODUCT-NUMBER',
                }}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" disabled={generating} onClick={() => generate('print')}>
              <Printer size={15} /> {generating ? 'Generating…' : 'Print'}
            </Button>
            <Button variant="primary" className="flex-1" disabled={generating} onClick={() => generate('download')}>
              <Download size={15} /> {generating ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
          <p className="text-center text-xs text-ink-400">{previewCount} label{previewCount === 1 ? '' : 's'} will be generated</p>
        </div>
      </div>
    </div>
  )
}
