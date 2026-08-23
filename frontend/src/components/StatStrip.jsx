const STAT_ITEMS = [
  { key: 'total_proposals', label: 'Total Proposals', color: 'text-white' },
  { key: 'approved', label: 'Approved', color: 'text-approved' },
  { key: 'clamped', label: 'Clamped', color: 'text-clamped' },
  { key: 'awaiting_approval', label: 'Awaiting', color: 'text-clamped' },
  { key: 'rejected', label: 'Rejected', color: 'text-rejected' },
  { key: 'paid', label: 'Paid', color: 'text-approved' },
  { key: 'failed', label: 'Failed', color: 'text-rejected' },
]

export default function StatStrip({ stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {STAT_ITEMS.map(item => (
        <div key={item.key} className="bg-surface-dark-card rounded-xl p-3 text-center">
          <p className="text-2xl font-bold font-mono text-white">
            {stats[item.key] ?? 0}
          </p>
          <p className={`text-xs mt-1 ${item.color}`}>{item.label}</p>
        </div>
      ))}
    </div>
  )
}
