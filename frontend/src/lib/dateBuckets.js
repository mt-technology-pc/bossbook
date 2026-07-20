function pad(n) {
  return String(n).padStart(2, '0')
}

function dayKey(dateStr) {
  return dateStr.slice(0, 10)
}

function weekKey(dateStr) {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00`)
  const dayOfWeek = (d.getDay() + 6) % 7 // Monday = 0
  d.setDate(d.getDate() - dayOfWeek)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7)
}

export function bucketKey(dateStr, granularity) {
  if (granularity === 'week') return weekKey(dateStr)
  if (granularity === 'month') return monthKey(dateStr)
  return dayKey(dateStr)
}

export function bucketLabel(key, granularity) {
  if (granularity === 'month') {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString('en-LK', { month: 'long', year: 'numeric' })
  }
  if (granularity === 'week') {
    const start = new Date(`${key}T00:00:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${start.toLocaleDateString('en-LK', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-LK', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

// Groups items into { key, label, count, total } buckets by day/week/month,
// newest bucket first.
export function groupByBucket(items, granularity, dateField, amountField) {
  const map = new Map()
  for (const item of items) {
    const key = bucketKey(item[dateField], granularity)
    if (!map.has(key)) map.set(key, { key, label: bucketLabel(key, granularity), count: 0, total: 0 })
    const bucket = map.get(key)
    bucket.count += 1
    bucket.total += Number(item[amountField]) || 0
  }
  return Array.from(map.values()).sort((a, b) => (a.key < b.key ? 1 : -1))
}

// Local calendar date as YYYY-MM-DD — never goes through toISOString(),
// which converts to UTC first and silently shifts the date by a day for
// any timezone ahead of UTC (including ours, Asia/Colombo, UTC+5:30).
function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Quick period presets as [startDate, endDate] ISO strings, or [null, null]
// for "all time".
export function periodRange(period) {
  const today = todayISO()
  if (period === 'today') return [today, today]
  if (period === 'week') {
    return [weekKey(today), today]
  }
  if (period === 'month') {
    const d = new Date()
    const start = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`
    return [start, today]
  }
  if (period === 'last_month') {
    const d = new Date()
    const lastMonth = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    const start = `${lastMonth.getFullYear()}-${pad(lastMonth.getMonth() + 1)}-01`
    const endOfLastMonth = new Date(d.getFullYear(), d.getMonth(), 0)
    const end = `${endOfLastMonth.getFullYear()}-${pad(endOfLastMonth.getMonth() + 1)}-${pad(endOfLastMonth.getDate())}`
    return [start, end]
  }
  return [null, null]
}
