import { useEffect, useState } from 'react'
import { Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { qrImage } from '../../../lib/labelCodes'

// Live on-canvas QR preview — same qrImage() helper PDF export uses.
// qrImage() is async (unlike barcodeImage()), so the dataURL is fetched
// into local state rather than computed inline during render.
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

  return <KonvaImage image={img} width={width} height={height} {...groupProps} />
}
