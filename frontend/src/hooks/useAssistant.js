import { useCallback, useState } from 'react'
import { apiFetch } from '../lib/api'

export function useAssistant() {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [conversations, setConversations] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const next = [...messages, { role: 'user', text: trimmed, createdAt: new Date().toISOString() }]
    setMessages(next)
    setSending(true)
    setError(null)

    try {
      const { reply, actions, conversationId: savedConversationId } = await apiFetch('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: next, conversationId }),
      })
      setMessages([...next, { role: 'assistant', text: reply, actions, createdAt: new Date().toISOString() }])
      if (savedConversationId) setConversationId(savedConversationId)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  // Starts a fresh conversation without touching the old one — history
  // stays reachable via openConversation, this just stops appending to it.
  const newChat = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
  }

  const loadConversations = useCallback(async () => {
    try {
      const { conversations: list } = await apiFetch('/api/assistant/conversations')
      setConversations(list)
    } catch {
      // History is a nice-to-have — leave the list as-is on failure
      // rather than surfacing an error for a sidebar the user hasn't
      // even necessarily opened.
    }
  }, [])

  const openConversation = async (id) => {
    setError(null)
    try {
      const { messages: history } = await apiFetch(`/api/assistant/conversations/${id}/messages`)
      setMessages(history.map((m) => ({ role: m.role, text: m.text, actions: m.actions || undefined, createdAt: m.created_at })))
      setConversationId(id)
    } catch (err) {
      setError(err.message)
    }
  }

  return {
    messages, sending, error, send, newChat,
    conversationId, conversations, loadConversations, openConversation,
  }
}
