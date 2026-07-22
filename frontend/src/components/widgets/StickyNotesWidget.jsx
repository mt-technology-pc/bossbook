import { useEffect, useRef, useState } from 'react'
import { StickyNote, Plus, Pin, PinOff, Trash2, Undo2 } from 'lucide-react'
import DraggablePanel from './DraggablePanel'
import { NOTE_COLORS, noteColor } from '../../lib/noteColors'

const UNDO_WINDOW_MS = 5000

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(dateStr).toLocaleDateString('en-LK', { dateStyle: 'medium' })
}

function NoteCard({ note, onUpdate, onDelete }) {
  const [content, setContent] = useState(note.content)
  const timerRef = useRef(null)
  const color = noteColor(note.color)

  // Only resync the local draft when switching to a different note — not
  // on every content update — or the debounced buffer below would fight
  // its own in-flight edits as updateNote() results flow back through props.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setContent(note.content), [note.id])

  const handleChange = (value) => {
    setContent(value)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onUpdate(note.id, { content: value }), 600)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className={`rounded-xl border ${color.border} ${color.bg} p-3 shadow-sm`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onUpdate(note.id, { color: c.value })}
              aria-label={`Set color ${c.label}`}
              className={`h-3.5 w-3.5 rounded-full ${c.dot} ${note.color === c.value ? 'ring-2 ring-ink-900/40 ring-offset-1' : ''}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate(note.id, { pinned: !note.pinned })}
            aria-label={note.pinned ? 'Unpin' : 'Pin'}
            className="rounded-full p-1 text-ink-500 hover:bg-white/50"
          >
            {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>
          <button
            onClick={() => onDelete(note.id)}
            aria-label="Delete note"
            className="rounded-full p-1 text-ink-500 hover:bg-white/50 hover:text-red-500"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Write a note…"
        rows={4}
        className="mt-2 w-full resize-none bg-transparent text-sm text-ink-800 placeholder:text-ink-400/60 outline-none"
      />
      <p className="mt-1 text-right text-[10px] text-ink-500/70">Edited {timeAgo(note.updated_at)}</p>
    </div>
  )
}

export default function StickyNotesWidget({ open, onClose, notes, loading, addNote, updateNote, deleteNote }) {
  const [pendingDeletes, setPendingDeletes] = useState({})

  const requestDelete = (id) => {
    const timeoutId = setTimeout(() => {
      deleteNote(id)
      setPendingDeletes((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }, UNDO_WINDOW_MS)
    setPendingDeletes((prev) => ({ ...prev, [id]: timeoutId }))
  }

  const undoDelete = (id) => {
    clearTimeout(pendingDeletes[id])
    setPendingDeletes((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  useEffect(() => () => {
    Object.values(pendingDeletes).forEach(clearTimeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visibleNotes = notes.filter((n) => !pendingDeletes[n.id])
  const deletingNotes = notes.filter((n) => pendingDeletes[n.id])

  return (
    <DraggablePanel
      open={open}
      onClose={onClose}
      title="Sticky Notes"
      icon={StickyNote}
      accentClassName="bg-amber-500 text-white"
      defaultPosition={{ top: 90, right: 96 }}
      defaultSize={{ width: 320, height: 460 }}
      minSize={{ width: 280, height: 300 }}
      resizable
      footer={
        <button
          onClick={() => addNote({ color: NOTE_COLORS[notes.length % NOTE_COLORS.length].value })}
          className="flex w-full items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium text-clay-600 hover:bg-cream-100"
        >
          <Plus size={14} /> New note
        </button>
      }
    >
      <div className="space-y-2.5 p-3">
        {deletingNotes.map((n) => (
          <div key={n.id} className="flex items-center justify-between rounded-xl border border-ink-400/15 bg-cream-100 px-3 py-2.5 text-xs text-ink-500">
            Note deleted
            <button onClick={() => undoDelete(n.id)} className="flex items-center gap-1 font-medium text-clay-600 hover:text-clay-700">
              <Undo2 size={12} /> Undo
            </button>
          </div>
        ))}

        {loading ? (
          <p className="py-8 text-center text-xs text-ink-400">Loading…</p>
        ) : visibleNotes.length === 0 && deletingNotes.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <StickyNote size={22} className="text-ink-400/50" />
            <p className="mt-2 text-xs text-ink-400">No notes yet — add one below.</p>
          </div>
        ) : (
          visibleNotes.map((note) => (
            <NoteCard key={note.id} note={note} onUpdate={updateNote} onDelete={requestDelete} />
          ))
        )}
      </div>
    </DraggablePanel>
  )
}
