import { useState } from 'react'
import { apiFetch } from '../lib/api'

export function useAssistant() {
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const next = [...messages, { role: 'user', text: trimmed }]
    setMessages(next)
    setSending(true)
    setError(null)

    try {
      const { reply, actions } = await apiFetch('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: next }),
      })
      setMessages([...next, { role: 'assistant', text: reply, actions }])
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const clear = () => {
    setMessages([])
    setError(null)
  }

  return { messages, sending, error, send, clear }
}
