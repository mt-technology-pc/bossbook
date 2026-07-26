// This app is Sri Lanka-only (LKR, Asia/Colombo, UTC+5:30). Never derive
// "today" via `new Date().toISOString()` or the Node process's own local
// time — most hosts run in UTC, and during 00:00-05:29 Colombo time (when
// UTC is still the previous day), that silently reports yesterday's date.
// Format explicitly in the business's timezone instead, regardless of what
// timezone the server process itself is running in.
const colomboFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' })

export function todayColombo() {
  return colomboFormatter.format(new Date())
}
