// CSV is the underlying mechanism for both "CSV" and "Excel" export.
// Excel opens .csv natively with zero data loss for a flat table like this
// report — that's a deliberate choice to avoid pulling in a dependency with
// known vulnerabilities (the `xlsx` package) just to write a plain table.

function escapeCsvCell(value) {
  const str = String(value ?? '')
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const downloadBlob = download

// columns: [{ key, label }], rows: [{ [key]: value }]
export function exportToCsv({ columns, rows, filename }) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',')
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvCell(row[c.key])).join(','),
  )
  const csv = [header, ...lines].join('\n')
  download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
}
