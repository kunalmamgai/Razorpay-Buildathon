import { Flame, Tag } from 'lucide-react'
import { Link } from 'react-router-dom'
import useCountdown from '../hooks/useCountdown'
import { formatCurrency } from '../lib/colors'

function parseSkuList(json) {
  try {
    return JSON.parse(json || '[]')
  } catch {
    return []
  }
}

function DealPill({ campaign, productMap }) {
  const countdown = useCountdown(campaign.expires_at)
  if (countdown.expired) return null

  const skus = parseSkuList(campaign.target_skus_json)
  const names = skus.map(s => productMap[s]?.name || s).slice(0, 2)
  const sub = names.length ? names.join(' · ') : 'Selected SKUs'

  return (
    <Link
      to="/campaigns"
      className="group flex items-center gap-3 bg-[#0e111b] border border-amber-500/30 hover:border-amber-400/60 rounded-xl px-3.5 py-2.5 transition-all shadow-lg shadow-amber-500/5 hover:shadow-amber-500/15 shrink-0"
      title="View in Campaign Orchestrator"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-1 rounded-full whitespace-nowrap">
        <Flame className="w-3 h-3 text-amber-400" />
        -{campaign.discount_pct}%
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-white truncate max-w-[180px] group-hover:text-amber-200 transition-colors">
          {campaign.name}
        </p>
        <p className="text-[10px] text-gray-500 truncate max-w-[180px] font-mono">
          {sub} · ends {countdown.remainingLabel}
        </p>
      </div>
    </Link>
  )
}

/**
 * Horizontal strip of live campaign deals, surfaced on the storefront.
 * Each active campaign that targets catalog SKUs renders a pill with the
 * discount, targeted products and a live countdown. Clicking through to the
 * Campaign Orchestrator tells the demo story: Brain → Cage → Gate → Storefront.
 */
export default function LiveDealsStrip({ campaigns = [], products = [] }) {
  const productMap = Object.fromEntries(products.map(p => [p.id, p]))
  const live = (campaigns || []).filter(c => c.status === 'active')

  if (!live.length) return null

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-2 ledger-scroll -mx-1 px-1">
      <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 shrink-0">
        <Tag className="w-3.5 h-3.5 text-amber-400" />
        Live AI Deals
      </span>
      <div className="flex items-center gap-3 flex-1">
        {live.map(c => (
          <DealPill key={c.id} campaign={c} productMap={productMap} />
        ))}
      </div>
    </div>
  )
}