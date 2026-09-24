import { ArrowRight, Check, CircleDollarSign, Clock3, FileCheck2, LockKeyhole, Sparkles } from 'lucide-react'

const productImages = ['/products/SKU_101.jpg', '/products/SKU_102.jpg', '/products/SKU_103.jpg']

function ProductMosaic() {
  return (
    <div className="grid grid-cols-[1.25fr_.75fr] gap-2">
      <div className="relative row-span-2 min-h-36 overflow-hidden rounded-2xl bg-[#e5f4ff]"><img src={productImages[0]} alt="Featured merchant product" className="h-full w-full object-cover mix-blend-multiply" /><span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-black text-[#28729c]">HIGH INTENT</span></div>
      {productImages.slice(1).map((image, index) => <div key={image} className="relative h-[70px] overflow-hidden rounded-2xl bg-[#eff7d0]"><img src={image} alt="Merchant catalog product" className="h-full w-full object-cover mix-blend-multiply" /><span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[8px] font-black text-[#667500]">SKU 10{index + 2}</span></div>)}
    </div>
  )
}

function ScheduleVisual() {
  const rows = [['Cart intelligence', 78, '08:30'], ['Approval queue', 52, 'WEBHOOK'], ['Campaign review', 66, 'HOURLY'], ['Payment recovery', 38, 'EVENT']]
  return <div className="space-y-3">{rows.map(([label, width, trigger]) => <div key={label}><div className="mb-1 flex items-center justify-between text-[10px] font-bold"><span>{label}</span><span className="text-[#8a9286]">{trigger}</span></div><div className="h-2 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#111827]" style={{ width: `${width}%` }} /></div></div>)}</div>
}

function ApprovalVisual() {
  return <div className="flex items-center justify-between gap-1"><div className="flex flex-col items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e5f4ff] text-[#28729c]"><Sparkles className="h-4 w-4" /></span><span className="text-[9px] font-black">BRAIN</span></div><ArrowRight className="h-4 w-4 text-[#a0a79d]" /><div className="flex flex-col items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#fff1d8] text-[#9a6400]"><LockKeyhole className="h-4 w-4" /></span><span className="text-[9px] font-black">CAGE</span></div><ArrowRight className="h-4 w-4 text-[#a0a79d]" /><div className="flex flex-col items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eff7d0] text-[#3d7a32]"><Check className="h-4 w-4" /></span><span className="text-[9px] font-black">GATE</span></div></div>
}

function LedgerVisual() {
  return <div className="grid grid-cols-5 items-end gap-2">{[42, 68, 54, 86, 72].map((height, index) => <div key={index} className="space-y-1"><div className="rounded-t-md bg-[#111827]" style={{ height: `${height}px` }} /><span className="block text-center text-[8px] font-mono text-[#8a9286]">{`B${850 + index}`}</span></div>)}</div>
}

export default function OperationsVisual({ variant = 'products', dark = false, className = '' }) {
  const content = {
    products: { label: 'CATALOG SIGNAL', title: 'Visual context from the cart', body: 'Product and order context gives every offer a reason to exist.', visual: <ProductMosaic />, icon: CircleDollarSign },
    schedule: { label: 'RUN RHYTHM', title: 'Signals become scheduled work', body: 'A compact view of the recurring paths the agent can operate.', visual: <ScheduleVisual />, icon: Clock3 },
    approvals: { label: 'HUMAN GATE', title: 'Every risky action stops here', body: 'The approval path keeps high-value decisions visible and deliberate.', visual: <ApprovalVisual />, icon: FileCheck2 },
    ledger: { label: 'LEDGER PULSE', title: 'The record keeps moving', body: 'Each event becomes a durable, inspectable block in the audit trail.', visual: <LedgerVisual />, icon: LockKeyhole },
  }[variant]
  const Icon = content.icon

  return <article className={`overflow-hidden rounded-2xl border p-4 ${dark ? 'border-white/10 bg-white/[.05] text-white' : 'border-[#cfd3c6] bg-white text-[#111827]'} ${className}`}><div className="mb-4 flex items-start justify-between gap-3"><div><p className={`text-[9px] font-black uppercase tracking-[.18em] ${dark ? 'text-[#d7ff4f]' : 'text-[#6f7e00]'}`}>{content.label}</p><h3 className="mt-1 text-sm font-black">{content.title}</h3></div><Icon className={`h-4 w-4 ${dark ? 'text-[#d7ff4f]' : 'text-[#667500]'}`} /></div><div className="mb-4">{content.visual}</div><p className={`text-[11px] leading-5 ${dark ? 'text-white/50' : 'text-[#687066]'}`}>{content.body}</p></article>
}
