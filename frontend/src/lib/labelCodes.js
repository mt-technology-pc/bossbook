import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

// jsbarcode draws onto a real <canvas> element (it doesn't work headless),
// so this only runs in the browser — fine, this whole feature is a
// client-only PDF export, same as the app's CSV exports.
//
// Both return { dataUrl, width, height } (pixel dimensions of the source
// canvas) so the PDF layout can preserve aspect ratio instead of
// stretching/squashing the image to fit a fixed box.
export function barcodeImage(text) {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, text, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: 80,
  })
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height }
}

export async function qrImage(text) {
  const size = 240
  const dataUrl = await QRCode.toDataURL(text, { margin: 0, width: size })
  return { dataUrl, width: size, height: size }
}
