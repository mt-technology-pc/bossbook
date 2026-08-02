import ExcelJS from 'exceljs'
import { BACKUP_TABLES } from './backupTables.js'

// The only jsonb column among BACKUP_TABLES — buildBackupWorkbook.js
// JSON.stringify's it into a plain text cell, so it needs JSON.parse on
// the way back in (the .sql path doesn't need this: its '...'::jsonb cast
// marker is self-describing).
const JSONB_COLUMNS = { label_designs: ['elements'] }

function unescapeQuotes(text) {
  return text.replace(/''/g, "'")
}

// Splits SQL text on `;` characters that sit outside single-quoted strings.
function splitStatements(sql) {
  const statements = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    if (inQuote) {
      current += ch
      if (ch === "'") {
        if (sql[i + 1] === "'") { current += sql[++i] } else { inQuote = false }
      }
      continue
    }
    if (ch === "'") { inQuote = true; current += ch; continue }
    if (ch === ';') { statements.push(current); current = ''; continue }
    current += ch
  }
  if (current.trim()) statements.push(current)
  return statements
}

// Splits `(a, b), (c, d)` into ['a, b', 'c, d'] — only top-level parens
// (i.e. the row-tuple wrappers) count; parens/commas inside quoted
// strings are ignored.
function splitRowTuples(text) {
  const rows = []
  let depth = 0
  let current = ''
  let inQuote = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      current += ch
      if (ch === "'") {
        if (text[i + 1] === "'") { current += text[++i] } else { inQuote = false }
      }
      continue
    }
    if (ch === "'") { inQuote = true; current += ch; continue }
    if (ch === '(') { depth++; if (depth === 1) current = ''; continue }
    if (ch === ')') { depth--; if (depth === 0) { rows.push(current); continue } }
    if (depth > 0) current += ch
  }
  return rows
}

// Splits one row-tuple's inner text on top-level commas outside quotes.
function splitFields(text) {
  const fields = []
  let current = ''
  let inQuote = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuote) {
      current += ch
      if (ch === "'") {
        if (text[i + 1] === "'") { current += text[++i] } else { inQuote = false }
      }
      continue
    }
    if (ch === "'") { inQuote = true; current += ch; continue }
    if (ch === ',') { fields.push(current); current = ''; continue }
    current += ch
  }
  fields.push(current)
  return fields
}

function parseFieldValue(raw) {
  const text = (raw || '').trim()
  if (text === 'NULL') return null
  if (text === 'TRUE') return true
  if (text === 'FALSE') return false
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text)
  const jsonbMatch = text.match(/^'([\s\S]*)'::jsonb$/)
  if (jsonbMatch) return JSON.parse(unescapeQuotes(jsonbMatch[1]))
  const stringMatch = text.match(/^'([\s\S]*)'$/)
  if (stringMatch) return unescapeQuotes(stringMatch[1])
  throw new Error(`Could not parse a value in the backup file: "${raw}"`)
}

const INSERT_RE = /^insert into public\.(\w+)\s*\(([^)]*)\)\s*values\s*([\s\S]*)$/i

// Parses the exact format buildBackupSql.js emits back into
// { table: [{col: value}, ...] }. Never executes the SQL text — this is
// pure string parsing, so a hostile/garbled file can only fail to parse,
// not run arbitrary statements against the database.
export function parseBackupSql(text) {
  const payload = {}
  for (const stmt of splitStatements(text)) {
    const cleaned = stmt.replace(/^--.*$/gm, '').trim()
    if (!cleaned) continue
    const lower = cleaned.toLowerCase()
    if (lower === 'begin' || lower === 'commit') continue

    const match = cleaned.match(INSERT_RE)
    if (!match) {
      throw new Error(`Unrecognized statement in backup file: "${cleaned.slice(0, 80)}"`)
    }

    const [, table, colsText, valuesText] = match
    if (!BACKUP_TABLES.includes(table)) {
      throw new Error(`Backup file references an unknown table "${table}"`)
    }

    const columns = colsText.split(',').map((c) => c.trim())
    const rows = splitRowTuples(valuesText).map((rowText) => {
      const fields = splitFields(rowText)
      const row = {}
      columns.forEach((col, i) => { row[col] = parseFieldValue(fields[i]) })
      return row
    })
    payload[table] = [...(payload[table] || []), ...rows]
  }
  return payload
}

function coerceCellValue(value, isJsonb) {
  if (value === null || value === undefined || value === '') return null
  if (isJsonb) return typeof value === 'string' ? JSON.parse(value) : value
  // Defensive: if someone opens the file in Excel and it auto-formats an
  // ISO-string cell as a real date, exceljs hands back a Date object.
  if (value instanceof Date) return value.toISOString()
  return value
}

// Parses a backup .xlsx (as produced by buildBackupWorkbook.js) back into
// { table: [{col: value}, ...] }.
export async function parseBackupWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const payload = {}
  for (const sheet of workbook.worksheets) {
    const table = sheet.name
    if (!BACKUP_TABLES.includes(table)) {
      throw new Error(`Backup file contains an unknown sheet "${table}"`)
    }

    const headerRow = sheet.getRow(1)
    if (!headerRow.values || headerRow.values.length <= 1) {
      payload[table] = []
      continue
    }

    const columns = headerRow.values.slice(1).map((v) => String(v))
    const jsonbCols = new Set(JSONB_COLUMNS[table] || [])
    const rows = []
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const record = {}
      columns.forEach((col, i) => {
        record[col] = coerceCellValue(row.getCell(i + 1).value, jsonbCols.has(col))
      })
      rows.push(record)
    })
    payload[table] = rows
  }
  return payload
}
