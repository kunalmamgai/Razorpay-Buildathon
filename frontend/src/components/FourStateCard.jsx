import FourStateStep, { StepConnector } from './FourStateStep'

const STEPS = [
  { key: 'brain', label: 'AI Proposed', icon: 'brain' },
  { key: 'cage', label: 'Policy Check', icon: 'cage' },
  { key: 'gate', label: 'Order', icon: 'gate' },
  { key: 'payment', label: 'Payment', icon: 'payment' },
]

function getStepStatuses(entry) {
  const outcome = entry.outcome || 'pending'
  const decision = entry.policy_decision
  const hasOrder = !!entry.razorpay_order_id
  const hasPayment = !!entry.razorpay_payment_id

  return {
    brain: outcome !== 'pending' ? 'completed' : 'pending',
    cage: decision === 'approved' ? 'completed'
        : decision === 'clamped' ? 'clamped'
        : decision === 'rejected' ? 'rejected'
        : decision === 'awaiting_approval' ? 'pending'
        : 'pending',
    gate: hasOrder ? 'completed' : 'pending',
    payment: hasPayment ? 'completed'
           : outcome === 'paid' ? 'completed'
           : outcome === 'failed' ? 'rejected'
           : 'pending',
  }
}

export default function FourStateCard({ entry, onClick, onSimulateFailure }) {
  const statuses = getStepStatuses(entry)
  const outcome = entry.outcome || 'pending'

  const outcomeColor = {
    approved: 'bg-approved',
    clamped: 'bg-clamped',
    awaiting_approval: 'bg-clamped',
    rejected: 'bg-rejected',
    paid: 'bg-approved',
    failed: 'bg-rejected',
    reverted: 'bg-approved',
    order_created: 'bg-approved',
    no_campaign: 'bg-gray-600',
  }[outcome] || 'bg-gray-600'

  let proposal = {}
  let finalAction = {}
  try { proposal = JSON.parse(entry.proposal_json || '{}') } catch {}
  try { finalAction = JSON.parse(entry.final_action_json || '{}') } catch {}
  let violations = []
  try { violations = JSON.parse(entry.policy_violations_json || '[]') } catch {}

  const violationSummary = violations.length > 0 ? violations.join(' · ') : null

  return (
    <div
      onClick={() => onClick?.(entry)}
      className="bg-dusk-card border border-dusk-border rounded-xl p-4 cursor-pointer hover:border-candy-lavender/60 hover:shadow-glow transition"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${outcomeColor}`}></span>
          <span className="text-xs font-mono text-gray-500">#{entry.id}</span>
          <span className="text-xs text-gray-500">{entry.actor} → {entry.trigger}</span>
        </div>
        <span className="text-xs text-gray-500">{entry.timestamp}</span>
      </div>

      {/* Four-State Step Bar with connectors */}
      <div className="flex items-center mb-3">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1">
            <FourStateStep
              icon={step.icon}
              label={step.label}
              status={statuses[step.key]}
            />
            {i < STEPS.length - 1 && (
              <StepConnector status={statuses[STEPS[i + 1].key]} />
            )}
          </div>
        ))}
      </div>

      {/* Outcome Badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          outcome === 'approved' || outcome === 'paid' || outcome === 'order_created' || outcome === 'reverted'
            ? 'bg-approved-light text-approved'
            : outcome === 'clamped' || outcome === 'awaiting_approval'
            ? 'bg-clamped-light text-clamped'
            : outcome === 'rejected' || outcome === 'failed'
            ? 'bg-rejected-light text-rejected'
            : 'bg-gray-800 text-gray-400'
        }`}>
          {outcome}
        </span>

        <div className="flex items-center gap-2">
          {statuses.cage === 'clamped' && finalAction.discount_pct !== undefined && (
            <span
              className="text-xs font-mono text-clamped cursor-help"
              title={violationSummary ? `Policy clamped: ${violationSummary}` : 'Values clamped by policy engine'}
            >
              <span className="line-through text-gray-500">{proposal.discount_pct}%</span>
              {' → '}{finalAction.discount_pct}%
            </span>
          )}
          {statuses.cage === 'rejected' && violationSummary && (
            <span
              className="text-xs font-mono text-rejected cursor-help"
              title={`Rejected: ${violationSummary}`}
            >
              ⚠ reason
            </span>
          )}
          {proposal.discount_pct > 0 && statuses.cage !== 'clamped' && (
            <span className="text-xs font-mono text-ai-proposed">{proposal.discount_pct}%</span>
          )}
          {entry.razorpay_order_id && (
            <span className="text-xs font-mono text-gray-500">{entry.razorpay_order_id.slice(0, 16)}...</span>
          )}
        </div>
      </div>

      {/* Reasoning (italic) */}
      {entry.reasoning && (
        <p className="text-xs italic text-gray-500 mt-2 ai-reasoning line-clamp-2">"{entry.reasoning}"</p>
      )}
    </div>
  )
}
