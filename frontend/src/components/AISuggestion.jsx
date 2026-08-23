import React from 'react'

/**
 * Blue suggestion chip shown on the Storefront when the AI proposes a bundle.
 * Design-spec: "soft blue suggestion card — visually distinct from static store UI"
 */
export default function AISuggestion({ proposal, onAccept, onDismiss }) {
  if (!proposal || !proposal.discount_pct) return null

  return (
    <div className="border border-ai-proposed/30 bg-ai-proposed/5 rounded-lg p-3 my-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-ai-proposed">✨</span>
        <span className="text-sm font-medium text-ai-proposed">Marlin suggests</span>
      </div>
      <p className="text-sm text-gray-700 mb-2">
        <strong>Bundle & save {proposal.discount_pct}%</strong>
        {proposal.skus && proposal.skus.length > 0 && (
          <span className="text-gray-500 ml-1">on {proposal.skus.join(', ')}</span>
        )}
      </p>
      {proposal.reasoning && (
        <p className="ai-reasoning text-xs mb-2">{proposal.reasoning}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={onAccept}
          className="px-3 py-1 bg-ai-proposed text-white text-xs rounded font-medium hover:bg-blue-600 transition"
        >
          Accept
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded font-medium hover:bg-gray-200 transition"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
