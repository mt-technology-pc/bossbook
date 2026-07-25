import { useMemo } from 'react'
import { Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { barcodeImage } from '../../../lib/labelCodes'

// Live on-canvas barcode preview — reuses the same barcodeImage() helper
// PDF export already uses (labelCodes.js), so what's on screen is a real
// render of what will print, not a placeholder icon.
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

  return <KonvaImage image={img} width={width} height={height} {...groupProps} />
}
