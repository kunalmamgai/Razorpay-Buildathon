import { useState, useEffect, useRef } from 'react'
import { fetchLedger, fetchLedgerStats, fetchCampaigns, reviewCampaign, approveCampaign, rejectCampaign, simulatePaymentFailure } from '../api'
import StatStrip from '../components/StatStrip'
import FilterBar from '../components/FilterBar'
import FourStateCard from '../components/FourStateCard'
import FailureRecoveryView from '../components/FailureRecoveryView'
import ApprovalPanel from '../components/ApprovalPanel'
import CampaignCard from '../components/CampaignCard'
import AgentActivityStrip from '../components/AgentActivityStrip'

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
    <div className="min-h-screen bg-surface-dark text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Marlin Growth Agent — Live Control Room</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${newEvents ? 'bg-approved pulse-active' : 'bg-gray-600'}`}></span>
              Live
            </span>
            <button
              onClick={() => refreshLedger()}
              className="text-sm text-gray-400 hover:text-white transition border border-surface-dark-border px-3 py-1.5 rounded-lg"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatStrip stats={stats} />

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-dark-card rounded-xl p-1 mb-6">
          {[
            { id: 'ledger', label: 'Live Ledger Feed' },
            { id: 'campaigns', label: 'Campaigns' },
            { id: 'approvals', label: 'Approvals' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                tab === t.id ? 'bg-ai-proposed text-white' : 'text-gray-400 hover:text-white'
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
                <p className="text-gray-500 text-center py-8">No ledger entries yet. Make a checkout to see events.</p>
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
                className="bg-ai-proposed text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50"
              >
                {loading ? 'Reviewing...' : 'Run Campaign Review'}
              </button>
            </div>
            <div className="space-y-3">
              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No campaigns yet. Click "Run Campaign Review" to have the Brain propose one.</p>
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
    </div>
  )
}
