import { useState, useEffect } from 'react'
import {
  Sparkles, Zap, Receipt, CreditCard, XCircle, Undo2, Bell, Pin,
  AlertTriangle, X,
} from 'lucide-react'
import { fetchOrderLifecycle } from '../api'

const LIFECYCLE_STEPS = [
  { key: 'checkout_proposal', Icon: Sparkles, label: 'AI Proposed' },
  { key: 'cage_decision', Icon: Zap, label: 'Policy Check' },
  { key: 'order_created', Icon: Receipt, label: 'Order Created' },
  { key: 'payment_captured', Icon: CreditCard, label: 'Payment Captured' },
  { key: 'payment_failed', Icon: XCircle, label: 'Payment Failed' },
  { key: 'recovery', Icon: Undo2, label: 'Graceful Recovery' },
  { key: 'payment_webhook', Icon: Bell, label: 'Webhook Update' },
]

export default function FailureRecoveryView({ entry, onClose, onSimulateFailure }) {
  const [lifecycle, setLifecycle] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const orderId = entry.razorpay_order_id
        if (orderId) {
          const data = await fetchOrderLifecycle(orderId)
          setLifecycle(data.entries)
        } else {
          setLifecycle([entry])
        }
      } catch {
        setLifecycle([entry])
      }
      setLoading(false)
    }
    load()
  }, [entry])

  const getStepForEntry = (e) => {
    return LIFECYCLE_STEPS.find(s => s.key === e.event_type) || {
      Icon: Pin,
      label: e.event_type,
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Drawer */}
      <div className="w-full max-w-lg bg-dusk border-l border-dusk-border overflow-y-auto shadow-glow">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold sunrise-text">Order Lifecycle</h2>
              <p className="text-xs text-gray-500 font-mono mt-1">
                {entry.razorpay_order_id || entry.correlation_id}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-dusk-card"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading lifecycle...</p>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-dusk-border"></div>

              {/* Steps */}
              <div className="space-y-6">
                {lifecycle.map((e, i) => {
                  const step = getStepForEntry(e)
                  const isLast = i === lifecycle.length - 1
                  const outcome = e.outcome || 'pending'

                  const dotColor = {
                    approved: 'bg-approved',
                    paid: 'bg-approved',
                    order_created: 'bg-approved',
                    reverted: 'bg-approved',
                    clamped: 'bg-clamped',
                    awaiting_approval: 'bg-clamped',
                    rejected: 'bg-rejected',
                    failed: 'bg-rejected',
                    no_campaign: 'bg-gray-600',
                  }[outcome] || 'bg-gray-600'

                  return (
                    <div key={e.id} className="flex gap-4 relative">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full ${dotColor} flex items-center justify-center z-10 flex-shrink-0`}>
                        <step.Icon className="w-4 h-4 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{step.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            outcome === 'approved' || outcome === 'paid' || outcome === 'reverted' || outcome === 'order_created'
                              ? 'bg-approved-light text-approved'
                              : outcome === 'clamped' || outcome === 'awaiting_approval'
                              ? 'bg-clamped-light text-clamped'
                              : outcome === 'rejected' || outcome === 'failed'
                              ? 'bg-rejected-light text-rejected'
                              : 'bg-gray-800 text-gray-400'
                          }`}>
                            {outcome}
                          </span>
                        </div>

                        <p className="text-xs text-gray-500 font-mono mb-1">{e.timestamp}</p>
                        <p className="text-xs text-gray-400">{e.actor} → {e.trigger}</p>

                        {e.reasoning && (
                          <p className="text-xs italic text-gray-500 mt-1 ai-reasoning">"{e.reasoning}"</p>
                        )}

                        {e.policy_violations_json && (() => {
                          try {
                            const violations = JSON.parse(e.policy_violations_json)
                            if (violations.length > 0) return (
                              <div className="mt-2 bg-clamped-light bg-opacity-10 rounded p-2">
                                {violations.map((v, vi) => (
                                  <p key={vi} className="text-xs text-clamped">• {v}</p>
                                ))}
                              </div>
                            )
                          } catch { return null }
                        })()}

                        {e.error_message && (
                          <p className="text-xs text-rejected mt-1">Error: {e.error_message}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Simulate Failure Button */}
          {entry.razorpay_order_id && (
            <button
              onClick={() => {
                onSimulateFailure(entry.razorpay_order_id)
                onClose()
              }}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-rejected text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition"
            >
              <AlertTriangle className="w-4 h-4" /> Simulate Payment Failure
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
