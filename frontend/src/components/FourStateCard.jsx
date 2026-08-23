import React from 'react'
import FourStateStep from './FourStateStep'
import { getOutcomeColor, getOutcomeLabel } from '../lib/colors'

/**
 * THE core visual component — the Four-State Timeline Card.
 * Renders a horizontal timeline showing: PROPOSED → POLICY CHECK → GATE → OUTCOME
 *
 * Props:
 *   entry - a ledger entry object from the API
 */
export default function FourStateCard({ entry }) {
  if (!entry) return null

  const outcome = entry.outcome || 'pending'
  const proposal = entry.proposal_json ? JSON.parse(entry.proposal_json) : {}
  const finalAction = entry.final_action_json ? JSON.parse(entry.final_action_json) : {}
  const violations = entry.policy_violations ? JSON.parse(entry.policy_violations) : []
  const colors = getOutcomeColor(outcome)

  // Determine step statuses based on outcome
  const proposedStatus = 'active'
  const policyCheckStatus = violations.length > 0 ? 'clamped' : 'completed'
  const gateStatus = outcome === 'awaiting_approval' ? 'active'
    : outcome === 'rejected' ? 'failed'
    : 'completed'
  const outcomeStatus = outcome === 'paid' || outcome === 'approved' ? 'completed'
    : outcome === 'failed' || outcome === 'rejected' ? 'failed'
    : outcome === 'reverted' ? 'failed'
    : 'pending'

  // Format amounts
  const proposedDiscount = proposal.discount_pct ? `${proposal.discount_pct}%` : '—'
  const finalDiscount = finalAction.discount_pct !== undefined ? `${finalAction.discount_pct}%` : '—'
  const wasClamped = proposedDiscount !== finalDiscount && finalAction.discount_pct !== undefined

  // Clamped display: show struck-through original → new value
  const clampedDisplay = wasClamped
    ? <span><span className="line-through text-gray-500">{proposedDiscount}</span> → <span className="text-clamped font-bold">{finalDiscount}</span></span>
    : finalDiscount

  // Format timestamp
  const time = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false }) : ''

  return (
    <div className={`border rounded-lg p-4 mb-3 bg-surface-dark-card border-surface-dark-border hover:border-gray-600 transition`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-400">{time}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${colors.bg} ${colors.text}`}>
            {getOutcomeLabel(outcome)}
          </span>
          {entry.trigger && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-500 bg-gray-800">
              {entry.trigger}
            </span>
          )}
        </div>
        {entry.razorpay_order_id && (
          <span className="font-mono text-[10px] text-gray-500">{entry.razorpay_order_id}</span>
        )}
      </div>

      {/* Four-state timeline */}
      <div className="flex items-start justify-between gap-1">
        {/* PROPOSED */}
        <FourStateStep
          label="Proposed"
          status={proposedStatus}
          icon="✨"
          detail={clampedDisplay}
          subtext={proposal.discount_pct ? `${proposal.discount_pct}%` : ''}
        />

        {/* Connector */}
        <div className="step-connector bg-gray-700 self-center mt-5" />

        {/* POLICY CHECK */}
        <FourStateStep
          label="Policy Check"
          status={policyCheckStatus}
          icon={violations.length > 0 ? '⚡' : '✓'}
          detail={violations.length > 0 ? violations[0].substring(0, 40) : 'Passed'}
          subtext={violations.length > 1 ? `+${violations.length - 1} more` : ''}
        />

        {/* Connector */}
        <div className="step-connector bg-gray-700 self-center mt-5" />

        {/* GATE */}
        <FourStateStep
          label="Gate"
          status={gateStatus}
          icon={outcome === 'awaiting_approval' ? '⏳' : outcome === 'rejected' ? '✗' : '✓'}
          detail={
            outcome === 'awaiting_approval' ? 'Awaiting approval'
            : outcome === 'rejected' ? 'Rejected'
            : 'Auto-approved'
          }
          isActive={outcome === 'awaiting_approval'}
        />

        {/* Connector */}
        <div className="step-connector bg-gray-700 self-center mt-5" />

        {/* OUTCOME */}
        <FourStateStep
          label="Outcome"
          status={outcomeStatus}
          icon={outcome === 'paid' ? '✅' : outcome === 'failed' ? '❌' : outcome === 'reverted' ? '↩' : '...'}
          detail={
            outcome === 'paid' ? 'Payment captured'
            : outcome === 'failed' ? 'Payment failed'
            : outcome === 'reverted' ? 'Reverted to standard'
            : outcome === 'rejected' ? 'No action'
            : 'Pending'
          }
          subtext={entry.razorpay_payment_id || ''}
        />
      </div>

      {/* Reasoning (italic, design-spec §2.3) */}
      {entry.reasoning && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <span className="ai-reasoning text-xs leading-relaxed">
            "{entry.reasoning}"
          </span>
        </div>
      )}
    </div>
  )
}
