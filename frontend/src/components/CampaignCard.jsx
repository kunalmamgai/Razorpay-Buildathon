import useCountdown from '../hooks/useCountdown'

export default function CampaignCard({ campaign, onApprove, onReject }) {
  const statusColor = {
    active: 'bg-approved-light text-approved',
    pending: 'bg-clamped-light text-clamped',
    rejected: 'bg-rejected-light text-rejected',
    draft: 'bg-gray-800 text-gray-400',
  }[campaign.status] || 'bg-gray-800 text-gray-400'

  let targetSkus = []
  try { targetSkus = JSON.parse(campaign.target_skus_json || '[]') } catch {}

  const { hasExpiry, expired, remainingLabel, progressPct } =
    useCountdown(campaign.expires_at, campaign.starts_at)

  return (
    <div className="bg-surface-dark-card border border-surface-dark-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{campaign.name}</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">{campaign.id}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-xs text-gray-500">Discount</p>
          <p className="text-lg font-bold text-ai-proposed font-mono">{campaign.discount_pct}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Target SKUs</p>
          <p className="text-sm text-gray-300">{targetSkus.join(', ') || 'None'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Policy Decision</p>
          <p className="text-sm text-gray-300">{campaign.policy_decision || '—'}</p>
        </div>
      </div>

      {hasExpiry && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Expires in</span>
            <span className={`text-xs font-mono font-medium ${expired ? 'text-rejected' : 'text-clamped'}`}>
              ⏳ {remainingLabel}
            </span>
          </div>
          <div className="h-1.5 w-full bg-surface-dark-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                expired ? 'bg-rejected' : progressPct > 75 ? 'bg-clamped' : 'bg-approved'
              }`}
              style={{ width: `${expired ? 100 : progressPct}%` }}
            ></div>
          </div>
        </div>
      )}

      {campaign.status === 'pending' && (
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            className="flex-1 bg-approved text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition"
          >
            ✓ Approve Campaign
          </button>
          <button
            onClick={onReject}
            className="flex-1 bg-rejected text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition"
          >
            ✕ Reject Campaign
          </button>
        </div>
      )}
    </div>
  )
}
