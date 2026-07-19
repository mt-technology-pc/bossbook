import { useState } from 'react'
import { DatabaseBackup, Download, AlertCircle } from 'lucide-react'
import { apiFetchBlob } from '../../lib/api'
import { downloadBlob } from '../../lib/exportTable'
import Button from '../../components/ui/Button'

export default function Backup() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      const blob = await apiFetchBlob('/api/backup/download')
      const filename = `ledgerly-backup-${new Date().toISOString().slice(0, 10)}.zip`
      downloadBlob(blob, filename)
    } catch (err) {
      setError(err.message || 'Could not generate the backup.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">Backup</h1>
      <p className="mt-1 text-sm text-ink-500">
        Download a full copy of your business data.
      </p>

      <div className="mt-6 max-w-xl rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
            <DatabaseBackup size={18} />
          </span>
          <h2 className="font-heading text-base font-semibold text-ink-900">Download backup</h2>
        </div>
        <p className="mt-3 text-sm text-ink-500">
          Bundles all of your customers, suppliers, products, sales, purchases, payments, and
          accounting records into a single zip file — a SQL file (<code className="font-mono text-xs">backup.sql</code>) and
          an Excel workbook (<code className="font-mono text-xs">backup.xlsx</code>), one sheet per table.
        </p>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-4">
          <Button variant="primary" disabled={downloading} onClick={handleDownload}>
            <Download size={15} /> {downloading ? 'Preparing…' : 'Download backup'}
          </Button>
        </div>
      </div>
    </div>
  )
}
