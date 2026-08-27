import {
  Activity, CheckCircle2, ShieldAlert, Hourglass, XCircle, CreditCard, AlertTriangle,
} from 'lucide-react'

const STAT_ITEMS = [
  { key: 'total_proposals', label: 'Proposals', color: 'text-gray-300', Icon: Activity },
  { key: 'approved', label: 'Approved', color: 'text-approved', Icon: CheckCircle2 },
  { key: 'clamped', label: 'Clamped', color: 'text-clamped', Icon: ShieldAlert },
  { key: 'awaiting_approval', label: 'Awaiting', color: 'text-clamped', Icon: Hourglass },
  { key: 'rejected', label: 'Rejected', color: 'text-rejected', Icon: XCircle },
  { key: 'paid', label: 'Paid', color: 'text-approved', Icon: CreditCard },
  { key: 'failed', label: 'Failed', color: 'text-rejected', Icon: AlertTriangle },
]

function OutcomeDonut({ stats }) {
  const total = stats.total_proposals || 0
  if (!total) return null

  const green = ((stats.approved || 0) + (stats.paid || 0)) / total * 100
  const amber = ((stats.clamped || 0) + (stats.awaiting_approval || 0)) / total * 100
  const red = ((stats.rejected || 0) + (stats.failed || 0)) / total * 100

  let acc = 0
  const stops = [
    { pct: green, color: '#10B981' },
    { pct: amber, color: '#F59E0B' },
    { pct: red, color: '#EF4444' },
  ]
    .filter(s => s.pct > 0)
    .map(s => {
      const from = acc
      acc += s.pct
      return `${s.color} ${from}% ${acc}%`
    })
  stops.push('#372E52 0% 100%')

  return (
    <div className="bg-dusk-card rounded-xl p-3 flex items-center gap-3">
      <div
        className="w-14 h-14 rounded-full shrink-0"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      >
        <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: '#211B36' }}>
          <div className="w-[80%] h-[80%] rounded-full flex items-center justify-center bg-dusk-card">
            <span className="text-xs font-bold font-mono text-white">{total}</span>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400">Outcome mix</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          <span className="text-approved">●</span> pass{' '}
          <span className="text-clamped">●</span> held{' '}
          <span className="text-rejected">●</span> fail
        </p>
      </div>
    </div>
  )
}

export default function StatStrip({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
      {STAT_ITEMS.map(({ key, label, color, Icon }) => (
        <div key={key} className="bg-dusk-card border border-dusk-border/50 rounded-xl p-3 flex flex-col items-center justify-center">
          <Icon className={`w-4 h-4 mb-1.5 ${color}`} />
          <p className="text-xl font-bold font-mono text-white leading-none">
            {stats[key] ?? 0}
          </p>
          <p className={`text-[11px] mt-1.5 ${color}`}>{label}</p>
        </div>
      ))}
      <OutcomeDonut stats={stats} />
    </div>
  )
}
