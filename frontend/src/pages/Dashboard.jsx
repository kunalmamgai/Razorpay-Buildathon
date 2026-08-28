import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Radio } from 'lucide-react'
import { fetchLedger, fetchLedgerStats, fetchCampaigns, reviewCampaign, approveCampaign, rejectCampaign, simulatePaymentFailure } from '../api'
import StatStrip from '../components/StatStrip'
import FilterBar from '../components/FilterBar'
import FourStateCard from '../components/FourStateCard'
import FailureRecoveryView from '../components/FailureRecoveryView'
import ApprovalPanel from '../components/ApprovalPanel'
import CampaignCard from '../components/CampaignCard'
import AgentActivityStrip from '../components/AgentActivityStrip'
import ColorLegend from '../components/ColorLegend'
import Navbar from '../components/Navbar'

const LEDGER_POLL_MS = 5000

export default function Dashboard() {
  const [tab, setTab] = useState('ledger') // ledger | campaigns | approvals
  const [ledger, setLedger] = useState([])
  const [stats, setStats] = useState({})
  const [filter, setFilter] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [newEvents, setNewEvents] = useState(0)
  const maxSeenIdRef = useRef(0)

  const ingestLedger = (entries) => {
    if (maxSeenIdRef.current && entries.length) {
      const fresh = entries.filter(e => e.id > maxSeenIdRef.current).length
      if (fresh > 0) setNewEvents(n => n + fresh)
    }
    if (entries.length) {
      maxSeenIdRef.current = Math.max(maxSeenIdRef.current, entries[0].id)
    }
    setLedger(entries)
  }

  const refreshLedger = async (silent = false) => {
    try {
      const [ledgerData, statsData] = await Promise.all([
        fetchLedger(100, filter),
        fetchLedgerStats(),
      ])
      if (silent) {
        ingestLedger(ledgerData.entries)
        setStats(statsData)
      } else {
        setLedger(ledgerData.entries)
        setStats(statsData)
        if (ledgerData.entries.length) {
          maxSeenIdRef.current = ledgerData.entries[0].id
          setNewEvents(0)
        }
      }
    } catch (e) {
      console.error('Failed to fetch ledger:', e)
    }
  }

  // Clear the "new events" badge shortly after it appears
  useEffect(() => {
    if (!newEvents) return undefined
    const t = setTimeout(() => setNewEvents(0), 6000)
    return () => clearTimeout(t)
  }, [newEvents])

  // Live polling — keeps the ledger feed and stats real-time
  useEffect(() => {
    refreshLedger()
    const timer = setInterval(() => refreshLedger(true), LEDGER_POLL_MS)
    return () => clearInterval(timer)
  }, [filter])

  const refreshCampaigns = async () => {
    try {
      const data = await fetchCampaigns()
      setCampaigns(data.campaigns)
    } catch (e) {
      console.error('Failed to fetch campaigns:', e)
    }
  }

  useEffect(() => { if (tab === 'campaigns') refreshCampaigns() }, [tab])

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

  return (
    <div className="dusk-sky-bg text-white min-h-screen">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold sunrise-text">Mission Control</h1>
            <p className="text-gray-400 text-sm mt-1">Marlin Growth Agent — every AI decision, audited live</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Radio className={`w-3.5 h-3.5 ${newEvents ? 'text-approved pulse-active' : 'text-gray-600'}`} />
              Live
            </span>
            <button
              onClick={() => refreshLedger()}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition border border-dusk-border px-3 py-1.5 rounded-lg hover:border-candy-lavender/50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* State color legend */}
        <ColorLegend />

        {/* Stats */}
        <StatStrip stats={stats} />

        {/* Tabs */}
        <div className="flex gap-1 bg-dusk-card rounded-xl p-1 mb-6">
          {[
            { id: 'ledger', label: 'Live Ledger Feed' },
            { id: 'campaigns', label: 'Campaigns' },
            { id: 'approvals', label: 'Approvals' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                tab === t.id ? 'bg-candy-btn text-white shadow-candy' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'ledger' && (
          <>
            <FilterBar filter={filter} setFilter={setFilter} counts={stats} />
            {newEvents > 0 && (
              <button
                onClick={() => setNewEvents(0)}
                className="mt-3 flex items-center gap-2 bg-approved-light text-approved text-xs font-medium px-3 py-1.5 rounded-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-approved pulse-active"></span>
                {newEvents} new ledger event{newEvents > 1 ? 's' : ''}
              </button>
            )}
            <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto ledger-scroll pr-2">
              {ledger.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-3xl mb-3 opacity-60">🛰️</p>
                  <p className="text-sm">No ledger entries yet.</p>
                  <p className="text-xs mt-1 text-gray-600">Make a checkout on the storefront to see events stream in here.</p>
                </div>
              ) : (
                ledger.map(entry => (
                  <FourStateCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => setSelectedEntry(entry)}
                    onSimulateFailure={handleSimulateFailure}
                  />
                ))
              )}
            </div>
          </>
        )}

        {tab === 'campaigns' && (
          <>
            <AgentActivityStrip />
            <div className="flex justify-end mb-4">
              <button
                onClick={handleReviewCampaign}
                disabled={loading}
                className="flex items-center gap-1.5 bg-candy-btn text-white px-4 py-2 rounded-lg text-sm font-medium shadow-candy hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? 'Reviewing...' : 'Run Campaign Review'}
              </button>
            </div>
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <p className="text-3xl mb-3 opacity-60">📣</p>
                  <p className="text-sm">No campaigns yet.</p>
                  <p className="text-xs mt-1 text-gray-600">Run a campaign review to let the Brain propose one from order history.</p>
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
          </>
        )}

        {tab === 'approvals' && <ApprovalPanel />}
      </div>

      {/* Failure/Recovery Detail Drawer */}
      {selectedEntry && (
        <FailureRecoveryView
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onSimulateFailure={handleSimulateFailure}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-dusk-border mt-8 py-6 px-6 text-center">
        <p className="text-[11px] text-gray-500">
          <strong className="text-gray-400">Why this is hard:</strong> India processes billions of UPI transactions annually with near-zero latency.
          Marlin demonstrates that agentic AI commerce is possible when every proposal passes through deterministic safety bounds,
          a human gate for high-value decisions, and an immutable audit trail &mdash; all before money moves.
        </p>
        <p className="text-[10px] text-gray-600 mt-2">Marlin Growth Agent &middot; Razorpay AI Commerce Hackathon</p>
      </footer>
    </div>
  )
}
