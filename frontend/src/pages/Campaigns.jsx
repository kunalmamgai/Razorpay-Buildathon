import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, Sparkles, Play, Plus, Zap, ShieldCheck, FileText, ChevronRight
} from 'lucide-react'
import Navbar from '../components/Navbar'
import CampaignCard from '../components/CampaignCard'
import AgentActivityStrip from '../components/AgentActivityStrip'
import DemoTour from '../components/DemoTour'
import CreateCampaignModal from '../components/CreateCampaignModal'
import { fetchCampaigns, reviewCampaign, approveCampaign, rejectCampaign } from '../api'

// Brain → Cage → Gate → Ledger — the pipeline every campaign proposal passes through
const PIPELINE = [
  { icon: Sparkles, label: 'Brain', color: 'text-ai-proposed', desc: 'proposes a campaign from order history' },
  { icon: Zap, label: 'Cage', color: 'text-clamped', desc: 'enforces discount, duration & SKU limits' },
  { icon: ShieldCheck, label: 'Gate', color: 'text-approved', desc: 'you approve anything above the threshold' },
  { icon: FileText, label: 'Ledger', color: 'text-gray-400', desc: 'every decision, append-only' },
]

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const activityRowRef = useRef(null)
  const cardRefs = useRef({})
  const navigate = useNavigate()

  const loadCampaigns = async () => {
    try {
      const data = await fetchCampaigns()
      setCampaigns(data.campaigns || [])
    } catch (e) {
      console.error('Failed to load campaigns:', e)
    }
  }

  useEffect(() => {
    loadCampaigns()
    const handleMerchantChange = () => loadCampaigns()
    window.addEventListener('marlin_merchant_changed', handleMerchantChange)
    return () => window.removeEventListener('marlin_merchant_changed', handleMerchantChange)
  }, [])

  const handleRunReview = async () => {
    setLoading(true)
    try {
      await reviewCampaign()
      await loadCampaigns()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const handleApprove = async (id) => {
    try {
      await approveCampaign(id)
      await loadCampaigns()
    } catch (e) {
      console.error('Approve failed:', e)
    }
  }

  const handleReject = async (id) => {
    try {
      await rejectCampaign(id)
      await loadCampaigns()
    } catch (e) {
      console.error('Reject failed:', e)
    }
  }

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.id || '').toLowerCase().includes(searchQuery.toLowerCase())
    if (statusFilter === 'active') return matchesSearch && c.status === 'active'
    if (statusFilter === 'pending') return matchesSearch && (c.status === 'pending' || c.status === 'draft')
    if (statusFilter === 'rejected') return matchesSearch && c.status === 'rejected'
    return matchesSearch
  })

  // ── Guided demo tour steps ────────────────────────────────────────────
  const tourSteps = useMemo(() => {
    const clampedCard = campaigns.find(c => c.policy_decision === 'clamped')
    const rejectedCard = campaigns.find(c => c.status === 'rejected')
    const pendingCard = campaigns.find(c => c.status === 'pending')
    const exampleCard = clampedCard || rejectedCard || campaigns[0]

    return [
      {
        getEl: () => activityRowRef.current,
        title: '1 · The Brain never sleeps',
        body: 'Every 60 minutes the agent reviews your order history and proposes one campaign. Trigger a review manually any time — with no Gemini key configured, a scripted demo Brain keeps the pipeline running.',
        action: { label: loading ? 'Reviewing Orders…' : 'Run review now', onAction: handleRunReview, disabled: loading },
      },
      {
        getEl: () => (exampleCard ? cardRefs.current[exampleCard.id] : null),
        title: '2 · The Cage decides',
        body: 'The Brain is advisory only. A deterministic rules engine checks every proposal against your policy — discount caps, durations, valid SKUs. This card shows a proposal the Cage clamped or rejected before a customer ever saw it.',
      },
      {
        getEl: () => (pendingCard ? cardRefs.current[pendingCard.id] : null),
        title: '3 · You are the Gate',
        body: pendingCard
          ? 'Anything above your 15% auto-approve threshold parks here until a human decides. Hit Approve — or Reject — and the ledger records your call.'
          : 'Nothing is awaiting approval right now. Run a review (step 1) to generate a proposal that crosses the threshold, then come back.',
      },
      {
        getEl: () => null,
        title: '4 · Every decision, on the record',
        body: 'Proposals, clamps, rejections, approvals — all append-only in the audit ledger with the reasoning attached. That is the whole point: bounded AI you can inspect.',
        action: { label: 'Open Audit Logs', onAction: () => { setTourOpen(false); navigate('/audit') } },
      },
    ]
  }, [campaigns, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dusk-sky-bg min-h-screen text-white flex flex-col font-sans selection:bg-candy-lavender selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

        {/* Agent activity (real scheduler) + manual review trigger */}
        <div ref={activityRowRef} className="flex flex-col lg:flex-row lg:items-center gap-3 mb-8 rounded-2xl">
          <div className="flex-1">
            <AgentActivityStrip />
          </div>
          <button
            onClick={handleRunReview}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            {loading ? 'Reviewing Orders...' : 'Run Campaign Review'}
          </button>
        </div>

        {/* Section header + demo actions */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campaign Orchestrator
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              The agent proposes campaigns from order history. The Cage enforces your policy limits.
              Campaigns above the approval threshold wait for your gate.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setTourOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-candy-lavender bg-candy-lavender/10 border border-candy-lavender/30 hover:bg-candy-lavender/20 px-3.5 py-2 rounded-xl transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Take the demo tour
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-white bg-candy-lavender-deep hover:bg-candy-lavender px-3.5 py-2 rounded-xl shadow-glow transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Pipeline explainer strip */}
        <div className="bg-dusk-card/60 border border-dusk-border rounded-xl px-4 py-3 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2">
          {PIPELINE.map((p, i) => {
            const Icon = p.icon
            return (
              <span key={p.label} className="flex items-center gap-3">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-600" />}
                <span className="flex items-center gap-1.5 text-xs">
                  <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                  <strong className="text-gray-200 font-bold">{p.label}</strong>
                  <span className="text-gray-500">{p.desc}</span>
                </span>
              </span>
            )
          })}
        </div>

        {/* Search + status filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-dusk border border-dusk-border rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-candy-lavender/50 w-64"
            />
          </div>

          <div className="flex items-center gap-1 bg-dusk border border-dusk-border p-1 rounded-xl font-mono text-xs">
            {['all', 'active', 'pending', 'rejected'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg text-xs capitalize transition ${
                  statusFilter === st
                    ? 'bg-candy-lavender/15 text-candy-lavender border border-candy-lavender/30 font-bold'
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-16 bg-dusk-card border border-dusk-border rounded-2xl space-y-4">
            <p className="text-4xl">📣</p>
            <p className="text-sm font-semibold text-gray-300">
              {campaigns.length === 0 ? 'No campaigns yet.' : 'No campaigns match your filter.'}
            </p>
            {campaigns.length === 0 && (
              <>
                <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                  The agent reviews order history every hour and proposes promotional campaigns.
                  The Cage enforces your discount and duration limits. Anything above the
                  <span className="text-clamped font-bold"> &gt;15% threshold </span>
                  waits for your approval.
                </p>
                <button
                  onClick={handleRunReview}
                  disabled={loading}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {loading ? 'Reviewing Orders...' : 'Run Campaign Review'}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCampaigns.map(camp => (
              <div
                key={camp.id}
                ref={el => { cardRefs.current[camp.id] = el }}
              >
                <CampaignCard
                  campaign={camp}
                  onApprove={() => handleApprove(camp.id)}
                  onReject={() => handleReject(camp.id)}
                />
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-dusk-border py-6 px-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-gray-400">
            RazorCage Campaign Orchestrator &middot; Brain &rarr; Cage &rarr; Gate
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Every proposal bounded by policy &middot; every decision logged.
          </span>
        </div>
      </footer>

      {/* Guided demo tour (R4) */}
      <DemoTour steps={tourSteps} open={tourOpen} onClose={() => setTourOpen(false)} />

      {/* Create-campaign modal with live Cage verdict (R5) */}
      <CreateCampaignModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={loadCampaigns}
      />
    </div>
  )
}
