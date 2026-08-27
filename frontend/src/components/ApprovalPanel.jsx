import { useState, useEffect } from 'react'
import { Hourglass, CheckCircle2, Check, X } from 'lucide-react'
import { fetchApprovals, approveProposal, rejectProposal } from '../api'

export default function ApprovalPanel() {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await fetchApprovals()
      setApprovals(data.approvals)
    } catch (e) {
      console.error('Failed to fetch approvals:', e)
    }
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  const handleApprove = async (ledgerId) => {
    try {
      await approveProposal(ledgerId)
      refresh()
    } catch (e) {
      alert(`Approval failed: ${e.message}`)
    }
  }

  const handleReject = async (ledgerId) => {
    try {
      await rejectProposal(ledgerId)
      refresh()
    } catch (e) {
      alert(`Rejection failed: ${e.message}`)
    }
  }

  if (loading) return <p className="text-gray-400 text-center py-8">Loading approvals...</p>

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-8 h-8 text-approved mx-auto mb-3" />
        <p className="text-gray-300 text-lg mb-1">All Clear</p>
        <p className="text-gray-500 text-sm">No proposals awaiting merchant approval.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {approvals.map(entry => {
        let proposal = {}
        let finalAction = {}
        try { proposal = JSON.parse(entry.proposal_json || '{}') } catch {}
        try { finalAction = JSON.parse(entry.final_action_json || '{}') } catch {}
        const violations = (() => { try { return JSON.parse(entry.policy_violations_json || '[]') } catch { return [] } })()

        return (
          <div key={entry.id} className="bg-dusk-card border border-dusk-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs font-mono text-gray-500">#{entry.id}</span>
                <span className="text-xs text-clamped ml-2 inline-flex items-center gap-1">
                  <Hourglass className="w-3 h-3 pulse-active" /> Awaiting Approval
                </span>
              </div>
              <span className="text-xs text-gray-500">{entry.timestamp}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Proposed Discount</p>
                <p className="text-lg font-bold text-ai-proposed font-mono">{proposal.discount_pct || 0}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">After Policy Check</p>
                <p className="text-lg font-bold text-clamped font-mono">{finalAction.discount_pct || 0}%</p>
              </div>
            </div>

            {proposal.reasoning && (
              <p className="text-sm italic text-gray-400 mb-3 ai-reasoning">"{proposal.reasoning}"</p>
            )}

            {violations.length > 0 && (
              <div className="bg-clamped-light bg-opacity-10 rounded-lg p-3 mb-3">
                <p className="text-xs text-clamped font-medium mb-1">Policy Violations:</p>
                {violations.map((v, i) => (
                  <p key={i} className="text-xs text-gray-400">• {v}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleApprove(entry.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-approved text-white py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition"
              >
                <Check className="w-4 h-4" /> Approve
              </button>
              <button
                onClick={() => handleReject(entry.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rejected text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition"
              >
                <X className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
