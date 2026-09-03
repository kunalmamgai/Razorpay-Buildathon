import { Sparkles, Zap, Receipt, CreditCard, X } from 'lucide-react'

function getStepStatuses(entry) {
  const outcome = entry.outcome || 'pending'
  const decision = entry.policy_decision
  const hasOrder = !!entry.razorpay_order_id
  const hasPayment = !!entry.razorpay_payment_id || outcome === 'paid'

  return {
    brain: outcome !== 'pending' ? 'completed' : 'pending',
    cage: decision === 'approved' || outcome === 'approved' || outcome === 'paid' ? 'approved'
        : decision === 'clamped' || outcome === 'clamped' ? 'clamped'
        : decision === 'rejected' || outcome === 'rejected' ? 'rejected'
        : decision === 'awaiting_approval' ? 'clamped'
        : 'pending',
    gate: hasOrder || outcome === 'order_created' || outcome === 'paid' ? 'completed' : 'pending',
    payment: hasPayment ? 'completed'
           : outcome === 'failed' ? 'rejected'
           : 'pending',
  }
}

function getAgentName(entry) {
  if (entry.actor && entry.actor.includes('Agent')) return entry.actor
  if (entry.actor && entry.actor !== 'system') return `Agent: ${entry.actor}`
  return 'Agent: Promo-Orchestrator'
}

function getTxId(entry) {
  if (entry.id) return `TX-${String(entry.id).padStart(4, '0')}`
  return 'TX-0001'
}

function getNarrativeText(entry, proposal, finalAction, violations) {
  const outcome = entry.outcome || 'pending'
  const discountPct = finalAction.discount_pct ?? proposal.discount_pct ?? 15
  const rawDiscount = proposal.discount_pct ?? discountPct
  const reasoning = entry.reasoning || proposal.reasoning || 'Automated checkout incentive'

  if (outcome === 'clamped') {
    return (
      <span className="text-xs sm:text-sm text-gray-200 font-normal leading-relaxed">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 inline mr-1 -mt-0.5" />
        <span>Agent proposed <span className="text-cyan-300 font-mono italic">{rawDiscount}%</span> discount ({reasoning})</span>
        <span className="text-gray-400"> → </span>
        <span className="text-amber-300 font-semibold">Policy capped to <span className="font-mono">{discountPct}%</span></span>
        <span className="text-gray-400"> → </span>
        <span className="text-emerald-300 font-semibold">Order created & payment captured.</span>
      </span>
    )
  }

  if (outcome === 'rejected' || outcome === 'failed') {
    const reasonText = violations.length > 0 ? violations[0] : (entry.error_message || 'Policy max discount limit exceeded')
    return (
      <span className="text-xs sm:text-sm text-gray-200 font-normal leading-relaxed">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 inline mr-1 -mt-0.5" />
        <span>Agent proposed <span className="text-cyan-300 font-mono italic">{rawDiscount}%</span> discount ({reasoning})</span>
        <span className="text-gray-400"> → </span>
        <span className="text-rose-400 font-bold">Policy rejected</span> <span className="text-gray-300">({reasonText})</span>.
      </span>
    )
  }

  return (
    <span className="text-xs sm:text-sm text-gray-200 font-normal leading-relaxed">
      <Sparkles className="w-3.5 h-3.5 text-cyan-400 inline mr-1 -mt-0.5" />
      <span>Agent proposed <span className="text-cyan-300 font-mono italic">{discountPct}%</span> discount offer ({reasoning})</span>
      <span className="text-gray-400"> → </span>
      <span className="text-emerald-300 font-semibold">Policy approved</span>
      <span className="text-gray-400"> → </span>
      <span className="text-emerald-400 font-semibold">Order created & payment captured.</span>
    </span>
  )
}

export default function FourStateCard({ entry, onClick }) {
  const statuses = getStepStatuses(entry)
  const agentName = getAgentName(entry)
  const txId = getTxId(entry)

  let proposal = {}
  let finalAction = {}
  let violations = []
  try { proposal = JSON.parse(entry.proposal_json || '{}') } catch {}
  try { finalAction = JSON.parse(entry.final_action_json || '{}') } catch {}
  try { violations = JSON.parse(entry.policy_violations_json || '[]') } catch {}

  const timeString = entry.timestamp ? `${entry.timestamp.slice(11, 19)} UTC` : 'Just now'

  return (
    <div
      onClick={() => onClick?.(entry)}
      className="bg-[#0e111b] border border-[#1b1f32] hover:border-cyan-500/40 rounded-2xl p-5 transition-all duration-300 shadow-xl group cursor-pointer"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-gray-300 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
            {txId}
          </span>
          <span className="text-xs font-semibold text-blue-300 bg-blue-950/60 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-mono">
            {agentName}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400">
            {timeString}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClick?.(entry) }}
            className="text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 px-3 py-1 rounded-lg transition"
          >
            Details
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
        
        {/* Pipeline Stepper Nodes */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-full bg-blue-500/15 border-2 border-blue-400 flex items-center justify-center text-blue-300 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className={`h-[2px] w-6 ${statuses.cage === 'rejected' ? 'bg-rose-500/60' : statuses.cage === 'clamped' ? 'bg-amber-500/60' : 'bg-emerald-500/60'}`} />

          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
            statuses.cage === 'rejected'
              ? 'bg-rose-500/15 border-rose-400 text-rose-400'
              : statuses.cage === 'clamped'
              ? 'bg-amber-500/15 border-amber-400 text-amber-300'
              : 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
          }`}>
            {statuses.cage === 'rejected' ? <X className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>

          <div className={`h-[2px] w-6 ${statuses.gate === 'completed' ? 'bg-emerald-500/60' : 'bg-gray-800'}`} />

          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
            statuses.gate === 'completed'
              ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
              : 'bg-gray-900 border-gray-800 text-gray-600'
          }`}>
            <Receipt className="w-4 h-4" />
          </div>

          <div className={`h-[2px] w-6 ${statuses.payment === 'completed' ? 'bg-emerald-500/60' : 'bg-gray-800'}`} />

          <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center ${
            statuses.payment === 'completed'
              ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
              : 'bg-gray-900 border-gray-800 text-gray-600'
          }`}>
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="flex-1 bg-[#121625]/60 border border-white/5 rounded-xl p-3.5">
          {getNarrativeText(entry, proposal, finalAction, violations)}
        </div>

      </div>
    </div>
  )
}
