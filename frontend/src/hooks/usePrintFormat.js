import { useState } from 'react'

const STORAGE_KEY = 'bossbooks:print-format'

// 'formal' (A4 letterhead) or 'pos' (80mm thermal receipt). Persisted in
// localStorage so the choice sticks across invoices/receipts instead of
// resetting every time the page is opened.
export function usePrintFormat() {
  const [format, setFormatState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'pos' ? 'pos' : 'formal'
    } catch {
      return 'formal'
    }
  })

  const setFormat = (next) => {
    setFormatState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private browsing / storage disabled — the in-memory state still works.
    }
  }

  return [format, setFormat]
}
