import { Router } from 'express'
import { ZipArchive } from 'archiver'
import { requireAuth } from '../middleware/requireAuth.js'
import { supabaseForUser } from '../lib/supabaseForUser.js'
import { BACKUP_TABLES } from '../lib/backupTables.js'
import { buildBackupSql } from '../lib/buildBackupSql.js'
import { buildBackupWorkbook } from '../lib/buildBackupWorkbook.js'

const router = Router()

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

    const filename = `ledgerly-backup-${new Date().toISOString().slice(0, 10)}.zip`
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

export default router
