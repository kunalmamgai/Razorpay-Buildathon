import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const TOOLTIP_W = 340
const TOOLTIP_MARGIN = 12
const TOOLTIP_APPROX_H = 240

/**
 * Lightweight 4-step coach-mark tour.
 *
 * steps: [{ getEl: () => HTMLElement|null, title, body, action?: { label, onAction } }]
 *  - getEl returns the element to spotlight (or null → tooltip renders centered)
 *  - action renders an extra button inside the tooltip (e.g. "Run review now")
 */
export default function DemoTour({ steps, open, onClose }) {
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)

  const step = Array.isArray(steps) ? steps[idx] : null

  // Reset to first step whenever the tour opens
  useEffect(() => {
    if (open) {
      setIdx(0)
      setRect(null)
    }
  }, [open])

  // Measure + spotlight the current target. Re-runs when steps change identity
  // (e.g. campaigns refreshed mid-tour) so the spotlight follows re-renders.
  useEffect(() => {
    if (!open || !step) return undefined
    const el = typeof step.getEl === 'function' ? step.getEl() : null
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' })
      setRect(el.getBoundingClientRect())
    } else {
      setRect(null)
    }

    const reMeasure = () => {
      const target = typeof step.getEl === 'function' ? step.getEl() : null
      setRect(target ? target.getBoundingClientRect() : null)
    }
    window.addEventListener('resize', reMeasure)
    window.addEventListener('scroll', reMeasure, true)
    return () => {
      window.removeEventListener('resize', reMeasure)
      window.removeEventListener('scroll', reMeasure, true)
    }
  }, [open, idx, steps]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight ring on the target element
  useEffect(() => {
    if (!open || !step) return undefined
    const el = typeof step.getEl === 'function' ? step.getEl() : null
    if (el) el.classList.add('demo-tour-highlight')
    return () => {
      if (el) el.classList.remove('demo-tour-highlight')
    }
  }, [open, idx, steps]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes the tour
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !step) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  let style
  if (rect) {
    const left = Math.min(
      Math.max(TOOLTIP_MARGIN, rect.left + rect.width / 2 - TOOLTIP_W / 2),
      Math.max(TOOLTIP_MARGIN, vw - TOOLTIP_W - TOOLTIP_MARGIN),
    )
    const fitsBelow = rect.bottom + TOOLTIP_MARGIN + TOOLTIP_APPROX_H < vh
    if (fitsBelow) {
      style = { left, top: rect.bottom + TOOLTIP_MARGIN, width: TOOLTIP_W }
    } else {
      style = { left, bottom: vh - rect.top + TOOLTIP_MARGIN, width: TOOLTIP_W }
    }
  } else {
    style = { left: vw / 2 - TOOLTIP_W / 2, top: Math.max(80, vh / 2 - 150), width: TOOLTIP_W }
  }

  const isLast = idx === steps.length - 1

  return (
    <>
      {/* Dim overlay — visual focus only, page stays interactive */}
      <div className="fixed inset-0 bg-black/60 z-40 pointer-events-none transition-opacity duration-200" />

      {/* Tooltip panel */}
      <div
        className="fixed z-50 bg-dusk-card border border-dusk-border rounded-2xl p-5 shadow-candy-lg"
        style={style}
        role="dialog"
        aria-label={step.title}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
            Demo tour · {idx + 1} / {steps.length}
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition"
            aria-label="Close tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-base font-bold text-white mb-1.5">{step.title}</h3>
        <p className="text-xs text-gray-400 leading-relaxed mb-4">{step.body}</p>

        {step.action && (
          <button
            onClick={() => step.action.onAction()}
            disabled={step.action.disabled}
            className="w-full mb-3 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {step.action.label}
          </button>
        )}

        <div className="flex items-center justify-between">
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="text-xs font-semibold text-gray-400 hover:text-white px-3 py-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-default"
          >
            &larr; Back
          </button>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? 'bg-cyan-400' : 'bg-dusk-border'}`}
              />
            ))}
          </div>
          {isLast ? (
            <button
              onClick={onClose}
              className="text-xs font-bold text-white bg-approved hover:bg-green-600 px-4 py-1.5 rounded-lg transition"
            >
              Finish
            </button>
          ) : (
            <button
              onClick={() => setIdx(i => Math.min(steps.length - 1, i + 1))}
              className="text-xs font-bold text-white bg-candy-lavender-deep hover:bg-candy-lavender px-4 py-1.5 rounded-lg transition"
            >
              Next &rarr;
            </button>
          )}
        </div>
      </div>
    </>
  )
}
