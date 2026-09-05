import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, Sparkles, ArrowRight, ShieldCheck, Cpu, Lock, FileText, CheckCircle2, ChevronRight, Play } from 'lucide-react'
import Navbar from '../components/Navbar'

export default function Onboarding() {
  const navigate = useNavigate()
  const [activeCard, setActiveCard] = useState(null)

  const handleGetStarted = (mode = 'storefront') => {
    if (mode === 'demo') {
      try {
        sessionStorage.setItem('marlin_demo_autofill', 'true')
      } catch (e) {
        console.error(e)
      }
      navigate('/store')
    } else if (mode === 'dashboard') {
      navigate('/dashboard')
    } else {
      navigate('/store')
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col selection:bg-blue-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting glows matching dark theme */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-blue-900/15 via-indigo-900/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[400px] h-[400px] bg-cyan-900/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-purple-900/10 blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <Navbar />

      {/* Sub-Header Branding Bar & Close Button */}
      <div className="max-w-6xl w-full mx-auto px-6 pt-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
            RAZORCAGE INTELLIGENCE
          </span>
        </div>
        <button
          onClick={() => navigate('/store')}
          className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-800/80 transition-all duration-200"
          title="Go to Storefront"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 pt-4 pb-16 flex-1 flex flex-col justify-center z-10 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            How RazorCage Keeps AI Honest
          </h1>
          <p className="text-gray-400 text-sm sm:text-base md:text-lg leading-relaxed font-normal">
            Our three-layer safety model ensures every AI action is proposed intelligently,
            governed strictly, and recorded permanently. We call it the{' '}
            <span className="text-gray-200 font-semibold underline decoration-cyan-500/50 underline-offset-4">
              Explainable, Bounded, and Gated
            </span>{' '}
            framework.
          </p>
        </div>

        {/* 3 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-14">
          
          {/* LAYER 01 - The Brain */}
          <div
            onClick={() => setActiveCard(activeCard === 1 ? null : 1)}
            className={`group relative bg-[#0e111b] border ${
              activeCard === 1 ? 'border-cyan-400 shadow-lg shadow-cyan-500/10' : 'border-[#1b1f32] hover:border-cyan-500/40'
            } rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden`}
          >
            <div>
              {/* Image Frame */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-5 bg-[#090b11] border border-white/5 shadow-inner">
                <img
                  src="/onboarding/layer1.png"
                  alt="Layer 01 - The Brain AI Agent"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e111b] via-transparent to-transparent opacity-60" />
                <span className="absolute bottom-2.5 left-3 text-[10px] font-mono tracking-wider font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2 py-0.5 rounded backdrop-blur-md">
                  A.I. AGENT
                </span>
              </div>

              {/* Badges & Layer Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-wider text-blue-400 uppercase font-mono">
                  LAYER 01
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                  AI PROPOSED
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                The Brain
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                <strong className="text-gray-200">Explainable Intelligence.</strong> The AI continually analyzes context and user behavior. It proactively proposes optimal actions, such as calculating dynamic discounts or suggesting workflow automations, with full reasoning for every suggestion.
              </p>
            </div>

            {/* Interactive Expansion Hint */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-blue-400 font-medium">
              <span className="flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Proposes Dynamic Offers
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeCard === 1 ? 'rotate-90 text-cyan-300' : ''}`} />
            </div>

            {/* Detail Drawer if clicked */}
            {activeCard === 1 && (
              <div className="mt-3 p-3 rounded-lg bg-blue-950/40 border border-blue-500/20 text-xs text-gray-300 space-y-1.5 animate-fadeIn font-mono">
                <p className="text-cyan-300 font-semibold text-[11px]">💡 Real-time Reasoning Example:</p>
                <p className="text-[11px] text-gray-400 italic">"Cart: 2 electronics items (₹4,500). High purchase intent detected. Recommending 12% bundle discount to improve conversion."</p>
              </div>
            )}
          </div>

          {/* LAYER 02 - The Cage */}
          <div
            onClick={() => setActiveCard(activeCard === 2 ? null : 2)}
            className={`group relative bg-[#0e111b] border ${
              activeCard === 2 ? 'border-amber-400 shadow-lg shadow-amber-500/10' : 'border-[#1b1f32] hover:border-amber-500/40'
            } rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden`}
          >
            <div>
              {/* Image Frame */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-5 bg-[#090b11] border border-white/5 shadow-inner">
                <img
                  src="/onboarding/layer2.png"
                  alt="Layer 02 - The Cage Policy Check"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e111b] via-transparent to-transparent opacity-60" />
                <span className="absolute bottom-2.5 left-3 text-[10px] font-mono tracking-wider font-semibold text-amber-300 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded backdrop-blur-md">
                  POLICY CHECK
                </span>
              </div>

              {/* Badges & Layer Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase font-mono">
                  LAYER 02
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  POLICY CHECK
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                The Cage
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                <strong className="text-gray-200">Bounded Execution.</strong> Before execution, every proposal hits our deterministic rules engine. The Cage evaluates actions against hardcoded business logic and financial limits. It ensures AI never operates outside your defined safety parameters.
              </p>
            </div>

            {/* Interactive Expansion Hint */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-amber-400 font-medium">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Deterministic Guardrails
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeCard === 2 ? 'rotate-90 text-amber-300' : ''}`} />
            </div>

            {/* Detail Drawer if clicked */}
            {activeCard === 2 && (
              <div className="mt-3 p-3 rounded-lg bg-amber-950/40 border border-amber-500/20 text-xs text-gray-300 space-y-1.5 animate-fadeIn font-mono">
                <p className="text-amber-300 font-semibold text-[11px]">🛡️ Hardcoded Safety Rules:</p>
                <ul className="text-[10px] text-gray-400 list-disc list-inside space-y-0.5">
                  <li>Max discount cap: 20%</li>
                  <li>Min cart total: ₹500</li>
                  <li>Discounts &gt; 15% require Human Gate</li>
                </ul>
              </div>
            )}
          </div>

          {/* LAYER 03 - The Ledger */}
          <div
            onClick={() => setActiveCard(activeCard === 3 ? null : 3)}
            className={`group relative bg-[#0e111b] border ${
              activeCard === 3 ? 'border-emerald-400 shadow-lg shadow-emerald-500/10' : 'border-[#1b1f32] hover:border-emerald-500/40'
            } rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer overflow-hidden`}
          >
            <div>
              {/* Image Frame */}
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-5 bg-[#090b11] border border-white/5 shadow-inner">
                <img
                  src="/onboarding/layer3.png"
                  alt="Layer 03 - The Ledger Immutable Audit"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e111b] via-transparent to-transparent opacity-60" />
                <span className="absolute bottom-2.5 left-3 text-[10px] font-mono tracking-wider font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded backdrop-blur-md">
                  IMMUTABLE AUDIT
                </span>
              </div>

              {/* Badges & Layer Label */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase font-mono">
                  LAYER 03
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  IMMUTABLE AUDIT
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                The Ledger
              </h3>

              {/* Description */}
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                <strong className="text-gray-200">Gated Accountability.</strong> Every single step—what was proposed, why it was approved, and the final outcome—is permanently recorded in a secure, transparent audit log. Total accountability for every automated decision.
              </p>
            </div>

            {/* Interactive Expansion Hint */}
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-emerald-400 font-medium">
              <span className="flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                100% Audit Logging
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeCard === 3 ? 'rotate-90 text-emerald-300' : ''}`} />
            </div>

            {/* Detail Drawer if clicked */}
            {activeCard === 3 && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-xs text-gray-300 space-y-1.5 animate-fadeIn font-mono">
                <p className="text-emerald-300 font-semibold text-[11px]">📜 Audit Record Output:</p>
                <p className="text-[10px] text-gray-400">HASH: <span className="text-emerald-400">e9f8...7a2d</span> | AI: 12% | CAGE: PASS | GATE: APPROVED</p>
              </div>
            )}
          </div>

        </div>

        {/* Get Started Section */}
        <div className="bg-gradient-to-r from-[#0d1222] via-[#10172e] to-[#0f1428] border border-blue-500/20 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
            <div className="max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Ready to test Marlin Commerce?
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Experience Explainable AI Shopping
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-2 leading-relaxed">
                Add products to cart on our store to see the AI Brain propose dynamic discounts, watched live by the Cage rules engine and recorded into Mission Control.
              </p>
            </div>

            {/* Action Buttons / Get Started Options */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <button
                onClick={() => handleGetStarted('demo')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                Get Started (Launch Demo)
              </button>

              <button
                onClick={() => handleGetStarted('storefront')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm transition-all duration-200"
              >
                Browse Storefront
                <ArrowRight className="w-4 h-4 text-cyan-300" />
              </button>

              <button
                onClick={() => handleGetStarted('dashboard')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 font-semibold text-sm transition-all duration-200"
              >
                Mission Control
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-[#090b11] py-6 px-6 text-center text-xs text-gray-500 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            RazorCage Intelligence Framework &middot; Razorpay AI Commerce Hackathon
          </span>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-white transition">Overview</Link>
            <Link to="/store" className="hover:text-white transition">Storefront</Link>
            <Link to="/dashboard" className="hover:text-white transition">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
