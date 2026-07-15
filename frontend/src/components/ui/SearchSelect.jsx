import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, ChevronDown } from 'lucide-react'

function highlight(label, query) {
  if (!query) return label
  const idx = label.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return label
  return (
    <>
      {label.slice(0, idx)}
      <span className="font-semibold text-ink-900 dark:text-cream-50">
        {label.slice(idx, idx + query.length)}
      </span>
      {label.slice(idx + query.length)}
    </>
  )
}

export default function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Search…',
  createLabel = 'Add new',
  onCreate,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)

  const selected = options.find((o) => o.id === value)

  useEffect(() => {
    if (!open) return
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase())

  const select = (option) => {
    onChange(option.id)
    setQuery('')
    setOpen(false)
  }

  const handleCreate = async () => {
    const name = query.trim()
    if (!name || !onCreate || creating) return
    setCreating(true)
    const result = await onCreate(name)
    setCreating(false)
    if (result?.id) {
      onChange(result.id)
      setQuery('')
      setOpen(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) select(filtered[0])
      else if (query.trim()) handleCreate()
    }
  }

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex items-center rounded-xl border bg-cream-50 transition-colors dark:bg-dark-800 ${
          open ? 'border-clay-500 ring-2 ring-clay-500/20' : 'border-ink-400/20 dark:border-cream-100/10'
        }`}
      >
        <input
          ref={inputRef}
          value={open ? query : (selected?.label ?? '')}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-xl bg-transparent px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none dark:text-cream-50"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setOpen((o) => !o)
            setQuery('')
            inputRef.current?.focus()
          }}
          className="px-3 text-ink-400"
        >
          <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-ink-400/15 bg-cream-50 py-1.5 shadow-xl dark:border-cream-100/10 dark:bg-dark-800"
          >
            {onCreate && query.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-clay-600 hover:bg-cream-200 disabled:opacity-50 dark:text-clay-400 dark:hover:bg-dark-700"
              >
                <Plus size={15} />
                {creating ? 'Adding…' : createLabel} &ldquo;{query.trim()}&rdquo;
              </button>
            )}

            {filtered.length === 0 && !query ? (
              <p className="px-3.5 py-3 text-sm text-ink-400">No options yet</p>
            ) : filtered.length === 0 ? (
              <p className="px-3.5 py-3 text-sm text-ink-400">No matches</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => select(o)}
                  className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-cream-200 dark:hover:bg-dark-700 ${
                    o.id === value ? 'bg-clay-500/5' : ''
                  }`}
                >
                  <span className="text-ink-700 dark:text-cream-200">{highlight(o.label, query)}</span>
                  {o.sublabel && <span className="text-xs text-ink-400">{o.sublabel}</span>}
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
