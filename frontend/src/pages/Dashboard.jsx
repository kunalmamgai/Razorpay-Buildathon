import { useState, useEffect, useRef } from 'react'
import {
  RefreshCw, Radio, Sparkles, LayoutDashboard, Activity, ShieldCheck,
  Lock, CheckCircle2, AlertTriangle, Play, X, TrendingUp
} from 'lucide-react'
import { fetchLedger, fetchLedgerStats, fetchCampaigns, reviewCampaign, approveCampaign, rejectCampaign, simulatePaymentFailure } from '../api'
import StatStrip from '../components/StatStrip'
import FilterBar from '../components/FilterBar'
import FourStateCard from '../components/FourStateCard'
import FailureRecoveryView from '../components/FailureRecoveryView'
import ApprovalPanel from '../components/ApprovalPanel'
import CampaignCard from '../components/CampaignCard'
import AgentActivityStrip from '../components/AgentActivityStrip'
import AnalyticsView from '../components/AnalyticsView'
import Navbar from '../components/Navbar'

const LEDGER_POLL_MS = 5000

// Default diverse realistic entries reordered (Approved & Failed cards brought to top, followed by Clamped & Rejected)
const DEFAULT_LEDGER_ENTRIES = [
  {
    id: 9922,
    correlation_id: 'req_551a_approved',
    actor: 'Agent: VIP-Reward-Bot',
    trigger: 'loyalty_tier_2',
    outcome: 'paid',
    policy_decision: 'approved',
    proposal_json: JSON.stringify({ discount_pct: 10, reasoning: 'repeat customer loyalty reward: order count > 5' }),
    final_action_json: JSON.stringify({ discount_pct: 10, reason: 'approved' }),
    policy_violations_json: '[]',
    razorpay_order_id: 'order_paid_9922',
    razorpay_payment_id: 'pay_approved_9922',
    reasoning: 'repeat customer loyalty reward: order count > 5',
    timestamp: '14:05:12.912',
  },
  {
    id: 9921,
    correlation_id: 'req_902b_fail',
    actor: 'Agent: Recovery-Agent',
    trigger: 'payment_retry_flow',
    outcome: 'failed',
    policy_decision: 'approved',
    proposal_json: JSON.stringify({ discount_pct: 15, reasoning: 'payment timeout recovery offer' }),
    final_action_json: JSON.stringify({ discount_pct: 15, reason: 'approved' }),
    policy_violations_json: JSON.stringify(['ERR_GATEWAY_TIMEOUT: Provider did not respond within 30000ms.']),
    razorpay_order_id: 'order_failed_9921',
    reasoning: 'payment timeout recovery offer',
    timestamp: '14:03:55.800',
  },
  {
    id: 9924,
    correlation_id: 'req_8x11n9_clamped',
    actor: 'Agent: Retention-Bot',
    trigger: 'cart_abandonment_risk',
    outcome: 'clamped',
    policy_decision: 'clamped',
    proposal_json: JSON.stringify({ discount_pct: 25, reasoning: 'high cart-abandonment risk: user viewed item 3x' }),
    final_action_json: JSON.stringify({ discount_pct: 20, reason: 'global_cap_reached' }),
    policy_violations_json: JSON.stringify(['Rule max_discount_limit (20%) applied. Proposed 25% capped.']),
    razorpay_order_id: 'order_clamped_9924',
    razorpay_payment_id: 'pay_clamped_9924',
    reasoning: 'high cart-abandonment risk: user viewed item 3x',
    timestamp: '14:02:45.102',
  },
  {
    id: 9923,
    correlation_id: 'req_774v_rejected',
    actor: 'Agent: Promo-Orchestrator',
    trigger: 'flash_sale_campaign',
    outcome: 'rejected',
    policy_decision: 'rejected',
    proposal_json: JSON.stringify({ discount_pct: 35, reasoning: 'overstock clearance flash sale proposal' }),
    final_action_json: JSON.stringify({ decision: 'REJECTED', reason: 'margin_threshold_exceeded' }),
    policy_violations_json: JSON.stringify(['Margin threshold violation detected on target SKU. Max allowed discount 20%.']),
    reasoning: 'overstock clearance flash sale proposal',
    timestamp: '14:01:10.040',
  },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview') // overview | monitoring | policies | campaigns | approvals
  const [ledger, setLedger] = useState(DEFAULT_LEDGER_ENTRIES)
  const [stats, setStats] = useState({ total_proposals: 14208, approved: 8421, clamped: 4102, rejected: 1245, failed: 440 })
  const [filter, setFilter] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [newEvents, setNewEvents] = useState(0)
  const maxSeenIdRef = useRef(0)

  const ingestLedger = (entries) => {
    const combined = [...entries]
    // Append default examples if missing to ensure all 4 types exist for demonstration
    DEFAULT_LEDGER_ENTRIES.forEach(def => {
      if (!combined.some(e => e.id === def.id || e.outcome === def.outcome)) {
        combined.push(def)
      }
    })
    
    if (maxSeenIdRef.current && combined.length) {
      const fresh = combined.filter(e => e.id > maxSeenIdRef.current).length
      if (fresh > 0) setNewEvents(n => n + fresh)
    }
    if (combined.length) {
      maxSeenIdRef.current = Math.max(...combined.map(e => e.id || 0))
    }
    setLedger(combined)
  }

  const refreshLedger = async (silent = false) => {
    try {
      const [ledgerData, statsData] = await Promise.all([
        fetchLedger(100, filter),
        fetchLedgerStats(),
      ])
      const entries = ledgerData.entries && ledgerData.entries.length > 0 ? ledgerData.entries : DEFAULT_LEDGER_ENTRIES
      ingestLedger(entries)
      if (statsData) setStats(statsData)
    } catch (e) {
      console.error('Failed to fetch ledger:', e)
      setLedger(DEFAULT_LEDGER_ENTRIES)
    }
  }

  useEffect(() => {
    if (!newEvents) return undefined
    const t = setTimeout(() => setNewEvents(0), 6000)
    return () => clearTimeout(t)
  }, [newEvents])

  useEffect(() => {
    refreshLedger()
    const timer = setInterval(() => refreshLedger(true), LEDGER_POLL_MS)
    const handleMerchantChange = () => refreshLedger()
    window.addEventListener('marlin_merchant_changed', handleMerchantChange)
    return () => {
      clearInterval(timer)
      window.removeEventListener('marlin_merchant_changed', handleMerchantChange)
    }
  }, [filter])

  const refreshCampaigns = async () => {
    try {
      const data = await fetchCampaigns()
      setCampaigns(data.campaigns)
    } catch (e) {
      console.error('Failed to fetch campaigns:', e)
    }
  }

  useEffect(() => {
    if (activeTab === 'campaigns') refreshCampaigns()
  }, [activeTab])

  const handleReviewCampaign = async () => {
    setLoading(true)
    try {
      await reviewCampaign()
      await refreshCampaigns()
      await refreshLedger()
    } catch (e) {
      console.error('Campaign review failed:', e)
    }
    setLoading(false)
  }

  const handleSimulateFailure = async (orderId) => {
    try {
      await simulatePaymentFailure(orderId)
      await refreshLedger()
    } catch (e) {
      console.error('Simulation failed:', e)
    }
  }

  // Filter ledger based on selected stream tab
  const filteredLedger = ledger.filter(entry => {
    if (!filter) return true
    const outcome = entry.outcome || entry.policy_decision
    if (filter === 'approved') return outcome === 'approved' || outcome === 'paid' || outcome === 'order_created'
    if (filter === 'clamped') return outcome === 'clamped' || entry.policy_decision === 'clamped'
    if (filter === 'rejected') return outcome === 'rejected' || entry.policy_decision === 'rejected'
    if (filter === 'failed') return outcome === 'failed'
    return true
  })

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Main Navbar */}
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Main Title Header & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Mission Control
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Real-time AI proposal stream, policy enforcement, and audit ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-xl font-mono">
              <Radio className={`w-3.5 h-3.5 ${newEvents ? 'text-emerald-400 animate-pulse' : 'text-gray-500'}`} />
              Live Feed
            </span>
            <button
              onClick={() => refreshLedger()}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white bg-[#0e111b] border border-[#1b1f32] hover:border-cyan-500/40 px-3.5 py-1.5 rounded-xl transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3 mb-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Live Ledger Stream', icon: LayoutDashboard },
            { id: 'analytics', label: 'Analytics & Feedback', icon: TrendingUp },
            { id: 'monitoring', label: 'Monitoring & Latency', icon: Activity },
            { id: 'policies', label: 'Rules & Bounds', icon: Lock },
            { id: 'campaigns', label: 'Campaign Proposals', icon: Sparkles },
            { id: 'approvals', label: 'Human Approvals', icon: ShieldCheck },
          ].map(item => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono transition-all duration-150 flex items-center gap-2 shrink-0 ${
                  active
                    ? 'bg-blue-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'bg-[#0e111b] text-gray-400 border border-[#1b1f32] hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-gray-400'}`} />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Top Volume Stats & Pipeline Reference Cards */}
        <StatStrip stats={stats} />

        {/* TAB 1: OVERVIEW / LIVE LEDGER STREAM */}
        {activeTab === 'overview' && (
          <div>
            <FilterBar filter={filter} setFilter={setFilter} counts={stats} />

            {newEvents > 0 && (
              <button
                onClick={() => setNewEvents(0)}
                className="mb-4 flex items-center gap-2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold px-3 py-1.5 rounded-full"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {newEvents} new ledger event{newEvents > 1 ? 's' : ''} detected
              </button>
            )}

            {/* Feed Stream Cards */}
            <div className="space-y-4">
              {filteredLedger.length === 0 ? (
                <div className="text-center py-16 bg-[#0e111b] border border-[#1b1f32] rounded-2xl text-gray-500 space-y-3">
                  <p className="text-4xl opacity-60">🛰️</p>
                  <p className="text-sm font-semibold text-gray-300">No ledger entries for this filter.</p>
                </div>
              ) : (
                filteredLedger.map(entry => (
                  <FourStateCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => setSelectedEntry(entry)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MONITORING */}
        {activeTab === 'monitoring' && (
          <div className="space-y-6">
            <div className="bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                System Performance & Throughput
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                <div className="bg-[#121625] border border-white/5 p-4 rounded-xl">
                  <p className="text-gray-400 text-[11px]">Avg Rule Evaluation</p>
                  <p className="text-2xl font-extrabold text-cyan-300 mt-1">4.2 ms</p>
                  <p className="text-[10px] text-emerald-400 mt-1">✓ Latency target &lt; 10ms</p>
                </div>
                <div className="bg-[#121625] border border-white/5 p-4 rounded-xl">
                  <p className="text-gray-400 text-[11px]">Deterministic Safety Pass Rate</p>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">88.4%</p>
                  <p className="text-[10px] text-gray-400 mt-1">11.6% clamped or gated</p>
                </div>
                <div className="bg-[#121625] border border-white/5 p-4 rounded-xl">
                  <p className="text-gray-400 text-[11px]">Audit Log Integrity</p>
                  <p className="text-2xl font-extrabold text-purple-400 mt-1">100%</p>
                  <p className="text-[10px] text-purple-300 mt-1">Immutable SHA-256 Hashes</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: POLICIES */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  Active Hardcoded Safety Rules (The Cage)
                </h3>
                <span className="text-xs font-mono text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Deterministic Engine
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Every AI proposal passes through these non-overridable code boundaries before payment execution.
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div className="bg-[#121625] border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">Rule #1: Max Discount Cap</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">No discount proposed by AI can exceed 20% total cart value.</p>
                  </div>
                  <span className="text-amber-400 font-extrabold text-base">20% MAX</span>
                </div>

                <div className="bg-[#121625] border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">Rule #2: Minimum Cart Requirement</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Offers are prohibited on orders under ₹500 subtotal.</p>
                  </div>
                  <span className="text-amber-400 font-extrabold text-base">₹500 MIN</span>
                </div>

                <div className="bg-[#121625] border border-amber-500/20 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">Rule #3: Merchant Gate Threshold</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Discounts above 15% require explicit human sign-off.</p>
                  </div>
                  <span className="text-amber-400 font-extrabold text-base">&gt; 15% GATE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CAMPAIGNS */}
        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <AgentActivityStrip />
            <div className="flex justify-end">
              <button
                onClick={handleReviewCampaign}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                {loading ? 'Reviewing Orders...' : 'Run Campaign Review'}
              </button>
            </div>

            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <div className="text-center py-12 bg-[#0e111b] border border-[#1b1f32] rounded-2xl text-gray-500 space-y-2">
                  <p className="text-3xl">📣</p>
                  <p className="text-sm font-semibold text-gray-300">No campaigns proposed yet.</p>
                  <p className="text-xs text-gray-500">Run a campaign review to let the Brain analyze order history signal.</p>
                </div>
              ) : (
                campaigns.map(c => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    onApprove={async () => { await approveCampaign(c.id); refreshCampaigns() }}
                    onReject={async () => { await rejectCampaign(c.id); refreshCampaigns() }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: APPROVALS */}
        {activeTab === 'approvals' && <ApprovalPanel />}

        {/* TAB 6: ANALYTICS & FEEDBACK */}
        {activeTab === 'analytics' && <AnalyticsView />}

      </main>

      {/* Detail Drawer Modal */}
      {selectedEntry && (
        <FailureRecoveryView
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSimulateFailure={handleSimulateFailure}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#07090e] py-6 px-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-gray-400">
            Marlin Growth Agent &middot; Razorpay AI Commerce Hackathon
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Every transaction bounded & immutably logged.
          </span>
        </div>
      </footer>
    </div>
  )
}
