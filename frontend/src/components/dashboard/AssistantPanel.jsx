import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, X, Send, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAssistant } from '../../hooks/useAssistant'
import { formatCurrency } from '../../lib/currency'

const SUGGESTIONS = [
  'Show all unpaid invoices',
  'Create a sales receipt',
  "What's my top customer's balance?",
]

function actionLabel(action) {
  if (action.tool === 'create_invoice') return `Created invoice ${action.reference} — ${formatCurrency(action.total_amount)}`
  if (action.tool === 'create_sales_receipt') return `Created receipt ${action.reference} — ${formatCurrency(action.total_amount)}`
  if (action.tool === 'create_purchase') return `Created bill ${action.reference} — ${formatCurrency(action.total_amount)}`
  if (action.tool === 'receive_payment') return `Recorded ${formatCurrency(action.amount)} received from ${action.customer}`
  if (action.tool === 'pay_bill') return `Recorded ${formatCurrency(action.amount)} paid to ${action.supplier}`
  return action.tool
}

export default function AssistantPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const { messages, sending, error, send, clear } = useAssistant()
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

  return (
    <>
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open assistant"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-clay-500 text-cream-50 shadow-xl shadow-clay-500/30 hover:bg-clay-600 print:hidden"
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
            className="fixed bottom-24 right-6 z-40 flex h-[32rem] w-[23rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-ink-400/15 bg-cream-50 shadow-2xl print:hidden"
          >
            <div className="flex items-center justify-between border-b border-ink-400/10 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500/10 text-clay-600">
                  <Bot size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">Assistant</p>
                  <p className="text-[11px] text-ink-400">Ask it to create or find things</p>
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clear}
                  className="text-xs font-medium text-ink-400 hover:text-clay-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
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
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex max-w-[85%] items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          m.role === 'user' ? 'bg-ink-900/10 text-ink-700' : 'bg-clay-500/10 text-clay-600'
                        }`}
                      >
                        {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                      </span>
                      <div>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-clay-500 text-cream-50'
                              : 'bg-cream-200 text-ink-800'
                          }`}
                        >
                          {m.text}
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
                      </div>
                    </div>
                  </div>
                ))
              )}

              {sending && (
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-clay-500/10 text-clay-600">
                    <Bot size={12} />
                  </span>
                  <div className="flex gap-1 rounded-2xl bg-cream-200 px-3.5 py-3">
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
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
              className="flex items-center gap-2 border-t border-ink-400/10 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Create an invoice for..."
                disabled={sending}
                className="flex-1 rounded-full border border-ink-400/20 bg-cream-100 px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-500 text-cream-50 transition-colors hover:bg-clay-600 disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
