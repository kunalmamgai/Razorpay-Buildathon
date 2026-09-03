import { Sparkles, Zap, Receipt, CreditCard, ShieldCheck } from 'lucide-react'

export default function StatStrip({ stats }) {
  const total = stats.total_proposals !== undefined ? stats.total_proposals : 0
  const approved = stats.approved !== undefined ? stats.approved + (stats.paid || 0) : 0
  const clamped = stats.clamped !== undefined ? stats.clamped + (stats.awaiting_approval || 0) : 0
  const rejected = stats.rejected !== undefined ? stats.rejected + (stats.failed || 0) : 0

  const approvedPct = total > 0 ? Math.round((approved / total) * 100) : 0
  const clampedPct = total > 0 ? Math.round((clamped / total) * 100) : 0
  const rejectedPct = total > 0 ? Math.round((rejected / total) * 100) : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8 font-sans">
      {/* Left Stat Box: Donut & Vol Summary */}
      <div className="lg:col-span-8 bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Donut graphic */}
        <div className="flex items-center gap-4 shrink-0">
          <div
            className="w-20 h-20 rounded-full shrink-0 relative flex items-center justify-center p-1 shadow-lg shadow-cyan-500/10"
            style={{
              background: total > 0 
                ? `conic-gradient(#10B981 0% ${approvedPct}%, #F59E0B ${approvedPct}% ${approvedPct + clampedPct}%, #EF4444 ${approvedPct + clampedPct}% 100%)`
                : '#1f2937',
            }}
          >
            <div className="w-full h-full rounded-full bg-[#0e111b] flex flex-col items-center justify-center border border-white/5">
              <span className="text-sm font-extrabold font-mono text-white leading-tight">
                {total.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Total</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold">Total Proposals</p>
            <p className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Breakdown Stats Columns */}
        <div className="grid grid-cols-4 gap-4 md:gap-6 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-white/10 text-center md:text-left">
          <div>
            <p className="text-xs font-mono text-gray-400">Proposals</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-white">{total.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-emerald-400 font-semibold">Approved</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-emerald-400">{approved.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-amber-400 font-semibold">Clamped</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-amber-400">{clamped.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-rose-400 font-semibold">Rejected</p>
            <p className="text-lg sm:text-xl font-bold font-mono text-rose-400">{rejected.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Right Pipeline Reference Card */}
      <div className="lg:col-span-4 bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Pipeline Reference
          </span>
          <span className="text-xs text-cyan-400 font-mono bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
            Deterministic
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 bg-[#121625] border border-white/5 p-2 rounded-lg text-gray-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="text-xs font-semibold text-blue-300">AI Proposed</span>
          </div>
          <div className="flex items-center gap-2 bg-[#121625] border border-white/5 p-2 rounded-lg text-gray-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-amber-300">Policy Check</span>
          </div>
          <div className="flex items-center gap-2 bg-[#121625] border border-white/5 p-2 rounded-lg text-gray-300">
            <Receipt className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-300">Order</span>
          </div>
          <div className="flex items-center gap-2 bg-[#121625] border border-white/5 p-2 rounded-lg text-gray-300">
            <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-emerald-300">Payment</span>
          </div>
        </div>
      </div>
    </div>
  )
}
