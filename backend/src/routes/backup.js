import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { ZipArchive } from 'archiver'
import { requireAuth } from '../middleware/requireAuth.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { BACKUP_TABLES } from '../lib/backupTables.js'
import { buildBackupSql } from '../lib/buildBackupSql.js'
import { buildBackupWorkbook } from '../lib/buildBackupWorkbook.js'
import { parseBackupSql, parseBackupWorkbook } from '../lib/parseBackupFile.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// Not a validateBody() middleware — this route takes a multipart file
// upload, not a JSON body; the "payload" to check only exists after
// parsing. parseBackupSql/parseBackupWorkbook already reject unknown
// table names and unparseable rows on their own, so this is a defense-in-
// depth shape check (every value is an array of plain row objects) before
// the parsed result reaches the restore_company_backup RPC, not the
// primary line of defense.
const backupPayloadSchema = z.record(
  z.enum(BACKUP_TABLES),
  z.array(z.record(z.string(), z.unknown())),
)

router.get('/download', requireAuth, async (req, res, next) => {
  try {
    const supabase = supabaseForUser(req.accessToken)

    const results = await Promise.all(
      BACKUP_TABLES.map((name) => supabase.from(name).select('*')),
    )

    const failed = results.find((r) => r.error)
    if (failed) {
      res.status(500).json({ error: `Could not read backup data: ${failed.error.message}` })
      return
    }

    const tables = BACKUP_TABLES.map((name, i) => ({ name, rows: results[i].data || [] }))

    const sql = buildBackupSql(tables)
    const xlsxBuffer = await buildBackupWorkbook(tables)

    const filename = `bossbooks-backup-${new Date().toISOString().slice(0, 10)}.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    const archive = new ZipArchive()
    archive.on('error', (err) => next(err))
    archive.pipe(res)
    archive.append(sql, { name: 'backup.sql' })
    archive.append(xlsxBuffer, { name: 'backup.xlsx' })
    await archive.finalize()
  } catch (err) {
    next(err)
  }
})

router.post('/import', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'No file was uploaded.' })
      return
    }

    const name = file.originalname.toLowerCase()
    let payload
    try {
      if (name.endsWith('.xlsx')) {
        payload = await parseBackupWorkbook(file.buffer)
      } else if (name.endsWith('.sql')) {
        payload = parseBackupSql(file.buffer.toString('utf8'))
      } else {
        res.status(400).json({ error: 'Only .xlsx or .sql backup files are supported.' })
        return
      }
    } catch (err) {
      res.status(400).json({ error: `Could not read this backup file: ${err.message}` })
      return
    }

    const totalRows = Object.values(payload).reduce((sum, rows) => sum + rows.length, 0)
    if (totalRows === 0) {
      res.status(400).json({ error: 'This backup file has no data to restore.' })
      return
    }

    const shapeCheck = backupPayloadSchema.safeParse(payload)
    if (!shapeCheck.success) {
      res.status(400).json({ error: 'This backup file is malformed — could not verify its structure.' })
      return
    }

    const supabase = supabaseForUser(req.accessToken)
    const { data, error } = await supabase.rpc('restore_company_backup', { p_payload: payload })
    if (error) {
      res.status(400).json({ error: error.message })
      return
    }

    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
