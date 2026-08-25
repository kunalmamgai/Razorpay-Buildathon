const FILTERS = [
  { value: null, label: 'All', statKey: 'total_proposals' },
  { value: 'approved', label: 'Approved', statKey: 'approved' },
  { value: 'clamped', label: 'Clamped', statKey: 'clamped' },
  { value: 'awaiting_approval', label: 'Awaiting', statKey: 'awaiting_approval' },
  { value: 'rejected', label: 'Rejected', statKey: 'rejected' },
  { value: 'paid', label: 'Paid', statKey: 'paid' },
  { value: 'failed', label: 'Failed', statKey: 'failed' },
  { value: 'reverted', label: 'Reverted', statKey: null },
]

export default function FilterBar({ filter, setFilter, counts = {} }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(f => {
        const count = f.statKey ? counts[f.statKey] : null
        const active = filter === f.value
        return (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              active
                ? 'bg-ai-proposed text-white'
                : 'bg-surface-dark-card text-gray-400 hover:text-white border border-surface-dark-border'
            }`}
          >
            {f.label}
            {count !== null && count !== undefined && (
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
                active ? 'bg-white/20 text-white' : 'bg-surface-dark-border text-gray-400'
              }`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
