import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ShieldCheck, Sparkles, LayoutDashboard, ShoppingBag, CheckSquare, FileText, Store, Menu, X } from 'lucide-react'
import { fetchMerchants, getActiveMerchant, setActiveMerchant } from '../api'

export default function Navbar({ cartCount = 0 }) {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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

  const navLinks = [
    { to: '/', label: 'Overview', icon: ShieldCheck, active: isLanding, color: 'text-cyan-400', activeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
    { to: '/dashboard', label: 'Mission Control', icon: LayoutDashboard, active: isDashboard, color: 'text-purple-400', activeStyle: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
    { to: '/store', label: 'Storefront', icon: ShoppingBag, active: isStore, color: 'text-blue-400', activeStyle: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
    { to: '/campaigns', label: 'Campaigns', icon: Sparkles, active: isCampaigns, color: 'text-amber-400', activeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    { to: '/approvals', label: 'Approvals', icon: CheckSquare, active: isApprovals, color: 'text-emerald-400', activeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    { to: '/audit', label: 'Audit Logs', icon: FileText, active: isAudit, color: 'text-cyan-400', activeStyle: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-[#0d0f17]/95 backdrop-blur-md border-b border-gray-800 text-white transition-colors duration-200 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        
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
                Marlin <span className="text-xs uppercase font-semibold tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.2 rounded">Intelligence</span>
              </span>
              <span className="text-xs text-gray-400 hidden lg:inline">Explainable & Bounded AI</span>
            </div>
          </Link>
        </div>

        {/* Center Main Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all duration-150 flex items-center gap-2 border ${
                  link.active
                    ? `${link.activeStyle} shadow-sm`
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${link.color}`} />
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Right Section: Merchant Selector & Mobile Hamburger Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#121625] border border-cyan-500/30 px-2.5 py-1 rounded-xl text-xs shadow-inner">
            <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={activeMerchantId}
              onChange={handleMerchantChange}
              className="bg-transparent text-white text-xs font-mono font-semibold focus:outline-none cursor-pointer pr-1"
            >
              {merchants.map(m => (
                <option key={m.merchant_id} value={m.merchant_id} className="bg-[#0e111b] text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-[#121625] border border-white/10 text-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d0f17] border-b border-gray-800 px-4 py-3 space-y-1.5 font-mono animate-fadeIn">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 border ${
                  link.active
                    ? link.activeStyle
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/60 border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${link.color}`} />
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
