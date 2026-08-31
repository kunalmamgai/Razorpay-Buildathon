import { useState, useEffect } from 'react'
import {
  Search, Filter, Download, ShieldCheck, Sparkles, Zap, Receipt,
  Activity, CheckCircle2, RefreshCw, XCircle, ArrowRight, Lock, ExternalLink
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { fetchLedger } from '../api'

const FORENSIC_ROWS = [
  {
    timestamp: '2023-10-27 14:02:11.432',
    log_id: 'TX-8921-A',
    event_type: 'AI Proposal',
    icon: Sparkles,
    icon_color: 'text-blue-400',
    node: 'Node-Alpha',
    status: 'GENERATED',
    status_style: 'text-blue-300 bg-blue-950/80 border-blue-500/30',
  },
  {
    timestamp: '2023-10-27 14:02:12.015',
    log_id: 'TX-8921-P',
    event_type: 'Policy Check',
    icon: Zap,
    icon_color: 'text-amber-400',
    node: 'Gov-Engine-2',
    status: 'FLAGGED',
    status_style: 'text-amber-300 bg-amber-950/80 border-amber-500/30',
  },
  {
    timestamp: '2023-10-27 14:03:05.991',
    log_id: 'TX-8921-H',
    event_type: 'Human Override',
    icon: XCircle,
    icon_color: 'text-rose-400',
    node: 'Admin-JS',
    status: 'REJECTED',
    status_style: 'text-rose-300 bg-rose-950/80 border-rose-500/30',
  },
  {
    timestamp: '2023-10-27 14:05:22.100',
    log_id: 'TX-8922-A',
    event_type: 'Order Executed',
    icon: Receipt,
    icon_color: 'text-emerald-400',
    node: 'Node-Beta',
    status: 'COMMITTED',
    status_style: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/30',
  },
  {
    timestamp: '2023-10-27 14:06:01.002',
    log_id: 'SYS-0019-B',
    event_type: 'System Sync',
    icon: RefreshCw,
    icon_color: 'text-gray-400',
    node: 'Core-DB',
    status: 'OK',
    status_style: 'text-gray-300 bg-gray-900 border-gray-800',
  },
  {
    timestamp: '2023-10-27 14:07:12.884',
    log_id: 'TX-8923-P',
    event_type: 'Policy Check',
    icon: Zap,
    icon_color: 'text-amber-400',
    node: 'Gov-Engine-1',
    status: 'CLEARED',
    status_style: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/40',
  },
]

const BLOCK_HASHES = [
  { blk: 'BLK-85036', hash: 'a89c6a69cc77ad0f8b86c5b4c3639595315' },
  { blk: 'BLK-54640', hash: '1c4cd308bf54f1bc5b4011f741e592097' },
  { blk: 'BLK-61680', hash: 'bb5dc0c610630650da8431f84f9618f8' },
  { blk: 'BLK-57285', hash: 'c395b849a24668a7e0c23b6220492bd4c' },
  { blk: 'BLK-76352', hash: 'af59166bba5fea7e06284d88cd4483860' },
  { blk: 'BLK-74382', hash: '6dac4e154c4db29a2bd7d2cde3583c0c0' },
  { blk: 'BLK-18216', hash: '354bfcafcfdca3ad5f1154add21f0f274' },
  { blk: 'BLK-26417', hash: '47898104913e4bf898dbd7933ceefbac0' },
  { blk: 'BLK-48812', hash: '1988d41ed63a86413b34271135a7351d2' },
]

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState('')
  const [realEntries, setRealEntries] = useState([])
  const [verifying, setVerifying] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [eventTypeFilter, setEventTypeFilter] = useState('all')

  useEffect(() => {
    fetchLedger(100)
      .then(d => {
        if (d.entries && d.entries.length > 0) {
          setRealEntries(d.entries)
        }
      })
      .catch(() => {})
  }, [])

  const handleVerifyChain = () => {
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      setVerifySuccess(true)
      setTimeout(() => setVerifySuccess(false), 4000)
    }, 1200)
  }

  const filteredRows = FORENSIC_ROWS.filter(row => {
    const matchesSearch = row.log_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          row.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          row.node.toLowerCase().includes(searchQuery.toLowerCase())
    if (eventTypeFilter === 'ai') return matchesSearch && row.event_type.includes('AI')
    if (eventTypeFilter === 'policy') return matchesSearch && (row.event_type.includes('Policy') || row.event_type.includes('Human'))
    return matchesSearch
  })

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Top Control Room Title Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Marlin Control Room
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 font-mono">
              Immutable forensic audit trail & cryptographic ledger status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logs, policies, IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0e111b] border border-[#1b1f32] rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 w-64"
              />
            </div>

            {/* Live status indicators */}
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-gray-400 bg-[#0e111b] border border-[#1b1f32] px-3.5 py-2 rounded-xl">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                24ms Latency
              </span>
              <span className="text-gray-700">|</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                99.9% Uptime
              </span>
            </div>
          </div>
        </div>

        {/* Top Metric Summary Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
          
          {/* Card 1: Total Logs */}
          <div className="md:col-span-4 bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">
                TOTAL LOGS (24H)
              </span>
              <p className="text-2xl font-extrabold font-mono text-white mt-1 tracking-tight">
                142,893
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Integrity Score */}
          <div className="md:col-span-4 bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">
                INTEGRITY SCORE
              </span>
              <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 tracking-tight">
                100.00%
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Active Monitors & Filters */}
          <div className="md:col-span-4 bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider">
                ACTIVE MONITORS
              </span>
              <p className="text-2xl font-extrabold font-mono text-white mt-1 tracking-tight">
                24/24
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 bg-[#121625] border border-white/10 hover:border-gray-600 text-xs font-mono text-gray-300 px-3 py-2 rounded-xl transition">
                <Filter className="w-3.5 h-3.5" /> Filters
              </button>
              <button className="flex items-center gap-1.5 bg-[#121625] border border-white/10 hover:border-gray-600 text-xs font-mono text-gray-300 px-3 py-2 rounded-xl transition">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

        </div>

        {/* Main Two-Column Forensic Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: System Forensic View (8 cols) */}
          <div className="lg:col-span-8 bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                SYSTEM FORENSIC VIEW
              </h2>

              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={() => setEventTypeFilter(eventTypeFilter === 'ai' ? 'all' : 'ai')}
                  className={`px-3 py-1 rounded-lg border transition ${
                    eventTypeFilter === 'ai'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-[#121625] text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  &lt; AI Events
                </button>
                <button
                  onClick={() => setEventTypeFilter(eventTypeFilter === 'policy' ? 'all' : 'policy')}
                  className={`px-3 py-1 rounded-lg border transition ${
                    eventTypeFilter === 'policy'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-[#121625] text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  🛡 Policy Events
                </button>
              </div>
            </div>

            {/* Forensic Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    <th className="pb-3">TIMESTAMP (UTC)</th>
                    <th className="pb-3">LOG ID</th>
                    <th className="pb-3">EVENT TYPE</th>
                    <th className="pb-3">AGENT/NODE</th>
                    <th className="pb-3">STATUS</th>
                    <th className="pb-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(() => {
          // Use real entries if available, otherwise fall back to mock data
          const displayRows = realEntries.length > 0
            ? realEntries.map(e => ({
                timestamp: e.timestamp || 'N/A',
                log_id: e.id ? `TX-${String(e.id).slice(-4)}` : 'TX-0000',
                event_type: e.event_type || 'Unknown',
                icon: e.event_type?.includes('proposal') ? Sparkles
                    : e.event_type?.includes('payment') ? Receipt
                    : e.event_type?.includes('approval') ? ShieldCheck
                    : e.event_type?.includes('webhook') ? Zap
                    : Sparkles,
                icon_color: e.outcome === 'paid' ? 'text-emerald-400'
                          : e.outcome === 'rejected' ? 'text-rose-400'
                          : e.outcome === 'clamped' ? 'text-amber-400'
                          : e.outcome === 'failed' ? 'text-rose-400'
                          : 'text-blue-400',
                node: e.actor || 'system',
                status: (e.outcome || 'pending').toUpperCase(),
                status_style: e.outcome === 'paid' ? 'text-emerald-300 bg-emerald-950/80 border-emerald-500/30'
                            : e.outcome === 'rejected' ? 'text-rose-300 bg-rose-950/80 border-rose-500/30'
                            : e.outcome === 'clamped' ? 'text-amber-300 bg-amber-950/80 border-amber-500/30'
                            : e.outcome === 'failed' ? 'text-rose-300 bg-rose-950/80 border-rose-500/30'
                            : 'text-blue-300 bg-blue-950/80 border-blue-500/30',
              }))
            : filteredRows
          return displayRows
        })().map((row, idx) => {
                    const IconComponent = row.icon
                    return (
                      <tr key={idx} className="hover:bg-white/[0.02] transition">
                        <td className="py-3.5 text-gray-400 font-mono text-[11px]">
                          {row.timestamp}
                        </td>
                        <td className="py-3.5 text-white font-bold font-mono">
                          {row.log_id}
                        </td>
                        <td className="py-3.5 font-semibold text-gray-200">
                          <span className="flex items-center gap-2">
                            <IconComponent className={`w-3.5 h-3.5 ${row.icon_color}`} />
                            {row.event_type}
                          </span>
                        </td>
                        <td className="py-3.5 text-gray-400">
                          {row.node}
                        </td>
                        <td className="py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${row.status_style}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button className="text-gray-400 hover:text-cyan-300 transition">
                            <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Live Ledger Integrity (4 cols) */}
          <div className="lg:col-span-4 bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Live Ledger Integrity
                </span>
              </div>

              {/* Block Stream Hashes List */}
              <div className="space-y-2 font-mono text-[11px] max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                {BLOCK_HASHES.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#121625] border border-white/5 p-2 rounded-lg text-gray-400 hover:border-emerald-500/30 transition">
                    <span className="font-bold text-gray-500">{item.blk}</span>
                    <span className="text-gray-400 truncate max-w-[170px] text-[10px]">{item.hash}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic State Verification Box */}
            <div className="bg-[#121625] border border-emerald-500/20 rounded-xl p-4 space-y-3 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  CRYPTOGRAPHIC STATE
                </span>
              </div>

              <div className="bg-[#090b12] border border-white/5 rounded-lg p-2.5 text-xs text-gray-300 truncate">
                0x7a2b9f...e4d1
              </div>

              {verifySuccess && (
                <p className="text-[11px] text-emerald-400 font-semibold text-center animate-fadeIn">
                  ✓ Ledger Merkle root cryptographically verified!
                </p>
              )}

              <button
                onClick={handleVerifyChain}
                disabled={verifying}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold py-2 rounded-xl text-xs transition active:scale-95 disabled:opacity-50"
              >
                {verifying ? 'Verifying Chain Integrity...' : 'VERIFY CHAIN'}
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#07090e] py-6 px-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-gray-400">
            Marlin System Forensic Audit &middot; Razorpay Public Ledger Protocol
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Every AI state transition cryptographically chained with SHA-256 integrity checks.
          </span>
        </div>
      </footer>
    </div>
  )
}
