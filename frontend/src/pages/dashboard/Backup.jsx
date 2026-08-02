import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Download, Upload, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { apiFetchBlob, apiUploadFile } from '../../lib/api'
import { downloadBlob } from '../../lib/exportTable'

const ACCENT = '#2f6fed'
const ACCENT_HOVER = '#2559c9'

function PanelButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-sm border-none px-3.5 py-2.5 text-xs font-semibold tracking-wide text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: ACCENT }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = ACCENT_HOVER }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT }}
    >
      {children}
    </button>
  )
}

function Panel({ icon: Icon, title, flex, children }) {
  return (
    <div className={`rounded-sm border border-[#e3e6ea] bg-white ${flex}`}>
      <div className="flex items-center gap-2 border-b border-[#e3e6ea] px-4.5 py-3.5 text-[13px] font-semibold tracking-wide text-[#4a5568]">
        <Icon size={14} style={{ color: ACCENT }} />
        {title}
      </div>
      <div className="p-4.5">{children}</div>
    </div>
  )
}

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
    <div className="min-h-screen w-full bg-[#eef1f5] p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-1.5 border-b-2 border-transparent pb-0.5 text-sm font-medium text-[#9aa2ad] transition-colors hover:text-[#2f6fed]"
      >
        <ArrowLeft size={14} /> Dashboard
      </button>

      <h1 className="text-[22px] font-bold text-[#2b3648]">Momoco(Backup)</h1>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row">
        <Panel icon={Server} title="DATABASE OPERATION" flex="flex-1">
          <p className="mb-3.5 text-[13px] leading-relaxed text-[#6b7280]">
            Bundles all customers, suppliers, products, sales, purchases, payments, and
            accounting records into a zip file — <code className="font-mono text-xs">backup.sql</code> and{' '}
            <code className="font-mono text-xs">backup.xlsx</code>.
          </p>

          {error && (
            <div className="mb-3.5 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <PanelButton onClick={handleDownload} disabled={downloading}>
            <Download size={14} /> {downloading ? 'PREPARING…' : 'DOWNLOAD BACKUP'}
          </PanelButton>
        </Panel>

        <Panel icon={Upload} title="IMPORT BACKUP" flex="flex-[2.2]">
          <p className="mb-3.5 text-[13px] leading-relaxed text-[#6b7280]">
            Restore your data from a <code className="font-mono text-xs">backup.xlsx</code> or{' '}
            <code className="font-mono text-xs">backup.sql</code> file downloaded from this page.
          </p>

          <div className="mb-3.5 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            This permanently replaces all of your current data and cannot be undone.
          </div>

          <label className="mb-3.5 flex cursor-pointer items-center justify-between gap-3 rounded-sm border border-dashed border-[#cfd4da] px-3.5 py-2.5 text-[13px] text-[#6b7280] transition-colors hover:border-[#2f6fed]">
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
            <div className="mb-3.5 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              {importError}
            </div>
          )}

          {importResult && (
            <div className="mb-3.5 flex items-start gap-2 rounded-sm border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-700">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
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

          <PanelButton onClick={handleImport} disabled={!file || importing}>
            <Upload size={14} /> {importing ? 'RESTORING…' : 'IMPORT BACKUP'}
          </PanelButton>
        </Panel>
      </div>
    </div>
  )
}
