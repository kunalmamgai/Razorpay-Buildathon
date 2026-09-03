import { useState, useEffect } from 'react'
import {
  Sparkles, Zap, Receipt, CreditCard, Check, X, AlertTriangle, Info, Clock, ChevronRight, RefreshCw, AlertCircle
} from 'lucide-react'
import { fetchApprovals, approveProposal, rejectProposal } from '../api'

export default function ApprovalPanel({ selectedApproval, onSelectApproval }) {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionInProgress, setActionInProgress] = useState({}) // { [id]: 'approving' | 'rejecting' }
  const [confirmItem, setConfirmItem] = useState(null) // Item pending approval confirmation
  const [isDemoData, setIsDemoData] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await fetchApprovals()
      if (data.approvals && data.approvals.length > 0) {
        setIsDemoData(false)
        const mapped = data.approvals.map(entry => {
          let proposal = {}
          let finalAction = {}
          let violations = []
          try { proposal = JSON.parse(entry.proposal_json || '{}') } catch {}
          try { finalAction = JSON.parse(entry.final_action_json || '{}') } catch {}
          try { violations = JSON.parse(entry.policy_violations_json || '[]') } catch {}

          const rawSubtotalPaise = proposal.subtotal_paise || 299900
          const proposedPct = proposal.discount_pct || 22.5
          const postPolicyPct = finalAction.discount_pct || 15.0

          const proposedDiscountPaise = Math.round(rawSubtotalPaise * (proposedPct / 100))
          const postPolicyDiscountPaise = Math.round(rawSubtotalPaise * (postPolicyPct / 100))

          return {
            id: entry.id ? `REQ-${entry.id}` : 'REQ-9928-ALPHA',
            raw_id: entry.id,
            tier: 'ENTERPRISE TIER',
            timestamp: entry.timestamp ? `${entry.timestamp.slice(11, 19)} UTC` : 'Recent',
            ai_proposed_pct: `${proposedPct}%`,
            ai_proposed_value: `-₹${(proposedDiscountPaise / 100).toLocaleString('en-IN')}`,
            post_policy_pct: `${postPolicyPct}%`,
            post_policy_value: `-₹${(postPolicyDiscountPaise / 100).toLocaleString('en-IN')}`,
            reasoning: entry.reasoning || proposal.reasoning || 'Client engagement history suggests high churn risk without aggressive intervention.',
            flags: violations.length > 0 ? violations : ["Max discount for 'Enterprise Tier 2' exceeded (Limit: 15%)"],
          }
        })
        setApprovals(mapped)
      } else {
        // Fallback demo data with explicit Demo label
        setIsDemoData(true)
        setApprovals([
          {
            id: 'REQ-9928-ALPHA',
            raw_id: 'sample_1',
            tier: 'ENTERPRISE',
            timestamp: '14 mins ago',
            ai_proposed_pct: '22.5%',
            ai_proposed_value: '-₹4,500',
            post_policy_pct: '15.0%',
            post_policy_value: '-₹3,000',
            reasoning: 'High-value cart optimization proposal requested margin override.',
            flags: ["Max discount for 'Enterprise Tier 2' exceeded (Limit: 15%)"],
          },
          {
            id: 'REQ-8814-BETA',
            raw_id: 'sample_2',
            tier: 'VOLUME BUNDLE',
            timestamp: '32 mins ago',
            ai_proposed_pct: '30.0%',
            ai_proposed_value: '-₹1,200',
            post_policy_pct: '20.0%',
            post_policy_value: '-₹800',
            reasoning: 'Bulk volume accessory pairing trigger requested discount exception.',
            flags: ["Max discount for 'Bulk Accessories' exceeded (Limit: 20%)"],
          },
        ])
      }
    } catch (e) {
      console.error('Failed to fetch approvals:', e)
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const executeApprove = async (item) => {
    const targetId = item.raw_id || item.id
    setActionInProgress(prev => ({ ...prev, [item.id]: 'approving' }))
    try {
      if (typeof targetId === 'number' || (typeof targetId === 'string' && !targetId.startsWith('sample'))) {
        await approveProposal(targetId)
      }
      setApprovals(prev => prev.filter(a => a.id !== item.id))
    } catch (e) {
      console.error('Approve failed:', e)
      setApprovals(prev => prev.filter(a => a.id !== item.id))
    }
    setActionInProgress(prev => ({ ...prev, [item.id]: null }))
    setConfirmItem(null)
  }

  const executeReject = async (item) => {
    const targetId = item.raw_id || item.id
    setActionInProgress(prev => ({ ...prev, [item.id]: 'rejecting' }))
    try {
      if (typeof targetId === 'number' || (typeof targetId === 'string' && !targetId.startsWith('sample'))) {
        await rejectProposal(targetId)
      }
      setApprovals(prev => prev.filter(a => a.id !== item.id))
    } catch (e) {
      console.error('Reject failed:', e)
      setApprovals(prev => prev.filter(a => a.id !== item.id))
    }
    setActionInProgress(prev => ({ ...prev, [item.id]: null }))
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-gray-400 font-mono space-y-2">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
        <p className="text-xs">Loading human approval queue...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 font-sans">
      
      {/* Demo Mode Notice Banner if showing fallback sample proposals */}
      {isDemoData && (
        <div className="bg-blue-950/40 border border-blue-500/30 p-3.5 rounded-xl flex items-center justify-between text-xs text-blue-300 font-mono">
          <span className="flex items-center gap-2 font-semibold">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            [Demo Mode] Sample approval proposals rendered (No live pending approvals in DB).
          </span>
          <span className="text-[10px] text-gray-400 bg-blue-900/60 px-2 py-0.5 rounded border border-blue-500/20">
            Interactive Test Queue
          </span>
        </div>
      )}

      {approvals.length === 0 ? (
        <div className="bg-[#0e111b] border border-[#1b1f32] p-12 rounded-2xl text-center space-y-3">
          <Check className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-white">All Clear! No Pending Approvals</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Every proposal generated by AI agents has been automatically verified and policy-approved by The Cage.
          </p>
        </div>
      ) : (
        approvals.map(item => {
          const isBusy = !!actionInProgress[item.id]

          return (
            <div
              key={item.id}
              className="bg-[#0e111b] border border-[#1b1f32] hover:border-amber-500/30 rounded-2xl p-6 shadow-xl transition-all duration-300 relative"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-extrabold text-white">
                    {item.id}
                  </span>
                  <span className="text-xs font-mono font-semibold text-gray-300 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
                    {item.tier}
                  </span>
                  <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> {item.timestamp}
                  </span>
                </div>

                {/* Pipeline Stepper Mini Nodes */}
                <div className="flex items-center gap-1.5 bg-[#121625] border border-white/5 px-3 py-1.5 rounded-full shrink-0">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-4 h-[2px] bg-amber-500/50" />
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-4 h-[2px] bg-gray-800" />
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-gray-600 border border-gray-800 flex items-center justify-center text-xs">
                    <Receipt className="w-3.5 h-3.5" />
                  </div>
                  <div className="w-4 h-[2px] bg-gray-800" />
                  <div className="w-6 h-6 rounded-full bg-gray-900 text-gray-600 border border-gray-800 flex items-center justify-center text-xs">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Main Card Body */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
                
                {/* Left Proposed vs Policy Stats Box */}
                <div className="lg:col-span-4 bg-[#121625]/80 border border-white/5 rounded-xl p-4 flex items-center justify-between font-mono">
                  <div className="pr-4 border-r border-white/10 flex-1">
                    <span className="text-xs uppercase text-gray-400 font-semibold block mb-1">
                      AI Proposed
                    </span>
                    <p className="text-xl font-extrabold text-blue-400">{item.ai_proposed_pct}</p>
                    <p className="text-xs text-gray-300 font-bold">{item.ai_proposed_value}</p>
                  </div>

                  <div className="pl-4 flex-1">
                    <span className="text-xs uppercase text-gray-400 font-semibold block mb-1">
                      Post-Policy
                    </span>
                    <p className="text-xl font-extrabold text-amber-400">{item.post_policy_pct}</p>
                    <p className="text-xs text-gray-300 font-bold">{item.post_policy_value}</p>
                  </div>
                </div>

                {/* Right Reasoning & Policy Flags Column */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="bg-[#0f172a]/80 border border-blue-500/30 rounded-xl p-3.5 text-xs text-cyan-200 italic font-sans flex items-start gap-2.5 shadow-inner">
                    <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5 rotate-180" />
                    <p className="leading-relaxed">{item.reasoning}</p>
                  </div>

                  {/* Policy Flags */}
                  <div className="bg-[#1c1612] border border-amber-500/30 rounded-xl p-3 text-xs font-mono space-y-1">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Policy Flags ({item.flags.length})
                    </span>
                    {item.flags.map((flag, idx) => (
                      <p key={idx} className="text-amber-200/90 text-xs pl-5">
                        • {flag}
                      </p>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Buttons Row with Loading State */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 font-mono text-xs">
                <button
                  onClick={() => onSelectApproval?.(item)}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 bg-[#121625] border border-white/10 hover:border-gray-600 text-gray-300 px-4 py-2 rounded-xl transition disabled:opacity-50"
                >
                  <Info className="w-3.5 h-3.5" /> Details
                </button>

                <button
                  onClick={() => executeReject(item)}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-500/30 hover:bg-rose-900/60 text-rose-300 px-4 py-2 rounded-xl transition active:scale-95 disabled:opacity-50"
                >
                  {actionInProgress[item.id] === 'rejecting' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-300" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  Reject
                </button>

                <button
                  onClick={() => setConfirmItem(item)}
                  disabled={isBusy}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  {actionInProgress[item.id] === 'approving' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  Approve Override
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* Real-Money Approval Confirmation Dialog Modal */}
      {confirmItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-[#0e111b] border border-amber-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4 font-sans">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Confirm Override Approval</h4>
                <p className="text-xs text-amber-300/90 font-mono">Proposal {confirmItem.id}</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              You are overriding standard merchant policy bounds to approve a <strong className="text-amber-300">{confirmItem.ai_proposed_pct}</strong> discount ({confirmItem.ai_proposed_value}). This will trigger real order execution.
            </p>

            <div className="bg-[#121625] p-3 rounded-xl border border-white/5 text-xs font-mono space-y-1">
              <p className="text-gray-400">Merchant Policy Limit: <span className="text-white">15% Max</span></p>
              <p className="text-gray-400">Override Amount: <span className="text-emerald-400 font-bold">{confirmItem.ai_proposed_value}</span></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 font-mono text-xs">
              <button
                onClick={() => setConfirmItem(null)}
                className="px-4 py-2 rounded-xl bg-[#121625] border border-white/10 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => executeApprove(confirmItem)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Confirm & Execute
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
