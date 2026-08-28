import { useState, useEffect } from 'react'
import {
  Sparkles, Zap, Receipt, CreditCard, Check, X, AlertTriangle, Info, Clock, ChevronRight
} from 'lucide-react'
import { fetchApprovals, approveProposal, rejectProposal } from '../api'

const MOCK_APPROVALS = [
  {
    id: '9928-ALPHA',
    tier: 'ENTERPRISE',
    timestamp: '14 mins ago',
    ai_proposed_pct: '22.5%',
    ai_proposed_value: '-$4,500.00',
    post_policy_pct: '15.0%',
    post_policy_value: '-$3,000.00',
    reasoning: 'Client engagement history suggests high churn risk without aggressive intervention. Recommend overriding standard tier limits to secure annual renewal contract.',
    flags: ["Max discount for 'Enterprise Tier 2' exceeded (Limit: 15%)"],
  },
  {
    id: '8814-BETA',
    tier: 'VOLUME BUNDLE',
    timestamp: '32 mins ago',
    ai_proposed_pct: '30.0%',
    ai_proposed_value: '-$1,200.00',
    post_policy_pct: '20.0%',
    post_policy_value: '-$800.00',
    reasoning: 'High conversion probability on 500+ unit order attempt. Autonomous agent requested margin threshold exception.',
    flags: ["Max discount for 'Bulk Accessories' exceeded (Limit: 20%)"],
  },
]

export default function ApprovalPanel({ selectedApproval, onSelectApproval }) {
  const [approvals, setApprovals] = useState(MOCK_APPROVALS)
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await fetchApprovals()
      if (data.approvals && data.approvals.length > 0) {
        const mapped = data.approvals.map(entry => {
          let proposal = {}
          let finalAction = {}
          let violations = []
          try { proposal = JSON.parse(entry.proposal_json || '{}') } catch {}
          try { finalAction = JSON.parse(entry.final_action_json || '{}') } catch {}
          try { violations = JSON.parse(entry.policy_violations_json || '[]') } catch {}

          return {
            id: entry.id || '9928-ALPHA',
            raw_id: entry.id,
            tier: 'ENTERPRISE',
            timestamp: entry.timestamp || '14 mins ago',
            ai_proposed_pct: `${proposal.discount_pct || 22.5}%`,
            ai_proposed_value: '-$4,500.00',
            post_policy_pct: `${finalAction.discount_pct || 15.0}%`,
            post_policy_value: '-$3,000.00',
            reasoning: entry.reasoning || proposal.reasoning || 'Client engagement history suggests high churn risk without aggressive intervention.',
            flags: violations.length > 0 ? violations : ["Max discount for 'Enterprise Tier 2' exceeded (Limit: 15%)"],
          }
        })
        setApprovals(mapped)
      }
    } catch (e) {
      console.error('Failed to fetch approvals:', e)
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const handleApprove = async (id) => {
    try {
      await approveProposal(id)
      setApprovals(prev => prev.filter(a => a.id !== id && a.raw_id !== id))
    } catch (e) {
      setApprovals(prev => prev.filter(a => a.id !== id))
    }
  }

  const handleReject = async (id) => {
    try {
      await rejectProposal(id)
      setApprovals(prev => prev.filter(a => a.id !== id && a.raw_id !== id))
    } catch (e) {
      setApprovals(prev => prev.filter(a => a.id !== id))
    }
  }

  return (
    <div className="space-y-6 font-sans">
      {approvals.map(item => (
        <div
          key={item.id}
          className="bg-[#0e111b] border border-[#1b1f32] hover:border-amber-500/30 rounded-2xl p-6 shadow-xl transition-all duration-300 relative"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-extrabold text-white">
                REQ- <span className="text-gray-300">{item.id}</span>
              </span>
              <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                {item.tier}
              </span>
              <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-400" /> {item.timestamp}
              </span>
            </div>

            {/* Stepper Pipeline Mini Nodes */}
            <div className="flex items-center gap-1.5 bg-[#121625] border border-white/5 px-3 py-1.5 rounded-full shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-[10px]">
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="w-4 h-[2px] bg-amber-500/50" />
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-[10px]">
                <Zap className="w-3 h-3" />
              </div>
              <div className="w-4 h-[2px] bg-gray-800" />
              <div className="w-6 h-6 rounded-full bg-gray-900 text-gray-600 border border-gray-800 flex items-center justify-center text-[10px]">
                <Receipt className="w-3 h-3" />
              </div>
              <div className="w-4 h-[2px] bg-gray-800" />
              <div className="w-6 h-6 rounded-full bg-gray-900 text-gray-600 border border-gray-800 flex items-center justify-center text-[10px]">
                <CreditCard className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Main Card Body */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
            
            {/* Left Proposed vs Policy Stats Box */}
            <div className="lg:col-span-4 bg-[#121625]/80 border border-white/5 rounded-xl p-4 flex items-center justify-between font-mono">
              <div className="pr-4 border-r border-white/10 flex-1">
                <span className="text-[10px] uppercase text-gray-400 font-semibold block mb-1">
                  AI Proposed
                </span>
                <p className="text-xl font-extrabold text-blue-400">{item.ai_proposed_pct}</p>
                <p className="text-xs text-gray-400">{item.ai_proposed_value}</p>
              </div>

              <div className="pl-4 flex-1">
                <span className="text-[10px] uppercase text-gray-400 font-semibold block mb-1">
                  Post-Policy
                </span>
                <p className="text-xl font-extrabold text-amber-400">{item.post_policy_pct}</p>
                <p className="text-xs text-gray-400">{item.post_policy_value}</p>
              </div>
            </div>

            {/* Right Reasoning & Policy Flags Column */}
            <div className="lg:col-span-8 space-y-3">
              {/* Cyan Blue Callout Box */}
              <div className="bg-[#0f172a]/80 border border-blue-500/30 rounded-xl p-3.5 text-xs text-cyan-200 italic font-sans flex items-start gap-2.5 shadow-inner">
                <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 rotate-180" />
                <p className="leading-relaxed">{item.reasoning}</p>
              </div>

              {/* Policy Flags Box */}
              <div className="bg-[#1c1612] border border-amber-500/30 rounded-xl p-3 text-xs font-mono space-y-1">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Policy Flags ({item.flags.length})
                </span>
                {item.flags.map((flag, idx) => (
                  <p key={idx} className="text-amber-200/90 text-[11px] pl-5">
                    • {flag}
                  </p>
                ))}
              </div>
            </div>

          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 font-mono text-xs">
            <button
              onClick={() => onSelectApproval?.(item)}
              className="flex items-center gap-1.5 bg-[#121625] border border-white/10 hover:border-gray-600 text-gray-300 px-4 py-2 rounded-xl transition"
            >
              <Info className="w-3.5 h-3.5" /> Details
            </button>

            <button
              onClick={() => handleReject(item.id)}
              className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/30 hover:bg-rose-900/60 text-rose-300 px-4 py-2 rounded-xl transition"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>

            <button
              onClick={() => handleApprove(item.id)}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" /> Approve Override
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
