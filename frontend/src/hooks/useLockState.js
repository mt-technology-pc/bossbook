import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'bossbooks:locked'
const SAME_TAB_EVENT = 'bossbooks:locked-change'

function readLocked() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// Deliberately localStorage, not sessionStorage — sessionStorage is
// per-tab, so if the app were locked in one tab, simply opening the site
// in a NEW tab (sharing the same logged-in Supabase session, which is
// itself localStorage-backed) would completely bypass the lock. This
// needs to be visible/enforced across every tab on this origin, and
// survive a reload, exactly like the auth session it's gating access to.
//
// Two sync paths are needed: the native `storage` event fires in every
// OTHER tab when localStorage changes, but never in the tab that made the
// write — so a same-tab CustomEvent covers that gap (same technique as
// useQuickSwitchShortcut.js).
export function useLockState() {
  const [locked, setLockedState] = useState(readLocked)

  useEffect(() => {
    const onChange = () => setLockedState(readLocked())
    window.addEventListener(SAME_TAB_EVENT, onChange)
    window.addEventListener('storage', onChange)
    return () => {
      window.removeEventListener(SAME_TAB_EVENT, onChange)
      window.removeEventListener('storage', onChange)
    }
  }, [])

  const setLocked = useCallback((next) => {
    setLockedState(next)
    try {
      localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Private browsing / storage disabled — in-memory state still works
      // for the rest of this session, just won't survive a reload or
      // sync to other tabs.
    }
    window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT))
  }, [])

  return [locked, setLocked]
}
