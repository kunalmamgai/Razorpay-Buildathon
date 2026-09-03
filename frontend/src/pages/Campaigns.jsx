import { useState, useEffect } from 'react'
import {
  Sparkles, Search, Filter, Play, AlertTriangle, FileEdit, MoreHorizontal, Clock, CheckCircle2, XCircle
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { fetchCampaigns, reviewCampaign } from '../api'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(2820) // 47 minutes = 2820s

  // Live ticking countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds(prev => (prev > 0 ? prev - 1 : 2820))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatCountdown = (totalSec) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
  }

  const loadCampaigns = async () => {
    try {
      const data = await fetchCampaigns()
      const list = data.campaigns || []
      const realMapped = list.map(c => {
        let targetSkus = []
        try { targetSkus = JSON.parse(c.target_skus_json || '[]') } catch {}
        return {
          id: c.id || `CMP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          name: c.name,
          status: c.status || 'draft',
          discount_pct: c.discount_pct,
          target_skus: targetSkus,
          policy_decision: c.policy_decision,
          skus_targeted: targetSkus.length > 0 ? `${targetSkus.length} SKU(s)` : '--',
          avg_discount: c.discount_pct ? `${c.discount_pct}%` : '--',
          progress_label: c.status === 'active' ? 'Active' : c.status === 'pending' ? 'Awaiting Approval' : c.status === 'rejected' ? 'Rejected' : 'Draft',
          progress_pct: c.status === 'active' ? 100 : c.status === 'pending' ? 50 : 0,
          created_by: c.created_by || 'system',
          starts_at: c.starts_at,
          expires_at: c.expires_at,
        }
      })
      setCampaigns(realMapped)
    } catch (e) {
      console.error('Failed to load campaigns:', e)
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

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchQuery.toLowerCase())
    if (statusFilter === 'active') return matchesSearch && c.status === 'active'
    if (statusFilter === 'pending') return matchesSearch && (c.status === 'pending' || c.status === 'draft')
    if (statusFilter === 'rejected') return matchesSearch && c.status === 'rejected'
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Live Autonomous Review Timer Bar */}
        <div className="bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3 text-xs font-mono text-gray-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Agent Activity: Next autonomous review in <strong className="text-cyan-300 font-extrabold">{formatCountdown(countdownSeconds)}</strong>
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

        {/* Section Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campaign Orchestrator
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Manage and monitor automated pricing and promotional campaigns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0e111b] border border-[#1b1f32] rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-56"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#0e111b] border border-[#1b1f32] p-1 rounded-xl font-mono text-xs">
              {['all', 'active', 'pending', 'rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs capitalize transition ${
                    statusFilter === st
                      ? 'bg-blue-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map(camp => (
            <div
              key={camp.id}
              className="bg-[#0e111b] border border-[#1b1f32] hover:border-cyan-500/40 rounded-2xl p-5 shadow-xl space-y-4 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400">{camp.id}</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{camp.name}</h3>
                </div>
                <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                  camp.status === 'active' ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/30'
                  : camp.status === 'rejected' ? 'text-rose-300 bg-rose-950/80 border-rose-500/30'
                  : 'text-amber-300 bg-amber-950/80 border-amber-500/30'
                }`}>
                  {camp.progress_label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-[#121625] p-3 rounded-xl border border-white/5">
                <div>
                  <span className="text-gray-400 block text-xs">Discount</span>
                  <span className="text-cyan-300 font-extrabold text-sm">{camp.avg_discount}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Target SKUs</span>
                  <span className="text-white font-bold">{camp.skus_targeted}</span>
                </div>
              </div>

              {camp.policy_decision && (
                <div className="text-xs font-mono text-gray-300 bg-[#090b12] p-2.5 rounded-lg border border-white/5">
                  Policy Decision: <span className="text-cyan-300 font-bold">{camp.policy_decision}</span>
                </div>
              )}
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
