import { useEffect, useState } from 'react'

const STORAGE_KEY = 'bossbooks:quickSwitchShortcut'
const CHANGE_EVENT = 'bossbooks:quickSwitchShortcut-change'
export const DEFAULT_SHORTCUT = { shift: true, code: 'Digit1' }

function readShortcut() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SHORTCUT
    const parsed = JSON.parse(raw)
    if (parsed?.code) return { shift: Boolean(parsed.shift), code: parsed.code }
  } catch {
    // Private browsing / storage disabled — fall through to default.
  }
  return DEFAULT_SHORTCUT
}

// Per-device/per-cashier preference (not company data), so localStorage
// rather than the DB-backed Settings fields. Broadcasts a same-tab
// CustomEvent on write because the native `storage` event never fires in
// the tab that made the change — the global shortcut listener (mounted
// once at App root) and the Settings page are two independent instances
// of this hook, and the listener needs to pick up an edit immediately.
export function useQuickSwitchShortcut() {
  const [shortcut, setShortcutState] = useState(readShortcut)

  useEffect(() => {
    const onChange = () => setShortcutState(readShortcut())
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
  }, [])

  const setShortcut = (next) => {
    setShortcutState(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Private browsing / storage disabled — in-memory state still works
      // for the rest of this session.
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
  }

  return [shortcut, setShortcut]
}
