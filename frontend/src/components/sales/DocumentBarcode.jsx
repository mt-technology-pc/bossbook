import { useMemo } from 'react'
import { barcodeImage } from '../../lib/labelCodes'

// Renders the invoice/receipt reference as a Code128 barcode, reusing the
// same barcodeImage() helper the Label Generator's PDF export already uses
// (frontend/src/lib/labelCodes.js) — one canvas render, dropped in as an
// <img>, rather than a live on-screen JsBarcode canvas (simpler, and this
// is a print-only view anyway, never actually seen on screen).
export default function DocumentBarcode({ code, className = 'h-10' }) {
  const barcode = useMemo(() => (code ? barcodeImage(code) : null), [code])
  if (!barcode) return null

  return (
    <div className="flex flex-col items-center">
      <img src={barcode.dataUrl} alt={`Barcode ${code}`} className={`${className} w-auto`} />
      <p className="mt-1 font-mono text-[10px] tracking-widest">{code}</p>
    </div>
  )
}
