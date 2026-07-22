import { useEffect, useReducer, useRef, useState } from 'react'
import { Calculator, Copy, Check, ArrowDownToLine } from 'lucide-react'
import DraggablePanel from './DraggablePanel'
import { calculatorReducer, initialCalculatorState } from '../../lib/calculatorEngine'

const KEY_TO_OPERATOR = { '+': '+', '-': '-', '*': '×', '/': '÷' }

function setReactInputValue(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

export default function CalculatorWidget({ open, onClose }) {
  const [state, dispatch] = useReducer(calculatorReducer, initialCalculatorState)
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)
  const lastResultRef = useRef(null)
  const lastFocusedInputRef = useRef(null)

  // Best-effort "insert into field" — remembers the last plain <input> that
  // had focus anywhere in the app (not just while the calculator is open),
  // so the result can be dropped back into it.
  useEffect(() => {
    const onFocusIn = (e) => {
      const el = e.target
      if (el instanceof HTMLInputElement && (el.type === 'number' || el.type === 'text')) {
        lastFocusedInputRef.current = el
      }
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  useEffect(() => {
    if (state.lastResult && state.lastResult !== lastResultRef.current) {
      lastResultRef.current = state.lastResult
      setHistory((prev) => [state.lastResult, ...prev].slice(0, 10))
    }
  }, [state.lastResult])

  // Keyboard input, only while open, and only when the user isn't typing
  // into some other field on the page — this is a floating utility, not a
  // page-wide shortcut, so it must never hijack normal form typing.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      const active = document.activeElement
      const isTyping = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName)
      if (isTyping) return

      if (/^[0-9]$/.test(e.key)) { dispatch({ type: 'digit', digit: e.key }); e.preventDefault(); return }
      if (e.key === '.') { dispatch({ type: 'decimal' }); e.preventDefault(); return }
      if (KEY_TO_OPERATOR[e.key]) { dispatch({ type: 'operator', operator: KEY_TO_OPERATOR[e.key] }); e.preventDefault(); return }
      if (e.key === 'Enter' || e.key === '=') { dispatch({ type: 'equals' }); e.preventDefault(); return }
      if (e.key === 'Backspace') { dispatch({ type: 'backspace' }); e.preventDefault(); return }
      if (e.key === 'Escape') { dispatch({ type: 'clear' }); e.preventDefault(); return }
      if (e.key === '%') { dispatch({ type: 'percent' }); e.preventDefault() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(state.display)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard permission denied or unavailable — nothing to fall back
      // to, just skip the confirmation state.
    }
  }

  const canInsert = lastFocusedInputRef.current?.isConnected
  const handleInsert = () => {
    const el = lastFocusedInputRef.current
    if (!el || !el.isConnected) return
    setReactInputValue(el, state.display)
    el.focus()
  }

  const buttons = [
    { label: 'MC', action: () => dispatch({ type: 'memoryClear' }), variant: 'mem' },
    { label: 'MR', action: () => dispatch({ type: 'memoryRecall' }), variant: 'mem' },
    { label: 'M+', action: () => dispatch({ type: 'memoryAdd' }), variant: 'mem' },
    { label: 'M-', action: () => dispatch({ type: 'memorySubtract' }), variant: 'mem' },
    { label: 'C', action: () => dispatch({ type: 'clear' }), variant: 'func' },
    { label: '⌫', action: () => dispatch({ type: 'backspace' }), variant: 'func' },
    { label: '%', action: () => dispatch({ type: 'percent' }), variant: 'func' },
    { label: '÷', action: () => dispatch({ type: 'operator', operator: '÷' }), variant: 'op' },
    { label: '7', action: () => dispatch({ type: 'digit', digit: '7' }) },
    { label: '8', action: () => dispatch({ type: 'digit', digit: '8' }) },
    { label: '9', action: () => dispatch({ type: 'digit', digit: '9' }) },
    { label: '×', action: () => dispatch({ type: 'operator', operator: '×' }), variant: 'op' },
    { label: '4', action: () => dispatch({ type: 'digit', digit: '4' }) },
    { label: '5', action: () => dispatch({ type: 'digit', digit: '5' }) },
    { label: '6', action: () => dispatch({ type: 'digit', digit: '6' }) },
    { label: '-', action: () => dispatch({ type: 'operator', operator: '-' }), variant: 'op' },
    { label: '1', action: () => dispatch({ type: 'digit', digit: '1' }) },
    { label: '2', action: () => dispatch({ type: 'digit', digit: '2' }) },
    { label: '3', action: () => dispatch({ type: 'digit', digit: '3' }) },
    { label: '+', action: () => dispatch({ type: 'operator', operator: '+' }), variant: 'op' },
    { label: '√', action: () => dispatch({ type: 'sqrt' }), variant: 'func' },
    { label: '0', action: () => dispatch({ type: 'digit', digit: '0' }) },
    { label: '.', action: () => dispatch({ type: 'decimal' }) },
    { label: '=', action: () => dispatch({ type: 'equals' }), variant: 'equals' },
  ]

  const btnClass = (variant) => {
    if (variant === 'equals') return 'bg-clay-500 text-cream-50 hover:bg-clay-600'
    if (variant === 'op') return 'bg-cream-200 text-clay-600 hover:bg-cream-300'
    if (variant === 'mem') return 'bg-cream-100 text-ink-500 text-xs hover:bg-cream-200'
    if (variant === 'func') return 'bg-cream-200 text-ink-700 hover:bg-cream-300'
    return 'bg-cream-50 text-ink-900 hover:bg-cream-200'
  }

  return (
    <DraggablePanel
      open={open}
      onClose={onClose}
      title="Calculator"
      icon={Calculator}
      accentClassName="bg-ink-900 text-cream-50"
      defaultPosition={{ top: 100, right: 96 }}
      defaultSize={{ width: 300, height: 480 }}
      minSize={{ width: 280, height: 400 }}
      resizable
    >
      <div className="flex h-full flex-col">
        {history.length > 0 && (
          <div className="max-h-24 shrink-0 overflow-y-auto border-b border-ink-400/10 px-3 py-2">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => dispatch({ type: 'setDisplay', value: h.result })}
                className="block w-full truncate rounded px-1.5 py-0.5 text-right text-xs text-ink-400 hover:bg-cream-200 hover:text-ink-700"
              >
                {h.expression} = <span className="font-medium text-ink-600">{h.result}</span>
              </button>
            ))}
          </div>
        )}

        <div className="shrink-0 px-4 py-4">
          <div className="flex items-center justify-between text-xs text-ink-400">
            <span>{state.memory !== 0 ? 'M' : ''}</span>
            <span>{state.operator ? `${state.previousValue} ${state.operator}` : ''}</span>
          </div>
          <p className="mt-1 truncate text-right font-heading text-3xl font-semibold text-ink-900">
            {state.display}
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border border-ink-400/20 px-2 py-1 text-[11px] font-medium text-ink-500 hover:border-clay-500 hover:text-clay-600"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
            </button>
            {canInsert && (
              <button
                onClick={handleInsert}
                className="flex items-center gap-1 rounded-lg border border-ink-400/20 px-2 py-1 text-[11px] font-medium text-ink-500 hover:border-clay-500 hover:text-clay-600"
              >
                <ArrowDownToLine size={11} /> Insert
              </button>
            )}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-4 gap-1.5 px-3 pb-3">
          {buttons.map((b) => (
            <button
              key={b.label}
              onClick={b.action}
              className={`rounded-xl text-sm font-semibold transition-colors ${btnClass(b.variant)}`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </DraggablePanel>
  )
}
