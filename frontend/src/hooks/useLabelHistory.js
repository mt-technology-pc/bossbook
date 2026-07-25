import { useCallback, useRef, useState } from 'react'

// In-memory undo/redo for the label editor's `elements` array — a plain
// snapshot stack, not a persisted "version history" (that's a materially
// bigger feature: its own storage, its own browsing UI). Ctrl+Z/Ctrl+Y
// call undo()/redo(); every other mutation should go through setElements().
export function useLabelHistory(initial) {
  const [present, setPresent] = useState(initial)
  const past = useRef([])
  const future = useRef([])

  const setElements = useCallback((next) => {
    setPresent((prev) => {
      past.current = [...past.current, prev].slice(-50)
      future.current = []
      return typeof next === 'function' ? next(prev) : next
    })
  }, [])

  // Resets history entirely — for switching templates or loading a saved
  // design, which aren't undo-able steps within the current session.
  const resetElements = useCallback((next) => {
    past.current = []
    future.current = []
    setPresent(next)
  }, [])

  const undo = useCallback(() => {
    setPresent((prev) => {
      if (past.current.length === 0) return prev
      const previous = past.current[past.current.length - 1]
      past.current = past.current.slice(0, -1)
      future.current = [prev, ...future.current]
      return previous
    })
  }, [])

  const redo = useCallback(() => {
    setPresent((prev) => {
      if (future.current.length === 0) return prev
      const next = future.current[0]
      future.current = future.current.slice(1)
      past.current = [...past.current, prev]
      return next
    })
  }, [])

  return {
    elements: present,
    setElements,
    resetElements,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  }
}
