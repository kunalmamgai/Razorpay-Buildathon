import { useState, useEffect } from 'react'
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react'
import Navbar from '../components/Navbar'
import ApprovalPanel from '../components/ApprovalPanel'
import { fetchApprovals } from '../api'
import OperationsVisual from '../components/OperationsVisual'

export default function Approvals() {
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    fetchApprovals()
      .then(d => setPendingCount(d.count || 0))
      .catch(() => {})
  }, [])

  return (
    <div className="approvals-theme min-h-screen bg-[#f7f7f2] text-[#111827] flex flex-col font-sans selection:bg-[#d7ff4f] selection:text-[#111827]">
      {/* Top Navbar */}
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Section Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Approvals Queue
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm mt-1 font-mono">
              Requires Human Authorization (Threshold &gt; 15%)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-3.5 py-1.5 rounded-xl shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              {pendingCount} Pending
            </span>
          </div>
        </div>

        {/* Approvals Panel Feed */}
        <div className="mb-6 grid gap-5 md:grid-cols-2"><OperationsVisual variant="approvals" /><OperationsVisual variant="ledger" /></div>
        <ApprovalPanel />

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#07090e] py-6 px-6 text-center text-xs text-gray-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[11px] text-gray-400">
            RazorCage Human-in-the-Loop Gatekeeper &middot; Merchant Override Panel
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Every merchant override cryptographically signed to audit ledger.
          </span>
        </div>
      </footer>
    </div>
  )
}
