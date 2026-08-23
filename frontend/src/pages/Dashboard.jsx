import React, { useState, useEffect } from 'react'
import { fetchLedger, fetchLedgerStats, fetchCampaigns, approveCampaign, rejectCampaign, simulatePaymentFailure } from '../api'
import FourStateCard from '../components/FourStateCard'
import FilterBar from '../components/FilterBar'
import StatStrip from '../components/StatStrip'
import CampaignCard from '../components/CampaignCard'

export default function Dashboard() {
  const [entries, setEntries] = useState([])
  const [stats, setStats] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [filter, setFilter] = useState(null)
  const [activeTab, setActiveTab] = useState('ledger')
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(null)

  const loadData = async () => {
    try {
      const [ledgerRes, statsRes, campaignRes] = await Promise.all([
        fetchLedger(50, filter),
        fetchLedgerStats(),
        fetchCampaigns(),
      ])
      setEntries(ledgerRes.entries || [])
      setStats(statsRes)
      setCampaigns(Array.isArray(campaignRes) ? campaignRes : campaignRes.campaigns || [])
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filter])

  // Auto-refresh every 5 seconds for live feel
  useEffect(() => {
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [filter])

  const handleApprove = async (id) => {
    await approveCampaign(id)
    loadData()
  }

  const handleReject = async (id) => {
    await rejectCampaign(id)
    loadData()
  }

  const handleSimulateFailure = async (orderId) => {
    setSimulating(orderId)
    try {
      await simulatePaymentFailure(orderId)
      loadData()
    } finally {
      setSimulating(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface-dark text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Marlin Dashboard</h1>
            <p className="text-sm text-gray-400 mt-1">Live audit feed & campaign controls</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-approved animate-pulse" />
            <span className="text-xs font-mono text-gray-400">Live</span>
          </div>
        </div>

        {/* Agent Activity Strip */}
        <div className="mb-6 p-3 rounded-lg bg-surface-dark-card border border-surface-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-ai-proposed">&#x2728;</span>
            <span className="text-sm text-gray-300">Campaign Orchestrator</span>
          </div>
          <span className="text-xs font-mono text-gray-500">Next review in 47 min</span>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-4 mb-6 border-b border-surface-dark-border pb-3">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`text-sm font-medium transition ${activeTab === 'ledger' ? 'text-white border-b-2 border-ai-proposed' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Live Ledger Feed
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`text-sm font-medium transition ${activeTab === 'campaigns' ? 'text-white border-b-2 border-ai-proposed' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Campaigns
          </button>
        </div>

        {activeTab === 'ledger' && (
          <>
            {/* Stat Strip */}
            <StatStrip stats={stats} />

            {/* Filter Bar */}
            <FilterBar active={filter} onChange={setFilter} />

            {/* Ledger Feed */}
            <div className="space-y-3 ledger-scroll max-h-[calc(100vh-400px)] overflow-y-auto pr-2">
              {loading ? (
                <div className="text-center text-gray-500 py-12">Loading ledger...</div>
              ) : entries.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  No entries yet. Make a purchase from the Storefront to see the ledger in action.
                </div>
              ) : (
                entries.map(entry => (
                  <div key={entry.id} className="relative group">
                    <FourStateCard entry={entry} />
                    {/* Simulate failure button for paid entries */}
                    {entry.outcome === 'paid' && entry.razorpay_order_id && (
                      <button
                        onClick={() => handleSimulateFailure(entry.razorpay_order_id)}
                        disabled={simulating === entry.razorpay_order_id}
                        className="absolute top-4 right-16 px-2 py-1 bg-rejected/20 text-rejected text-[10px] rounded font-mono opacity-0 group-hover:opacity-100 transition hover:bg-rejected/30"
                      >
                        {simulating === entry.razorpay_order_id ? 'Simulating...' : 'Simulate Failure'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'campaigns' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.length === 0 ? (
              <div className="col-span-full text-center text-gray-500 py-12">
                No campaigns yet. The orchestrator will propose campaigns automatically.
              </div>
            ) : (
              campaigns.map(campaign => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
