import { formatCurrency } from '../lib/colors'

export default function AISuggestion({ proposal, policyResult, originalAmount, finalAmount, discountAmount, state }) {
  if (!proposal || proposal.action === 'no_offer') return null

  const isClamped = policyResult?.violations?.length > 0
  const needsApproval = policyResult?.needs_human_approval

  return (
    <div className={`rounded-xl p-4 mb-4 border ${
      state === 'paid' ? 'bg-approved-light border-approved' :
      state === 'failed' ? 'bg-rejected-light border-rejected' :
      isClamped ? 'bg-clamped-light border-clamped' :
      'bg-ai-proposed-light border-ai-proposed'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">✨</span>
        <span className="text-sm font-bold text-surface-dark">AI Upsell Suggestion</span>
        {isClamped && <span className="text-xs text-clamped font-medium">(Policy Modified)</span>}
        {needsApproval && <span className="text-xs text-clamped font-medium">⏳ Needs Approval</span>}
      </div>

      {/* Discount */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-ai-proposed font-mono">{proposal.discount_pct}% off</span>
        {isClamped && policyResult.final_action?.discount_pct !== proposal.discount_pct && (
          <span className="text-sm text-clamped line-through font-mono">
            → {policyResult.final_action.discount_pct}%
          </span>
        )}
      </div>

      {/* SKUs */}
      <p className="text-xs text-gray-500 mb-1">
        Bundle: {(policyResult?.final_action?.skus || proposal.skus || []).join(', ')}
      </p>

      {/* Reasoning */}
      {proposal.reasoning && (
        <p className="text-xs italic text-gray-500 mb-3 ai-reasoning">"{proposal.reasoning}"</p>
      )}

      {/* Price Breakdown */}
      {originalAmount > 0 && (
        <div className="bg-white rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Original</span>
            <span className="font-mono text-gray-500">{formatCurrency(originalAmount)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-approved">Discount</span>
              <span className="font-mono text-approved">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t pt-1">
            <span className="text-surface-dark">Final</span>
            <span className="font-mono text-surface-dark">{formatCurrency(finalAmount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
