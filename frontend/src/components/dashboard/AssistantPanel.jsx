import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Sparkles, X, ArrowUp, Bot, CheckCircle2, AlertCircle, History, SquarePen, ChevronLeft,
} from 'lucide-react'
import { useAssistant } from '../../hooks/useAssistant'
import { formatCurrency } from '../../lib/currency'

function formatMessageTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatConversationTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const isToday = date.toDateString() === new Date().toDateString()
  return isToday
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const SUGGESTIONS = [
  'Show all unpaid invoices',
  "What's my profit this month?",
  "What's my top customer's balance?",
]

// The model replies with light markdown (**bold**, line breaks, and
// sometimes a table for list-y answers) — this renders just that, not a
// full markdown parser, since that's all it uses.
function renderInlineBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  ))
}

const isTableRow = (line) => /^\s*\|.*\|\s*$/.test(line)
// A separator row is only |, -, :, and whitespace, e.g. "| :--- | --- |".
const isSeparatorRow = (line) => /^[\s|:-]+$/.test(line) && line.includes('-')

function parseTableRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

// Groups the message into alternating text/table blocks — a markdown
// table is a header row, a "| :--- | ---: |"-style separator row, then
// one or more data rows, all starting/ending with "|".
function renderMessageText(text) {
  const lines = text.split('\n')
  const blocks = []
  let textBuffer = []
  const flushText = () => {
    if (textBuffer.length > 0) blocks.push({ type: 'text', lines: textBuffer })
    textBuffer = []
  }

  for (let i = 0; i < lines.length; i += 1) {
    if (isTableRow(lines[i]) && isSeparatorRow(lines[i + 1] || '')) {
      flushText()
      const header = parseTableRow(lines[i])
      const rows = []
      i += 2
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(parseTableRow(lines[i]))
        i += 1
      }
      i -= 1
      blocks.push({ type: 'table', header, rows })
    } else {
      textBuffer.push(lines[i])
    }
  }
  flushText()

  return blocks.map((block, bi) => {
    if (block.type === 'table') {
      return (
        <div key={bi} className="-mx-1 my-1.5 overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-xs">
            <thead>
              <tr className="border-b border-ink-400/20">
                {block.header.map((cell, ci) => (
                  <th key={ci} className="px-2 py-1 text-left font-semibold text-ink-700">{renderInlineBold(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-ink-400/10 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 align-top text-ink-700">{renderInlineBold(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    return (
      <span key={bi}>
        {block.lines.map((line, li) => (
          <span key={li}>
            {renderInlineBold(line)}
            {li < block.lines.length - 1 && <br />}
          </span>
        ))}
      </span>
    )
  })
}

function actionLabel(action) {
  if (action.tool === 'create_invoice') return `Created invoice ${action.reference} — ${formatCurrency(action.total_amount)}`
  if (action.tool === 'create_sales_receipt') return `Created receipt ${action.reference} — ${formatCurrency(action.total_amount)}`
  if (action.tool === 'create_purchase') return `Created bill ${action.reference} — ${formatCurrency(action.total_amount)}`
  if (action.tool === 'receive_payment') return `Recorded ${formatCurrency(action.amount)} received from ${action.customer}`
  if (action.tool === 'pay_bill') return `Recorded ${formatCurrency(action.amount)} paid to ${action.supplier}`
  if (action.tool === 'create_customer') return `Added customer ${action.name}${action.code ? ` (${action.code})` : ''}`
  if (action.tool === 'create_supplier') return `Added supplier ${action.name}`
  return action.tool
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('chat')
  const [input, setInput] = useState('')
  const {
    messages, sending, error, send, newChat,
    conversationId, conversations, loadConversations, openConversation,
  } = useAssistant()
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const submit = (text) => {
    const value = (text ?? input).trim()
    if (!value) return
    setInput('')
    send(value)
  }

  const showHistory = () => {
    setView('history')
    loadConversations()
  }

  const selectConversation = async (id) => {
    setView('chat')
    await openConversation(id)
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open assistant"
        className="fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-clay-500 text-cream-50 shadow-xl shadow-clay-500/30 hover:bg-clay-600 sm:right-6 print:hidden"
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-40 flex h-[32rem] max-h-[calc(100vh-7rem)] w-[23rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[20px] border border-ink-400/15 bg-cream-50 shadow-2xl sm:right-6 print:hidden"
          >
            <div className="flex items-center gap-3 border-b border-ink-400/10 px-4 py-3.5">
              {view === 'history' ? (
                <>
                  <button
                    onClick={() => setView('chat')}
                    aria-label="Back to chat"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-900/5"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <p className="flex-1 text-[15px] font-bold text-ink-900">Conversations</p>
                </>
              ) : (
                <>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-900 text-cream-50">
                    <Bot size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-ink-900">Assistant</p>
                    <p className="text-xs text-ink-400">Ask about your customers, sales & profit</p>
                  </div>
                  <button
                    onClick={showHistory}
                    aria-label="Past conversations"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-900/5 hover:text-clay-600"
                  >
                    <History size={16} />
                  </button>
                  {(messages.length > 0 || conversationId) && (
                    <button
                      onClick={newChat}
                      aria-label="New chat"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-400 hover:bg-ink-900/5 hover:text-clay-600"
                    >
                      <SquarePen size={16} />
                    </button>
                  )}
                </>
              )}
            </div>

            {view === 'history' ? (
              <div className="flex-1 overflow-y-auto px-2 py-2">
                {conversations.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-ink-400">
                    <History size={22} className="mb-2 opacity-50" />
                    <p className="text-sm">No past conversations yet</p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectConversation(c.id)}
                      className={`block w-full rounded-xl px-3 py-2.5 text-left hover:bg-ink-900/5 ${c.id === conversationId ? 'bg-ink-900/5' : ''}`}
                    >
                      <p className="truncate text-sm font-medium text-ink-800">{c.title || 'New conversation'}</p>
                      <p className="text-xs text-ink-400">{formatConversationTime(c.updated_at)}</p>
                    </button>
                  ))
                )}
              </div>
            ) : (
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
                    <Sparkles size={18} />
                  </span>
                  <p className="mt-3 text-sm font-medium text-ink-600">
                    What do you need done?
                  </p>
                  <div className="mt-4 flex flex-col gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="rounded-full border border-ink-400/20 px-3 py-1.5 text-xs text-ink-600 hover:border-clay-500 hover:text-clay-600"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => {
                  const isUser = m.role === 'user'
                  const grouped = messages[i - 1]?.role === m.role
                  return (
                    <div
                      key={i}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-1' : 'mt-3.5'} first:mt-0`}
                    >
                      <div className="max-w-[85%]">
                        <div
                          className={`px-4 py-3 text-sm leading-relaxed ${
                            isUser
                              ? 'rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-md bg-ink-900 text-cream-50'
                              : 'rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md bg-cream-200 text-ink-800'
                          }`}
                        >
                          {renderMessageText(m.text)}
                        </div>
                        {m.actions?.length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {m.actions.map((a, ai) => (
                              <div
                                key={ai}
                                className="flex items-center gap-1.5 rounded-lg bg-clay-500/10 px-2.5 py-1.5 text-xs text-clay-700"
                              >
                                <CheckCircle2 size={12} className="shrink-0" />
                                {actionLabel(a)}
                              </div>
                            ))}
                          </div>
                        )}
                        {m.createdAt && (
                          <p className={`mt-1 text-[11px] text-ink-400 ${isUser ? 'text-right' : 'text-left'}`}>
                            {formatMessageTime(m.createdAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {sending && (
                <div className="mt-3.5 flex justify-start">
                  <div className="flex gap-1 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-md bg-cream-200 px-4 py-3.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-ink-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
            )}

            {view === 'chat' && (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    submit()
                  }}
                  className="border-t border-ink-400/10 px-4 py-3"
                >
                  <div className="flex items-end gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message…"
                      disabled={sending}
                      className="flex-1 bg-transparent py-1.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      aria-label="Send"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-500 text-cream-50 transition-colors hover:bg-clay-600 disabled:opacity-40"
                    >
                      <ArrowUp size={17} />
                    </button>
                  </div>
                </form>

                <p className="border-t border-ink-400/10 py-2 text-center text-[11px] text-ink-400/70">
                  Powered by BossBooks AI
                </p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
