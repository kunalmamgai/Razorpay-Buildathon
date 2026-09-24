import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Check, ChevronRight, CircleDollarSign, Clock3,
  FileCheck2, Menu, Play, ShieldCheck, Sparkles, Store, X,
} from 'lucide-react'

const schedules = [
  { label: 'Cart intelligence', trigger: 'CRON · 08:30', state: 'LIVE', icon: BarChart3, color: 'text-sky-600', bg: 'bg-sky-50' },
  { label: 'Approval queue', trigger: 'WEBHOOK', state: 'LIVE', icon: FileCheck2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Memory maintenance', trigger: 'ADAPTIVE', state: 'READY', icon: Clock3, color: 'text-amber-600', bg: 'bg-amber-50' },
]

const inbox = [
  { title: 'Bundle proposal ready', detail: 'The Brain found a high-intent cart opportunity', time: '8m', color: 'bg-sky-500' },
  { title: 'Approval required', detail: 'A 16% offer is waiting at the Human Gate', time: '1h', color: 'bg-amber-500' },
  { title: 'Payment recovery complete', detail: 'A failed payment was safely reverted', time: '4h', color: 'bg-emerald-500' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const launchDemo = () => {
    try {
      sessionStorage.setItem('marlin_demo_autofill', 'true')
    } catch (error) {
      console.error(error)
    }
    navigate('/store')
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f7f2] text-[#111827] selection:bg-[#d7ff4f] selection:text-[#111827]">
      <header className="border-b border-[#dfe1d7] bg-[#f7f7f2]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-[#d7ff4f]">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-sm font-black tracking-[-0.03em]">RAZORCAGE<span className="text-[#6f7e00]">.AI</span></span>
          </Link>

          <nav className="hidden items-center gap-7 text-xs font-bold text-[#5f665c] md:flex">
            <a href="#system" className="transition hover:text-[#111827]">System</a>
            <a href="#guardrails" className="transition hover:text-[#111827]">Guardrails</a>
            <a href="#inbox" className="transition hover:text-[#111827]">Agent inbox</a>
            <Link to="/dashboard" className="transition hover:text-[#111827]">Mission control</Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/store" className="text-xs font-bold text-[#5f665c] transition hover:text-[#111827]">Open storefront</Link>
            <button onClick={launchDemo} className="flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#283344]">
              Launch demo <ArrowRight className="h-3.5 w-3.5 text-[#d7ff4f]" />
            </button>
          </div>

          <button className="rounded-full border border-[#cfd3c6] p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#dfe1d7] px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-sm font-bold text-[#5f665c]">
              <a href="#system" onClick={() => setMenuOpen(false)}>System</a>
              <a href="#guardrails" onClick={() => setMenuOpen(false)}>Guardrails</a>
              <Link to="/dashboard">Mission control</Link>
              <button onClick={launchDemo} className="flex items-center gap-2 text-left text-[#111827]">Launch demo <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="relative border-b border-[#dfe1d7] px-5 pb-16 pt-14 lg:px-8 lg:pb-24 lg:pt-24">
          <div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-[1.06fr_.94fr] lg:gap-20">
            <div>
              <div className="mb-7 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#6f7e00]">
                <span className="h-2 w-2 rounded-full bg-[#b5d900] shadow-[0_0_0_5px_rgba(181,217,0,.16)]" /> Bounded commerce intelligence
              </div>
              <h1 className="max-w-4xl text-[clamp(3.7rem,8vw,8rem)] font-black leading-[.88] tracking-[-0.085em] text-[#111827]">
                Growth that keeps its <span className="text-[#6f7e00]">context.</span>
              </h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-[#687066] lg:text-lg">
                RazorCage turns every merchant signal into a safe, explainable action. Propose offers, enforce policy, and move payment decisions forward without losing the trail.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button onClick={launchDemo} className="group flex items-center gap-3 rounded-full bg-[#111827] px-5 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#283344]">
                  <Play className="h-4 w-4 fill-[#d7ff4f] text-[#d7ff4f]" /> Explore the live flow <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
                <Link to="/dashboard" className="flex items-center gap-2 rounded-full border border-[#bfc5b6] px-5 py-3.5 text-sm font-bold text-[#111827] transition hover:border-[#111827]">
                  View mission control <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#8b9186]">
                <span>● 3-layer safety model</span><span>● Razorpay test mode</span><span>● Merchant-scoped ledger</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 bg-[#d7ff4f]/40 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-[#cfd3c6] bg-[#111827] p-3 shadow-[0_30px_80px_rgba(17,24,39,.18)]">
                <div className="rounded-[1.5rem] border border-white/10 bg-[#192234] p-5 text-white sm:p-7">
                  <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-xs font-black tracking-[0.16em] text-[#d7ff4f]">LIVE CONTROL ROOM</span>
                    <span className="flex items-center gap-2 text-[10px] font-bold text-[#aeb8af]"><span className="h-2 w-2 rounded-full bg-[#b5d900]" /> ALL SYSTEMS GO</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-b border-white/10 pb-7">
                    <div><p className="text-[10px] text-[#8e9a9d]">PROPOSALS</p><p className="mt-2 text-3xl font-black">1,284</p></div>
                    <div><p className="text-[10px] text-[#8e9a9d]">APPROVED</p><p className="mt-2 text-3xl font-black text-[#d7ff4f]">942</p></div>
                    <div><p className="text-[10px] text-[#8e9a9d]">AUDIT RATE</p><p className="mt-2 text-3xl font-black">100%</p></div>
                  </div>
                  <div className="mt-6 space-y-3">
                    {['Brain proposes 12% bundle', 'Cage validates discount', 'Ledger records decision'].map((step, index) => (
                      <div key={step} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${index === 1 ? 'bg-[#d7ff4f] text-[#111827]' : 'bg-white/10 text-white'}`}>{index + 1}</span>
                        <span className="text-xs font-bold text-[#dce5dc]">{step}</span>
                        <Check className="ml-auto h-4 w-4 text-[#d7ff4f]" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center justify-between rounded-xl bg-[#d7ff4f] px-4 py-3 text-[#111827]">
                    <span className="text-xs font-black">Safe to execute</span><ShieldCheck className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="system" className="border-b border-[#dfe1d7] px-5 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div><p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-[#6f7e00]">The operating model</p><h2 className="max-w-2xl text-4xl font-black leading-none tracking-[-.06em] sm:text-6xl">Every decision has a place to land.</h2></div>
              <p className="max-w-sm text-sm leading-6 text-[#687066]">A continuous loop from merchant signal to governed checkout. Nothing important disappears inside the model.</p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-3xl border border-[#cfd3c6] bg-[#cfd3c6] md:grid-cols-3">
              {[
                { image: '/onboarding/layer1.png', number: '01', title: 'Brain', text: 'Gemini turns cart and order context into a structured, explainable proposal.', color: 'bg-[#e5f4ff]' },
                { image: '/onboarding/layer2.png', number: '02', title: 'Cage', text: 'Pure rules validate SKUs, caps, amounts, and whether a human must approve.', color: 'bg-[#eff7d0]' },
                { image: '/onboarding/layer3.png', number: '03', title: 'Ledger', text: 'Every proposal, clamp, approval, payment, and recovery remains traceable.', color: 'bg-[#fff1d8]' },
              ].map(item => (
                <article key={item.number} className={`group ${item.color} p-5 sm:p-7`}>
                  <div className="mb-8 flex items-center justify-between"><span className="text-xs font-black text-[#697267]">{item.number}</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></div>
                  <div className="mb-7 h-36 overflow-hidden rounded-2xl border border-black/10 bg-white/40"><img src={item.image} alt={`${item.title} layer`} className="h-full w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-105" /></div>
                  <h3 className="text-3xl font-black tracking-[-.05em]">{item.title}</h3><p className="mt-3 max-w-xs text-sm leading-6 text-[#687066]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="guardrails" className="bg-[#111827] px-5 py-16 text-white lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <div><p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-[#d7ff4f]">Flexible scheduling, strict bounds</p><h2 className="max-w-xl text-4xl font-black leading-[.95] tracking-[-.06em] sm:text-6xl">Let the agent move. Keep the rules fixed.</h2><p className="mt-6 max-w-md text-sm leading-6 text-[#aeb8af]">RazorCage gives autonomous commerce a dependable rhythm: campaigns can run on schedule, approvals can arrive by signal, and every payment stays inside a policy envelope.</p></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {schedules.map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[.05] p-4 transition hover:-translate-y-1 hover:border-[#d7ff4f]/50"><div className={`mb-12 flex h-9 w-9 items-center justify-center rounded-xl ${item.bg} ${item.color}`}><Icon className="h-4 w-4" /></div><p className="text-sm font-black">{item.label}</p><p className="mt-2 text-[10px] font-bold tracking-wider text-[#89968d]">{item.trigger}</p><span className="mt-5 inline-flex rounded-full border border-[#d7ff4f]/30 px-2 py-1 text-[9px] font-black tracking-widest text-[#d7ff4f]">{item.state}</span></div> })}
            </div>
          </div>
        </section>

        <section id="inbox" className="px-5 py-16 lg:px-8 lg:py-24">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div className="order-2 rounded-3xl border border-[#cfd3c6] bg-white p-4 shadow-[0_24px_70px_rgba(32,42,32,.08)] sm:p-6 lg:order-1">
              <div className="mb-5 flex items-center justify-between border-b border-[#e4e6df] pb-4"><span className="text-xs font-black tracking-[.15em]">AGENT INBOX</span><span className="rounded-full bg-[#eff7d0] px-2.5 py-1 text-[10px] font-black text-[#667500]">3 NEW</span></div>
              <div className="space-y-2">{inbox.map(item => <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-[#edf0e9] p-3 transition hover:bg-[#f7f7f2]"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{item.title}</p><p className="truncate text-xs text-[#7b8378]">{item.detail}</p></div><span className="text-[10px] font-bold text-[#98a094]">{item.time}</span></div>)}</div>
              <Link to="/approvals" className="mt-5 flex items-center justify-between rounded-xl bg-[#111827] px-4 py-3 text-xs font-bold text-white">Open approval queue <ArrowRight className="h-4 w-4 text-[#d7ff4f]" /></Link>
            </div>
            <div className="order-1 lg:order-2"><p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-[#6f7e00]">One focused queue</p><h2 className="text-4xl font-black leading-[.95] tracking-[-.06em] sm:text-6xl">Keep the work moving, not the tabs.</h2><p className="mt-6 max-w-md text-sm leading-6 text-[#687066]">Review proposals, recovery events, and campaign signals in one calm surface. When action is needed, the next step is obvious.</p><div className="mt-7 flex flex-wrap gap-2"><Link to="/campaigns" className="rounded-full border border-[#bfc5b6] px-4 py-2.5 text-xs font-bold transition hover:border-[#111827]">Campaigns</Link><Link to="/audit" className="rounded-full border border-[#bfc5b6] px-4 py-2.5 text-xs font-bold transition hover:border-[#111827]">Audit logs</Link></div></div>
          </div>
        </section>

        <section className="border-t border-[#dfe1d7] bg-[#d7ff4f] px-5 py-16 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 md:flex-row md:items-end"><div><p className="mb-3 text-[10px] font-black uppercase tracking-[.2em] text-[#566000]">Ready when you are</p><h2 className="max-w-3xl text-5xl font-black leading-[.9] tracking-[-.07em] sm:text-7xl">Make your next offer earn its way in.</h2></div><button onClick={launchDemo} className="flex shrink-0 items-center gap-3 rounded-full bg-[#111827] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#283344]">Start with a live cart <ArrowRight className="h-4 w-4 text-[#d7ff4f]" /></button></div>
        </section>
      </main>

      <footer className="bg-[#f7f7f2] px-5 py-7 lg:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-4 text-xs text-[#687066] sm:flex-row sm:items-center sm:justify-between"><span className="font-black tracking-[-.02em] text-[#111827]">RAZORCAGE<span className="text-[#6f7e00]">.AI</span></span><span>Explainable, bounded commerce intelligence · Razorpay AI Commerce Hackathon</span><div className="flex gap-4 font-bold"><Link to="/store">Storefront</Link><Link to="/dashboard">Mission control</Link></div></div></footer>
    </div>
  )
}
