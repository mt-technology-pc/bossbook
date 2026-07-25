// EAN-13/UPC-A share the same weighted-checksum algorithm (UPC-A is
// mathematically EAN-13 with an implicit leading 0, just offset by one
// digit) — verified against two real barcodes rather than assumed from
// memory: Nutella's EAN-13 4006381333931 and Kellogg's UPC-A 036000291452
// both check out against this exact weight pattern.
function checksumDigit(digits, weights) {
  let sum = 0
  for (let i = 0; i < digits.length; i += 1) {
    sum += Number(digits[i]) * weights[i % 2]
  }
  return (10 - (sum % 10)) % 10
}

// Returns an error message string, or null if valid. Digits-only input
// without a check digit (12 for EAN-13, 11 for UPC-A) is accepted as
// valid too — JsBarcode computes and appends the check digit itself when
// given just the data portion for these formats.
export function validateBarcode(format, value) {
  const digits = String(value || '').trim()

  if (format === 'EAN13') {
    if (!/^\d{12,13}$/.test(digits)) return 'EAN-13 needs 12–13 digits.'
    if (digits.length === 13) {
      const expected = checksumDigit(digits.slice(0, 12), [1, 3])
      if (Number(digits[12]) !== expected) return `Invalid EAN-13 check digit (expected ${expected}).`
    }
    return null
  }

  if (format === 'UPC') {
    if (!/^\d{11,12}$/.test(digits)) return 'UPC-A needs 11–12 digits.'
    if (digits.length === 12) {
      const expected = checksumDigit(digits.slice(0, 11), [3, 1])
      if (Number(digits[11]) !== expected) return `Invalid UPC-A check digit (expected ${expected}).`
    }
    return null
  }

  // CODE128 accepts arbitrary alphanumeric text — nothing to validate.
  return null
}
