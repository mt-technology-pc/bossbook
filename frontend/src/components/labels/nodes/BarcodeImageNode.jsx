import { useMemo } from 'react'
import { Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { barcodeImage } from '../../../lib/labelCodes'
import { fit } from '../../../lib/labelPdf'

// Live on-canvas barcode preview — reuses the same barcodeImage() helper
// PDF export already uses (labelCodes.js), so what's on screen is a real
// render of what will print, not a placeholder icon. Also reuses the same
// fit() aspect-ratio math PDF export uses (letterboxed, centered within
// the box) rather than stretching to fill it — otherwise the editor and
// the printed output visibly disagree on how big the barcode looks.
export default function BarcodeImageNode({ value, format, showText, textFontSize, width, height, ...groupProps }) {
  const dataUrl = useMemo(() => {
    if (!value) return null
    try {
      return barcodeImage(value, { format, displayValue: showText, fontSize: (textFontSize || 8) * 10 }).dataUrl
    } catch {
      return null
    }
  }, [value, format, showText, textFontSize])

  const [img] = useImage(dataUrl || '')
  if (!img) return null

  const fitted = fit(img.width, img.height, width, height)
  return (
    <KonvaImage
      image={img}
      width={fitted.w}
      height={fitted.h}
      x={(width - fitted.w) / 2}
      y={(height - fitted.h) / 2}
      {...groupProps}
    />
  )
}
