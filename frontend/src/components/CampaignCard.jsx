import React from 'react'

export default function CampaignCard({ campaign, onApprove, onReject }) {
  const statusColors = {
    active: 'bg-approved-light text-approved',
    pending: 'bg-clamped-light text-clamped',
    expired: 'bg-gray-100 text-gray-500',
    rejected: 'bg-rejected-light text-rejected',
    draft: 'bg-gray-100 text-gray-500',
  }

  const status = campaign.status || 'draft'
  const skus = campaign.target_skus_json ? JSON.parse(campaign.target_skus_json) : []

  // Calculate time remaining
  let timeRemaining = ''
  if (campaign.expires_at) {
    const diff = new Date(campaign.expires_at) - new Date()
    if (diff > 0) {
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      timeRemaining = `${hours}h ${mins}m`
    } else {
      timeRemaining = 'Expired'
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-surface-dark-card border-surface-dark-border hover:border-gray-600 transition">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-200">{campaign.name}</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${statusColors[status] || statusColors.draft}`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
        <div>
          <span className="text-gray-500">Discount: </span>
          <span className="text-clamped">{campaign.discount_pct}%</span>
        </div>
        <div>
          <span className="text-gray-500">Expires: </span>
          <span className="text-gray-300">{timeRemaining || '—'}</span>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-[10px] text-gray-500 uppercase">Target SKUs</span>
        <div className="flex gap-1 mt-1">
          {skus.map(sku => (
            <span key={sku} className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded text-[10px] font-mono">
              {sku}
            </span>
          ))}
        </div>
      </div>

      {status === 'pending' && onApprove && onReject && (
        <div className="flex gap-2 pt-2 border-t border-gray-800">
          <button
            onClick={() => onApprove(campaign.id)}
            className="flex-1 px-3 py-1.5 bg-approved text-white text-xs rounded font-medium hover:opacity-90 transition"
          >
            Approve
          </button>
          <button
            onClick={() => onReject(campaign.id)}
            className="flex-1 px-3 py-1.5 bg-rejected text-white text-xs rounded font-medium hover:opacity-90 transition"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
