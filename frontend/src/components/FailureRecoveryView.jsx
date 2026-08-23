import React, { useState, useEffect } from 'react'
import { fetchOrderLifecycle } from '../api'
import { getOutcomeColor, getOutcomeLabel } from '../lib/colors'

/**
 * FailureRecoveryView — vertical stepper showing the full lifecycle of a failed order.
 *
 * Design-spec §4.4:
 *   "Full lifecycle of one order shown as a vertical stepper:
 *    Proposed → Clamped → Order Created → Payment Attempted → Failed → Reverted to standard price.
 *    The failure step rendered in red; the recovery step immediately after in green —
 *    this contrast is the visual punchline that proves graceful failure handling."
 *
 * Props:
 *   orderId   - Razorpay order ID to fetch lifecycle for
 *   onClose   - callback to close the drawer
 */
export default function FailureRecoveryView({ orderId, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!orderId) return
    setLoading(true)
    fetchOrderLifecycle(orderId)
      .then(data => setEntries(data.entries || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [orderId])

  // Build lifecycle steps from ledger entries
  const steps = buildLifecycleSteps(entries)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-surface-dark border-l border-surface-dark-border z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-surface-dark border-b border-surface-dark-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Order Lifecycle</h2>
            <span className="text-xs font-mono text-gray-500">{orderId}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-dark-card border border-surface-dark-border text-gray-400 hover:text-white hover:border-gray-500 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading lifecycle...</div>
          ) : error ? (
            <div className="text-center text-rejected py-12">{error}</div>
          ) : steps.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No lifecycle data found.</div>
          ) : (
            <div className="relative">
              {/* Vertical stepper */}
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-700" />

              {steps.map((step, index) => (
                <StepperStep
                  key={index}
                  step={step}
                  isLast={index === steps.length - 1}
                />
              ))}
            </div>
          )}

          {/* Summary footer */}
          {steps.length > 0 && !loading && (
            <div className="mt-8 p-4 rounded-lg bg-surface-dark-card border border-surface-dark-border">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
              <div className="space-y-2 text-xs font-mono">
                {entries.length > 0 && entries[0].reasoning && (
                  <div>
                    <span className="text-gray-500">AI Reasoning: </span>
                    <span className="text-gray-300 italic">"{entries[0].reasoning}"</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Total entries: </span>
                  <span className="text-gray-300">{entries.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Final state: </span>
                  <span className={getOutcomeColor(steps[steps.length - 1]?.outcome || '').text}>
                    {getOutcomeLabel(steps[steps.length - 1]?.outcome || '')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}


/**
 * A single step in the vertical lifecycle stepper.
 */
function StepperStep({ step, isLast }) {
  const colorMap = {
    completed: { ring: 'ring-approved', bg: 'bg-approved', text: 'text-approved', border: 'border-approved' },
    active:    { ring: 'ring-ai-proposed', bg: 'bg-ai-proposed', text: 'text-ai-proposed', border: 'border-ai-proposed' },
    clamped:   { ring: 'ring-clamped', bg: 'bg-clamped', text: 'text-clamped', border: 'border-clamped' },
    failed:    { ring: 'ring-rejected', bg: 'bg-rejected', text: 'text-rejected', border: 'border-rejected' },
    recovery:  { ring: 'ring-approved', bg: 'bg-approved', text: 'text-approved', border: 'border-approved' },
    pending:   { ring: 'ring-gray-500', bg: 'bg-gray-600', text: 'text-gray-400', border: 'border-gray-600' },
  }

  const colors = colorMap[step.status] || colorMap.pending

  return (
    <div className={`relative flex items-start gap-4 pb-8 ${isLast ? 'pb-0' : ''}`}>
      {/* Circle node */}
      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${colors.border} bg-surface-dark shrink-0`}>
        <span className={`text-base ${colors.text}`}>{step.icon}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        {/* Label + timestamp */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-semibold ${colors.text}`}>{step.label}</span>
          {step.timestamp && (
            <span className="text-[10px] font-mono text-gray-500">{step.timestamp}</span>
          )}
          {step.badge && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${colors.bg}/20 ${colors.text}`}>
              {step.badge}
            </span>
          )}
        </div>

        {/* Detail text */}
        <p className="text-xs text-gray-300 leading-relaxed">{step.detail}</p>

        {/* Strikethrough for clamped values */}
        {step.strikethrough && (
          <p className="text-xs font-mono mt-1">
            <span className="line-through text-gray-500">{step.strikethrough.original}</span>
            <span className="text-gray-400 mx-1">→</span>
            <span className={colors.text}>{step.strikethrough.final}</span>
          </p>
        )}

        {/* Subtext (reasoning, payment ID) */}
        {step.subtext && (
          <p className="text-[10px] text-gray-500 italic mt-1">{step.subtext}</p>
        )}

        {/* Violations list */}
        {step.violations && step.violations.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {step.violations.map((v, i) => (
              <p key={i} className="text-[10px] font-mono text-clamped">⚡ {v}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


/**
 * Build lifecycle steps from ledger entries.
 *
 * Each entry contributes one or more steps to the vertical timeline.
 * The order of steps follows the design-spec lifecycle:
 *   Proposed → Policy Check → Order Created → Payment Attempted → Failed → Reverted
 */
function buildLifecycleSteps(entries) {
  if (!entries || entries.length === 0) return []

  const steps = []

  for (const entry of entries) {
    const proposal = entry.proposal_json ? safeParse(entry.proposal_json) : {}
    const finalAction = entry.final_action_json ? safeParse(entry.final_action_json) : {}
    const violations = entry.policy_violations ? safeParse(entry.policy_violations) : []
    const outcome = entry.outcome || 'pending'
    const time = entry.timestamp
      ? new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })
      : ''

    // 1. PROPOSED — from the checkout entry
    if (entry.trigger === 'checkout' && entry.actor === 'brain') {
      steps.push({
        label: 'AI Proposed',
        icon: '✨',
        status: 'active',
        detail: proposal.reasoning || 'Agent proposed an upsell discount.',
        timestamp: time,
        badge: proposal.discount_pct ? `${proposal.discount_pct}% off` : null,
        strikethrough: (proposal.discount_pct && finalAction.discount_pct !== proposal.discount_pct)
          ? { original: `${proposal.discount_pct}%`, final: `${finalAction.discount_pct}%` }
          : null,
      })

      // 2. POLICY CHECK — if there were violations
      if (violations.length > 0) {
        steps.push({
          label: 'Policy Check',
          icon: '⚡',
          status: 'clamped',
          detail: `Cage clamped the proposal. ${violations.length} violation(s) detected.`,
          timestamp: time,
          violations: violations,
          strikethrough: null,
        })
      } else {
        steps.push({
          label: 'Policy Check',
          icon: '✓',
          status: 'completed',
          detail: 'Proposal passed all policy checks.',
          timestamp: time,
        })
      }

      // 3. ORDER CREATED
      steps.push({
        label: 'Order Created',
        icon: '📋',
        status: 'completed',
        detail: `Razorpay order created. Final amount: ₹${((finalAction.final_amount || 0) / 100).toLocaleString('en-IN') || formatPaise(finalAction, proposal)}`,
        timestamp: time,
        badge: entry.razorpay_order_id ? entry.razorpay_order_id.substring(0, 16) + '...' : null,
      })
    }

    // 4. PAYMENT ATTEMPTED — from webhook entries
    if (entry.trigger === 'webhook' && entry.actor === 'razorpay') {
      if (outcome === 'paid') {
        steps.push({
          label: 'Payment Captured',
          icon: '💳',
          status: 'completed',
          detail: 'Razorpay confirmed payment capture.',
          timestamp: time,
          badge: 'PAID',
          subtext: entry.razorpay_payment_id || null,
        })
      } else if (outcome === 'failed') {
        // THE FAILURE — rendered in red (design-spec: "failure step rendered in red")
        steps.push({
          label: 'Payment Failed',
          icon: '❌',
          status: 'failed',
          detail: 'Razorpay reported payment failure. The discount that was applied must now be reverted.',
          timestamp: time,
          badge: 'FAILED',
          subtext: entry.razorpay_payment_id || entry.reasoning || null,
        })
      }
    }

    // 5. RECOVERY — from system recovery entries
    if (entry.trigger === 'recovery' && entry.actor === 'system') {
      // THE RECOVERY — rendered in green (design-spec: "recovery step immediately after in green")
      steps.push({
        label: 'Graceful Recovery',
        icon: '↩️',
        status: 'recovery',
        detail: 'Agent detected the failure and reverted to standard price. No retry with discount was attempted.',
        timestamp: time,
        badge: 'REVERTED',
        subtext: entry.reasoning || null,
      })
    }
  }

  return steps
}


function safeParse(json) {
  try { return JSON.parse(json) } catch { return {} }
}

function formatPaise(finalAction, proposal) {
  // Fallback formatting
  const pct = finalAction.discount_pct || proposal.discount_pct || 0
  return `${pct}% off`
}
