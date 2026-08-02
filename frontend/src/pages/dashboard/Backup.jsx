import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DatabaseBackup, Download, Upload, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { apiFetchBlob, apiUploadFile } from '../../lib/api'
import { downloadBlob } from '../../lib/exportTable'
import Button from '../../components/ui/Button'

export default function Backup() {
  const navigate = useNavigate()
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState(null)

  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const handleDownload = async () => {
    setDownloading(true)
    setError(null)
    try {
      const blob = await apiFetchBlob('/api/backup/download')
      const filename = `bossbooks-backup-${new Date().toISOString().slice(0, 10)}.zip`
      downloadBlob(blob, filename)
    } catch (err) {
      setError(err.message || 'Could not generate the backup.')
    } finally {
      setDownloading(false)
    }
  }

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null)
    setImportError(null)
    setImportResult(null)
  }

  const handleImport = async () => {
    if (!file) return
    const confirmed = window.confirm(
      `Importing "${file.name}" will permanently delete ALL of your current business data and replace it with the contents of this file. This cannot be undone. Continue?`,
    )
    if (!confirmed) return

    setImporting(true)
    setImportError(null)
    setImportResult(null)
    try {
      const result = await apiUploadFile('/api/backup/import', file)
      setImportResult(result)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setImportError(err.message || 'Could not restore this backup.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-cream-100 p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-clay-600"
      >
        <ArrowLeft size={15} /> Dashboard
      </button>

      <h1 className="font-heading text-2xl font-semibold text-ink-900 sm:text-3xl">Backup</h1>
      <p className="mt-1 text-sm text-ink-500">
        Download a full copy of your business data, or restore it from a previous backup.
      </p>

      <div className="mt-6 flex max-w-xl flex-col gap-6">
        <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
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

        <div className="rounded-2xl border border-ink-400/15 bg-cream-50 p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
              <Upload size={18} />
            </span>
            <h2 className="font-heading text-base font-semibold text-ink-900">Import backup</h2>
          </div>
          <p className="mt-3 text-sm text-ink-500">
            Restore your data from a <code className="font-mono text-xs">backup.xlsx</code> or{' '}
            <code className="font-mono text-xs">backup.sql</code> file downloaded from this page.
          </p>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            This permanently replaces all of your current data and cannot be undone.
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-ink-400/25 px-3.5 py-2.5 text-sm text-ink-500 transition-colors hover:border-clay-500 hover:text-clay-600">
            <span className="truncate">{file ? file.name : 'Choose a .xlsx or .sql file…'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.sql"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {importError && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {importError}
            </div>
          )}

          {importResult && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>
                Backup restored —{' '}
                {Object.entries(importResult.counts || {})
                  .filter(([, n]) => n > 0)
                  .map(([table, n]) => `${n} ${table}`)
                  .join(', ') || 'no rows found in the file'}
                .
              </span>
            </div>
          )}

          <div className="mt-4">
            <Button variant="primary" disabled={!file || importing} onClick={handleImport}>
              <Upload size={15} /> {importing ? 'Restoring…' : 'Import backup'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
