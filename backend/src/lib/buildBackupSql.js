function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
  }
  return `'${String(value).replace(/'/g, "''")}'`
}

function tableInsertSql(name, rows) {
  if (rows.length === 0) return ''

  const columns = Object.keys(rows[0])
  const valuesSql = rows
    .map((row) => `  (${columns.map((col) => sqlLiteral(row[col])).join(', ')})`)
    .join(',\n')

  return `insert into public.${name} (${columns.join(', ')}) values\n${valuesSql};\n`
}

// tables: [{ name, rows }] — data-only dump (no CREATE TABLE), assumes
// supabase/schema.sql has already been applied wherever this is restored.
export function buildBackupSql(tables) {
  const header = `-- BossBooks data backup
-- Generated ${new Date().toISOString()}
-- Data-only dump: run supabase/schema.sql against an empty database first,
-- then run this file to restore records.

begin;

`
  const body = tables.map(({ name, rows }) => tableInsertSql(name, rows)).join('\n')

  return `${header}${body}\ncommit;\n`
}
