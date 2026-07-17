import { Link } from 'react-router-dom'

export default function Logo({ className }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className ?? ''}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-500 text-cream-50 shadow-md shadow-clay-500/30 transition-transform duration-300 group-hover:-rotate-6">
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
          <path
            d="M9 21V11L16 16L23 11V21"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-heading text-lg font-semibold text-ink-900">
        Ledgerly
      </span>
    </Link>
  )
}
