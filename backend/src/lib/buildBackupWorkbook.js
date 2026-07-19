import ExcelJS from 'exceljs'

function cellValue(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

// tables: [{ name, rows }] — one worksheet per table, header row + data rows.
export async function buildBackupWorkbook(tables) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Ledgerly'
  workbook.created = new Date()

  for (const { name, rows } of tables) {
    // Sheet names are capped at 31 chars and can't contain []:*?/\\ in xlsx.
    const sheet = workbook.addWorksheet(name.slice(0, 31))
    if (rows.length === 0) continue

    const columns = Object.keys(rows[0])
    sheet.columns = columns.map((key) => ({ header: key, key, width: 18 }))
    sheet.getRow(1).font = { bold: true }
    for (const row of rows) {
      sheet.addRow(columns.map((col) => cellValue(row[col])))
    }
  }

  return workbook.xlsx.writeBuffer()
}
