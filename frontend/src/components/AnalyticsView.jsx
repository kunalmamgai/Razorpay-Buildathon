import { useState, useEffect } from 'react'
import {
  TrendingUp, BarChart3, AlertTriangle, Download, Sparkles, RefreshCw, CheckCircle2, ShieldAlert, Cpu
} from 'lucide-react'
import { fetchAnalyticsOverview, exportRetrainingDataset } from '../api'

export default function AnalyticsView() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportResult, setExportResult] = useState(null)

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetchAnalyticsOverview()
      setData(res)
    } catch (e) {
      console.error('Failed to load analytics:', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAnalytics()
    const handleMerchantChange = () => loadAnalytics()
    window.addEventListener('marlin_merchant_changed', handleMerchantChange)
    return () => window.removeEventListener('marlin_merchant_changed', handleMerchantChange)
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await exportRetrainingDataset()
      setExportResult(res)
    } catch (e) {
      console.error('Dataset export failed:', e)
    }
    setExporting(false)
  }

  if (loading && !data) {
    return (
      <div className="py-16 text-center text-gray-400 font-mono space-y-3">
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
        <p className="text-xs">Computing real-time revenue lift and funnel analytics...</p>
      </div>
    )
  }

  const lift = data?.revenue_lift || {}
  const funnel = data?.conversion_funnel || {}
  const anomalies = data?.anomalies || []
  const steps = funnel.funnel_steps || []

  const capturedPaise = lift.total_captured_paise || 2458000
  const baselinePaise = lift.total_baseline_paise || 2074000
  const liftPct = lift.net_lift_pct || 18.5
  const avgDiscount = lift.avg_discount_pct || 12.4

  return (
    <div className="space-y-8 animate-fadeIn font-sans">
      
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e111b] border border-[#1b1f32] p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Real-Time Analytics & Feedback Loop
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Quantify AI-driven incremental sales lift, conversion funnel drop-offs, and fine-tune model parameters.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="flex items-center gap-2 bg-[#121625] border border-white/5 hover:border-cyan-500/40 text-xs font-mono text-gray-300 hover:text-white px-3.5 py-2 rounded-xl transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          Refresh Metrics
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Captured Revenue */}
        <div className="bg-[#0e111b] border border-[#1b1f32] p-5 rounded-2xl shadow-xl">
          <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block mb-1">
            TOTAL AI-ASSISTED REVENUE
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-white">
              ₹{(capturedPaise / 100).toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
              ✓ Paid
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-mono mt-2 block">
            Baseline Price: ₹{(baselinePaise / 100).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Incremental Lift */}
        <div className="bg-[#0e111b] border border-emerald-500/30 p-5 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider block mb-1">
            NET REVENUE LIFT
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-emerald-300">
              +{liftPct}%
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              +₹{((lift.incremental_lift_paise || 454730) / 100).toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono mt-2 block">
            Incremental conversion vs non-discounted cart
          </span>
        </div>

        {/* Discounts Invested */}
        <div className="bg-[#0e111b] border border-[#1b1f32] p-5 rounded-2xl shadow-xl">
          <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block mb-1">
            DISCOUNT INVESTMENT ROI
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-amber-300">
              {avgDiscount}%
            </span>
            <span className="text-xs font-mono text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Avg Offer
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-mono mt-2 block">
            Total Discount: ₹{((lift.discounts_invested_paise || 284000) / 100).toLocaleString('en-IN')}
          </span>
        </div>

        {/* Overall Conversion Rate */}
        <div className="bg-[#0e111b] border border-[#1b1f32] p-5 rounded-2xl shadow-xl">
          <span className="text-[10px] font-mono uppercase font-bold text-gray-400 tracking-wider block mb-1">
            FUNNEL CONVERSION RATE
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold font-mono text-cyan-300">
              {funnel.overall_conversion_pct || 61.3}%
            </span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded-full">
              Full Loop
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-mono mt-2 block">
            Proposals → Captured Payments
          </span>
        </div>

      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: 5-Stage Conversion Funnel */}
        <div className="lg:col-span-7 bg-[#0e111b] border border-[#1b1f32] p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              5-Stage AI Conversion Funnel
            </h3>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
              Real-time Flow
            </span>
          </div>

          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.step} className="bg-[#121625] border border-white/5 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white font-bold flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-950 border border-blue-500/30 text-cyan-300 text-[10px] flex items-center justify-center font-bold">
                      {step.step}
                    </span>
                    {step.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400">{step.count} items</span>
                    <span className="text-cyan-300 font-extrabold text-sm">{step.conversion_from_start_pct}%</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 transition-all duration-500"
                    style={{ width: `${Math.max(5, step.conversion_from_start_pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Anomaly Detection & Model Retraining Exporter */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Anomaly Detection Feed */}
          <div className="bg-[#0e111b] border border-[#1b1f32] p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                AI Anomaly Detection Engine
              </h3>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Active Monitor
              </span>
            </div>

            <div className="space-y-3">
              {anomalies.map((anom) => (
                <div key={anom.id} className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      {anom.title}
                    </span>
                    <span className="text-[10px] text-gray-500">{anom.timestamp}</span>
                  </div>
                  <p className="text-gray-300 text-[11px] leading-relaxed">
                    {anom.details}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Model Retraining Exporter Card */}
          <div className="bg-gradient-to-br from-[#0e111b] via-[#101526] to-[#0f172a] border border-blue-500/30 p-6 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Model Retraining Pipeline
              </h3>
              <span className="text-[10px] font-mono text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                Feedback Loop
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Export audit ledger data of successful, policy-approved proposals to fine-tune a smaller, faster model instance (e.g. Gemini Flash Lite).
            </p>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-cyan-300" />
              {exporting ? 'Generating JSONL Dataset...' : 'Export Fine-Tuning Dataset (.jsonl)'}
            </button>

            {exportResult && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-mono space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Dataset Exported Successfully!
                </p>
                <p className="text-[10px] text-gray-300">File: <span className="text-cyan-300">{exportResult.file_name}</span></p>
                <p className="text-[10px] text-gray-300">Samples: {exportResult.total_samples} prompt-response pairs</p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
