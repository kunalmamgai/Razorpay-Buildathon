import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldCheck, Sparkles, LayoutDashboard, ShoppingBag, CheckSquare, FileText, Store } from 'lucide-react'
import { fetchMerchants, getActiveMerchant, setActiveMerchant } from '../api'

export default function Navbar({ cartCount = 0 }) {
  const location = useLocation()
  const [merchants, setMerchants] = useState([
    { merchant_id: 'merchant_default', name: 'Marlin Store (Default)' },
    { merchant_id: 'apex_electronics', name: 'Apex Electronics' },
    { merchant_id: 'nexus_fashion', name: 'Nexus Luxury Fashion' },
  ])
  const [activeMerchantId, setActiveMerchantId] = useState(getActiveMerchant())

  useEffect(() => {
    fetchMerchants()
      .then(res => {
        if (res.merchants && res.merchants.length > 0) {
          setMerchants(res.merchants)
        }
      })
      .catch(console.error)
  }, [])

  const handleMerchantChange = (e) => {
    const newId = e.target.value
    setActiveMerchantId(newId)
    setActiveMerchant(newId)
  }

  const isStore = location.pathname === '/store' || location.pathname === '/storefront'
  const isDashboard = location.pathname === '/dashboard'
  const isCampaigns = location.pathname === '/campaigns'
  const isApprovals = location.pathname === '/approvals'
  const isAudit = location.pathname === '/audit' || location.pathname === '/audit-logs'
  const isLanding = location.pathname === '/' || location.pathname === '/onboarding'

  return (
    <nav className="sticky top-0 z-50 bg-[#0d0f17]/95 backdrop-blur-md border-b border-gray-800 text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        
        {/* Left Brand Logo & Tagline */}
        <div className="flex items-center shrink-0">
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
              <span className="text-[10px] text-gray-400 hidden lg:inline">Explainable & Bounded AI</span>
            </div>
          </Link>
        </div>

        {/* Center Main Navigation Links */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 overflow-x-auto py-1">
          <Link
            to="/"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 ${
              isLanding
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            Overview
          </Link>

          <Link
            to="/dashboard"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 ${
              isDashboard
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-purple-400" />
            Mission Control
          </Link>

          <Link
            to="/store"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 ${
              isStore
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
            Storefront
          </Link>

          <Link
            to="/campaigns"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 ${
              isCampaigns
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Campaigns
          </Link>

          <Link
            to="/approvals"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 ${
              isApprovals
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            Approvals
          </Link>

          <Link
            to="/audit"
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-2 shrink-0 ${
              isAudit
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            Audit Logs
          </Link>
        </div>

        {/* Right Section: Merchant Tenant Selector & Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Multi-Tenant Switcher */}
          <div className="flex items-center gap-1.5 bg-[#121625] border border-cyan-500/30 px-2.5 py-1 rounded-xl text-xs shadow-inner">
            <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={activeMerchantId}
              onChange={handleMerchantChange}
              className="bg-transparent text-white text-[11px] font-mono font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {merchants.map(m => (
                <option key={m.merchant_id} value={m.merchant_id} className="bg-[#0e111b] text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active 3-Layer Model Badge */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-gray-300 bg-[#121625] px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono font-medium">3-Layer Safety Active</span>
          </div>

          {/* Cart Counter Badge if in Storefront */}
          {cartCount > 0 && (
            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-xs font-semibold text-blue-300 shadow-sm">
              <ShoppingBag className="w-3.5 h-3.5" />
              {cartCount}
            </span>
          )}
        </div>

      </div>
    </nav>
  )
}
