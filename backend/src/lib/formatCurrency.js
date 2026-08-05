// Mirrors frontend/src/lib/currency.js's formatting exactly (LKR only,
// same "Rs. X,XXX.XX" shape) — kept as a separate copy rather than a
// shared import since the backend and frontend are different
// packages/runtimes with no shared module boundary between them.
export function formatCurrency(amount) {
  const value = Number(amount) || 0
  return `Rs. ${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
