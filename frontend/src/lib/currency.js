export const DEFAULT_CURRENCY = 'LKR'

export function formatCurrency(amount, currency = DEFAULT_CURRENCY) {
  const value = Number(amount) || 0
  if (currency === 'LKR') {
    return `Rs. ${value.toLocaleString('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(value)
}
