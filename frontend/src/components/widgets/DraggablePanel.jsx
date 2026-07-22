import { useRef, useState } from 'react'
import { motion, useDragControls, AnimatePresence } from 'framer-motion'
import { GripHorizontal, Minus, X } from 'lucide-react'

// Shared chrome for the floating utility widgets (sticky notes, calculator):
// draggable by its title bar, resizable from a bottom-right handle,
// collapsible to just the title bar, closable. Position is drag (x/y
// transform, framer-motion — already a dependency, no new library needed);
// size is plain React state applied as inline width/height so the two don't
// fight each other.
export default function DraggablePanel({
  open,
  onClose,
  title,
  icon: Icon,
  accentClassName = 'bg-clay-500 text-cream-50',
  defaultPosition = { top: 90, right: 24 },
  defaultSize = { width: 320, height: 420 },
  minSize = { width: 260, height: 220 },
  resizable = true,
  footer,
  children,
}) {
  const dragControls = useDragControls()
  const [collapsed, setCollapsed] = useState(false)
  const [size, setSize] = useState(defaultSize)
  const panelRef = useRef(null)

  const startResize = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const startWidth = size.width
    const startHeight = size.height

    const onMove = (moveEvent) => {
      const nextWidth = Math.max(minSize.width, startWidth + (moveEvent.clientX - startX))
      const nextHeight = Math.max(minSize.height, startHeight + (moveEvent.clientY - startY))
      setSize({ width: nextWidth, height: nextHeight })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{
            top: defaultPosition.top,
            right: defaultPosition.right,
            width: size.width,
            height: collapsed ? 'auto' : size.height,
          }}
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-ink-400/15 bg-cream-50 shadow-2xl print:hidden"
        >
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className={`flex shrink-0 cursor-grab items-center justify-between gap-2 px-3.5 py-2.5 active:cursor-grabbing ${accentClassName}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <GripHorizontal size={14} className="shrink-0 opacity-60" />
              {Icon && <Icon size={15} className="shrink-0" />}
              <span className="truncate text-sm font-semibold">{title}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expand' : 'Collapse'}
                className="rounded-full p-1 opacity-80 transition-opacity hover:bg-white/15 hover:opacity-100"
              >
                <Minus size={14} />
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-1 opacity-80 transition-opacity hover:bg-white/15 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!collapsed && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              {footer && <div className="shrink-0 border-t border-ink-400/10">{footer}</div>}
              {resizable && (
                <div
                  onPointerDown={startResize}
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
                >
                  <svg viewBox="0 0 16 16" className="h-full w-full text-ink-400/40">
                    <path d="M14 2 2 14M14 8 8 14M14 14v0" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
