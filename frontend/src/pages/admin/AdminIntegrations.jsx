import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HardDrive, Check, AlertCircle } from 'lucide-react'
import { useGoogleDriveConnection } from '../../hooks/useGoogleDriveConnection'

// App-wide integrations (one shared connection/credential used across
// every company on the platform), so this lives here rather than in each
// company's own Settings page. text.lk credentials are set via SQL for
// now (see schema.sql) — only Google Drive needs an interactive OAuth
// step, which is what this page is for.
export default function AdminIntegrations() {
  const { connection, loading, connect, disconnect } = useGoogleDriveConnection()
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const banner = searchParams.get('drive')
  const dismissBanner = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('drive')
    setSearchParams(next, { replace: true })
  }

  const handleConnect = async () => {
    setError(null)
    try {
      await connect()
    } catch (err) {
      setError(err.message || 'Could not start the Google Drive connection.')
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    setError(null)
    try {
      await disconnect()
    } catch (err) {
      setError(err.message || 'Could not disconnect Google Drive.')
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold">Integrations</h1>
      <p className="mt-1 text-sm text-cream-50/60">
        Shared across every company on the platform — used to text customers a link to their invoice/receipt PDF.
      </p>

      {banner === 'connected' && (
        <div className="mt-6 flex items-start justify-between gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3.5 py-2.5 text-sm text-green-400">
          <span className="flex items-start gap-2"><Check size={16} className="mt-0.5 shrink-0" /> Google Drive connected.</span>
          <button type="button" onClick={dismissBanner} className="text-xs font-medium text-green-400/70 hover:text-green-400">Dismiss</button>
        </div>
      )}
      {banner === 'error' && (
        <div className="mt-6 flex items-start justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          <span className="flex items-start gap-2"><AlertCircle size={16} className="mt-0.5 shrink-0" /> Could not connect Google Drive — try again.</span>
          <button type="button" onClick={dismissBanner} className="text-xs font-medium text-red-400/70 hover:text-red-400">Dismiss</button>
        </div>
      )}
      {error && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6 max-w-lg rounded-2xl border border-cream-50/10 bg-ink-800 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/15 text-clay-400">
            <HardDrive size={16} />
          </span>
          <h2 className="font-heading text-base font-semibold">Google Drive</h2>
        </div>
        <p className="mt-1 text-xs text-cream-50/50">
          Invoice/receipt PDFs are uploaded here so a link can be texted to customers.
        </p>

        <div className="mt-4">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-cream-50/20 border-t-cream-50" />
          ) : connection ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-cream-50/80">
                Connected as <span className="font-medium text-cream-50">{connection.connectedEmail}</span>
              </p>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-xs font-medium text-cream-50/60 hover:text-red-400 disabled:opacity-50"
              >
                {disconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              className="flex items-center gap-1.5 rounded-full border border-cream-50/20 px-4 py-2 text-sm font-medium text-cream-50 hover:border-clay-500 hover:text-clay-400"
            >
              <HardDrive size={14} /> Connect Google Drive
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
