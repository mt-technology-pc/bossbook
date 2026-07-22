import { useState } from 'react'
import { StickyNote, Calculator, PinOff } from 'lucide-react'
import { useStickyNotes } from '../../hooks/useStickyNotes'
import { noteColor } from '../../lib/noteColors'
import StickyNotesWidget from './StickyNotesWidget'
import CalculatorWidget from './CalculatorWidget'

// Global, persistent across every route (mounted once at the App root, not
// inside DashboardLayout) so the transaction-entry pages — which render
// outside DashboardLayout — still get the calculator/notes triggers, per
// the "available on every page" requirement.
export default function UtilityWidgets() {
  const [notesOpen, setNotesOpen] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const { notes, loading, addNote, updateNote, deleteNote } = useStickyNotes()

  const pinnedNotes = notes.filter((n) => n.pinned)

  return (
    <>
      <div className="fixed right-4 top-1/2 z-40 flex -translate-y-1/2 flex-col items-end gap-2.5 print:hidden">
        <button
          onClick={() => setNotesOpen((o) => !o)}
          aria-label="Sticky notes"
          title="Sticky notes"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-400/15 bg-cream-50 text-ink-600 shadow-lg transition-colors hover:border-clay-500 hover:text-clay-600"
        >
          <StickyNote size={18} />
        </button>
        <button
          onClick={() => setCalcOpen((o) => !o)}
          aria-label="Calculator"
          title="Calculator"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-400/15 bg-cream-50 text-ink-600 shadow-lg transition-colors hover:border-clay-500 hover:text-clay-600"
        >
          <Calculator size={18} />
        </button>

        {pinnedNotes.map((note) => {
          const color = noteColor(note.color)
          return (
            <button
              key={note.id}
              onClick={() => setNotesOpen(true)}
              className={`group relative w-32 rounded-lg border ${color.border} ${color.bg} p-2 text-left shadow-md`}
            >
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  updateNote(note.id, { pinned: false })
                }}
                role="button"
                tabIndex={-1}
                aria-label="Unpin"
                className="absolute right-1 top-1 rounded-full bg-white/60 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <PinOff size={10} />
              </span>
              <p className="line-clamp-3 whitespace-pre-wrap text-[11px] leading-snug text-ink-800">
                {note.content || 'Empty note'}
              </p>
            </button>
          )
        })}
      </div>

      <StickyNotesWidget
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        notes={notes}
        loading={loading}
        addNote={addNote}
        updateNote={updateNote}
        deleteNote={deleteNote}
      />
      <CalculatorWidget open={calcOpen} onClose={() => setCalcOpen(false)} />
    </>
  )
}
