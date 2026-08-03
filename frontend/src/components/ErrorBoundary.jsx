import { Component } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

// Error boundaries must be class components — there's no hook equivalent
// (React docs). Without this, any uncaught render error anywhere in the
// tree unmounts the whole app to a blank white screen with nothing but a
// console stack trace — this catches that and shows a real screen instead.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Uncaught render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-cream-100 px-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <AlertTriangle size={26} />
          </span>
          <h1 className="mt-4 font-heading text-xl font-semibold text-ink-900">Something went wrong</h1>
          <p className="mt-2 max-w-sm text-sm text-ink-500">
            This page hit an unexpected error. Reloading usually fixes it — if it keeps happening, let support know.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 flex items-center gap-1.5 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-cream-50 hover:bg-ink-800"
          >
            <RotateCw size={15} /> Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
