import { Sparkles, ShieldAlert, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '../lib/colors'

export default function AISuggestion({ proposal, policyResult, originalAmount, finalAmount, discountAmount, state }) {
  if (!proposal || proposal.action === 'no_offer') return null

  const isClamped = policyResult?.violations?.length > 0
  const needsApproval = policyResult?.needs_human_approval

  const discountPct = policyResult?.final_action?.discount_pct ?? proposal.discount_pct

  return (
    <div className={`rounded-xl p-4 mb-4 border backdrop-blur-md transition-all duration-300 ${
      state === 'paid'
        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
        : state === 'failed'
        ? 'bg-red-950/40 border-red-500/40 text-red-200'
        : isClamped
        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
        : 'bg-gradient-to-br from-blue-950/70 via-[#0e152a] to-indigo-950/70 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-extrabold tracking-wider uppercase font-mono text-cyan-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          RAZORCAGE AI SUGGESTS
        </span>
        
        {isClamped && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Policy Modified
          </span>
        )}
        {needsApproval && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" /> Needs Approval
          </span>
        )}
      </div>

      {/* Main Discount Title */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-extrabold text-white font-mono">
          {discountPct}% Discount Applied
        </span>
        {isClamped && policyResult?.final_action?.discount_pct !== proposal.discount_pct && (
          <span className="text-xs text-amber-400 line-through font-mono">
            was {proposal.discount_pct}%
          </span>
        )}
      </div>

      {/* Reasoning text box matching user's mockup */}
      {proposal.reasoning && (
        <div className="bg-[#090c16] border border-cyan-500/20 rounded-lg p-2.5 mb-3 font-mono text-[11px] text-cyan-200/90 leading-relaxed italic">
          <span className="text-cyan-400 font-semibold non-italic">reasoning: </span>
          "{proposal.reasoning}"
        </div>
      )}

      {/* Price Breakdown */}
      {originalAmount > 0 && (
        <div className="bg-[#0b0e1a] border border-white/10 rounded-lg p-3 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between items-center text-gray-400">
            <span>Original Price</span>
            <span className={discountAmount > 0 ? 'line-through text-gray-500' : 'text-gray-300'}>
              {formatCurrency(originalAmount)}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-emerald-400">
              <span>AI Savings</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-bold text-white border-t border-white/10 pt-1.5">
            <span>New Price</span>
            <span className="text-cyan-300 font-mono text-base font-extrabold">{formatCurrency(finalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
