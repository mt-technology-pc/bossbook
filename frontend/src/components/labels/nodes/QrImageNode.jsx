import { useEffect, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { qrImage } from '../../../lib/labelCodes'
import { fit } from '../../../lib/labelPdf'

// Live on-canvas QR preview — same qrImage() helper PDF export uses.
// qrImage() is async (unlike barcodeImage()), so the dataURL is fetched
// into local state rather than computed inline during render. Uses the
// same fit() aspect-ratio math as PDF export (a square inscribed in the
// box, centered) rather than stretching to fill a non-square box.
export default function QrImageNode({ value, width, height, ...groupProps }) {
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    if (!value) {
      setDataUrl(null)
      return undefined
    }
    qrImage(value).then((result) => {
      if (!cancelled) setDataUrl(result.dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [value])

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
