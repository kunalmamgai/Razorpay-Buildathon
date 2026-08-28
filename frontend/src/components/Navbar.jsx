import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ShieldCheck, Sparkles, LayoutDashboard, ShoppingBag, ArrowRight, Zap, CheckSquare, FileText } from 'lucide-react'

export default function Navbar({ cartCount = 0 }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isStore = location.pathname === '/store' || location.pathname === '/storefront'
  const isDashboard = location.pathname === '/dashboard'
  const isCampaigns = location.pathname === '/campaigns'
  const isApprovals = location.pathname === '/approvals'
  const isAudit = location.pathname === '/audit' || location.pathname === '/audit-logs'
  const isLanding = location.pathname === '/' || location.pathname === '/onboarding'

  const handleGetStartedClick = () => {
    try {
      sessionStorage.setItem('marlin_demo_autofill', 'true')
    } catch (e) {
      console.error(e)
    }
    navigate('/store')
  }

  return (
    <nav className="sticky top-0 z-50 bg-[#0d0f17]/90 backdrop-blur-md border-b border-gray-800 text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        
        {/* Brand logo & tagline */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <span className="w-full h-full bg-[#0d0f17] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </span>
            </span>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-tight flex items-center gap-1.5 text-base">
                Marlin <span className="text-[10px] uppercase font-semibold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.2 rounded">Intelligence</span>
              </span>
              <span className="text-[10px] text-gray-400 hidden sm:inline">Explainable & Bounded AI</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1 pl-4 border-l border-gray-800">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isLanding
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              Overview
            </Link>

            <Link
              to="/store"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isStore
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Storefront
            </Link>

            <Link
              to="/campaigns"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isCampaigns
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Campaigns
            </Link>

            <Link
              to="/approvals"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isApprovals
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              Approvals
            </Link>

            <Link
              to="/audit"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isAudit
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Audit Logs
            </Link>

            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 ${
                isDashboard
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Mission Control
            </Link>
          </div>
        </div>

        {/* Right side CTA & Status */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 bg-gray-900/80 px-2.5 py-1 rounded-full border border-gray-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono text-gray-300">3-Layer Safety Model Active</span>
          </div>

          {/* Cart Counter Badge if in Storefront */}
          {cartCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-xs font-semibold text-blue-300">
              <ShoppingBag className="w-3.5 h-3.5" />
              {cartCount}
            </span>
          )}

          {/* Get Started Button */}
          <button
            onClick={handleGetStartedClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-200 group active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300/30" />
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-200 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </nav>
  )
}
