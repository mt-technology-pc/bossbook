import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuickSwitchShortcut } from '../../hooks/useQuickSwitchShortcut'
import { useLockState } from '../../hooks/useLockState'
import { useAuth } from '../../context/AuthContext'

const IS_MAC = /Mac/i.test(navigator.platform)

// Global, mounted once at the App root (sibling of UtilityWidgets) so the
// shortcut works from every page. Toggles a real lock, not just a UI
// reset: first press sets the locked flag (App.jsx then renders ONLY
// DecoySalesReceipt in place of the whole route tree — no sidebar, no
// other page ever mounts). Second press signs out for real and sends the
// browser to /login — getting back in requires the actual account
// password, which is what makes this an actual lock rather than a toggle
// anyone standing at the keyboard could bypass.
export default function PrivacyQuickSwitch() {
  const navigate = useNavigate()
  const [shortcut] = useQuickSwitchShortcut()
  const [locked, setLocked] = useLockState()
  const { signOut } = useAuth()

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return // held key auto-repeat — not a real second press

      const modifierOk = IS_MAC ? e.metaKey : e.ctrlKey
      if (!modifierOk) return
      if (Boolean(shortcut.shift) !== e.shiftKey) return
      // event.code, not event.key: with Shift held, `key` reports the
      // shifted character (e.g. '!' for Shift+1 on a US layout), never
      // '1' — matching on `key` here would simply never fire. `code`
      // identifies the physical key regardless of modifiers/layout.
      if (e.code !== shortcut.code) return

      e.preventDefault()

      if (!locked) {
        setLocked(true)
        return
      }

      // Already locked — this same combo now means "sign out for real."
      setLocked(false)
      signOut().finally(() => navigate('/login', { replace: true }))
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shortcut, locked, setLocked, signOut, navigate])

  return null
}
