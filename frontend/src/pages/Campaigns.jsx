import { useState, useEffect } from 'react'
import {
  Sparkles, Search, Filter, Play, AlertTriangle, FileEdit, MoreHorizontal
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { fetchCampaigns, reviewCampaign } from '../api'

const MOCK_CAMPAIGNS = [
  {
    id: 'CMP-992A-4B',
    name: 'Q3 Electronics Clearance',
    status: 'active',
    skus_targeted: '1,240',
    avg_discount: '24.5%',
    progress_label: '12 Days Left',
    progress_pct: 65,
    bottom_label: '✨ Optimized 2h ago',
  },
  {
    id: 'CMP-881X-9C',
    name: 'Holiday Pre-Sale Prep',
    status: 'pending',
    skus_targeted: '8,500',
    avg_discount: '--',
    progress_label: 'In Queue',
    progress_pct: 30,
    bottom_label: '🛡️ Policy Check',
  },
  {
    id: 'CMP-774V-2Z',
    name: 'Flash Sale - Accessories',
    status: 'rejected',
    skus_targeted: '450',
    avg_discount: '45.0%',
    warning_text: 'Margin threshold violation detected on 12 SKUs. Max allowed discount 35%.',
    bottom_label: '✎ Revise',
  },
  {
    id: 'CMP-NEW',
    name: 'Winter Collection Promo',
    status: 'draft',
    skus_targeted: '--',
    avg_discount: '--',
    bottom_label: '▷ Resume Setup',
  },
]

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  const loadCampaigns = async () => {
    try {
      const data = await fetchCampaigns()
      if (data.campaigns && data.campaigns.length > 0) {
        const realMapped = data.campaigns.map(c => ({
          id: c.id || `CMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          name: c.name,
          status: c.status || 'pending',
          skus_targeted: '1,240',
          avg_discount: `${c.discount_pct || 20}%`,
          progress_label: c.status === 'active' ? '14 Days Left' : 'Awaiting Approval',
          progress_pct: 50,
          bottom_label: c.status === 'active' ? '✨ Optimized 1h ago' : '🛡️ Policy Check',
        }))
        setCampaigns(realMapped)
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadCampaigns()
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

  const filteredCampaigns = campaigns.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Top Bar: Agent Activity Banner & Run Campaign Review CTA */}
        <div className="bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 text-xs font-mono text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span>
              Agent Activity: <strong className="text-white">Next autonomous review in 47 min</strong>
            </span>
          </div>

          <button
            onClick={handleRunReview}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            {loading ? 'Reviewing Orders...' : 'Run Campaign Review'}
          </button>
        </div>

        {/* Section Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Campaign Orchestrator
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            Manage and monitor automated pricing and promotional campaigns.
          </p>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-3 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121625] border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <button className="flex items-center gap-1.5 bg-[#121625] border border-white/5 hover:border-gray-700 text-gray-300 font-mono text-xs px-3.5 py-2 rounded-xl transition">
              <Filter className="w-3.5 h-3.5" /> Filter
            </button>
          </div>

          <span className="text-xs font-mono text-gray-400">
            Showing <strong className="text-white">{filteredCampaigns.length}</strong> active campaigns
          </span>
        </div>

        {/* Campaign Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {filteredCampaigns.map(c => {
            const isActive = c.status === 'active'
            const isPending = c.status === 'pending'
            const isRejected = c.status === 'rejected'
            const isDraft = c.status === 'draft'

            return (
              <div
                key={c.id}
                className={`bg-[#0e111b] border ${
                  isActive ? 'border-emerald-500/30 hover:border-emerald-500/60' :
                  isPending ? 'border-amber-500/30 hover:border-amber-500/60' :
                  isRejected ? 'border-rose-500/30 hover:border-rose-500/60' :
                  'border-gray-800/80 hover:border-gray-700'
                } rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300 relative group`}
              >
                <div>
                  {/* Card Header & Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">
                        {c.name}
                      </h3>
                      <span className="text-[11px] font-mono text-gray-500 block mt-0.5">
                        ID: {c.id}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span className={`text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                      isActive ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-500/30' :
                      isPending ? 'text-amber-400 bg-amber-950/80 border border-amber-500/30' :
                      isRejected ? 'text-rose-400 bg-rose-950/80 border border-rose-500/30' :
                      'text-gray-400 bg-gray-900 border border-gray-800'
                    }`}>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                      {c.status}
                    </span>
                  </div>

                  {/* DRAFT Specific Content */}
                  {isDraft ? (
                    <div className="my-8 py-6 border border-dashed border-gray-800 rounded-xl text-center space-y-2">
                      <FileEdit className="w-6 h-6 text-gray-500 mx-auto" />
                      <p className="text-xs text-gray-500 font-mono">Configuration incomplete</p>
                    </div>
                  ) : (
                    <>
                      {/* Metrics Row */}
                      <div className="grid grid-cols-2 gap-3 my-4 font-mono">
                        <div className="bg-[#121625] border border-white/5 p-2.5 rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">
                            SKUS TARGETED
                          </span>
                          <span className="text-base font-extrabold text-white">
                            {c.skus_targeted}
                          </span>
                        </div>

                        <div className="bg-[#121625] border border-white/5 p-2.5 rounded-xl">
                          <span className="text-[9px] uppercase font-bold text-gray-400 block tracking-wider">
                            AVG. DISCOUNT
                          </span>
                          <span className={`text-base font-extrabold ${isActive ? 'text-amber-400' : isRejected ? 'text-rose-400' : 'text-gray-400'}`}>
                            {c.avg_discount}
                          </span>
                        </div>
                      </div>

                      {/* Rejected Warning Box */}
                      {isRejected && c.warning_text && (
                        <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 mb-4 text-[11px] font-mono text-rose-300 leading-relaxed flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <span>{c.warning_text}</span>
                        </div>
                      )}

                      {/* Progress Bar */}
                      {!isRejected && (
                        <div className="mb-4 space-y-1.5 font-mono text-[11px]">
                          <div className="flex justify-between items-center text-gray-400">
                            <span>{isPending ? 'Awaiting Approval' : 'Progress to Expiry'}</span>
                            <span className="text-white font-semibold">{c.progress_label}</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden border border-white/5">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isActive ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-amber-500'
                              }`}
                              style={{ width: `${c.progress_pct || 40}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Card Bottom Footer Row */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-gray-400">
                  <span className="flex items-center gap-1.5 text-gray-300">
                    {c.bottom_label}
                  </span>

                  <button className="text-gray-500 hover:text-white p-1 rounded transition">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#07090e] py-6 px-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-gray-400">
            Marlin Campaign Orchestrator &middot; Autonomous AI Pricing Engine
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Every campaign policy-checked & logged to audit ledger.
          </span>
        </div>
      </footer>
    </div>
  )
}
