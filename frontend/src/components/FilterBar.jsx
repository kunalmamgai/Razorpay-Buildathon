const FILTERS = [
  { value: null, label: 'All Stream', statKey: 'total_proposals' },
  { value: 'approved', label: 'Approved', statKey: 'approved' },
  { value: 'clamped', label: 'Clamped', statKey: 'clamped' },
  { value: 'rejected', label: 'Rejected', statKey: 'rejected' },
  { value: 'failed', label: 'Failed', statKey: 'failed' },
]

export default function FilterBar({ filter, setFilter, counts = {} }) {
  return (
    <div className="flex items-center gap-6 border-b border-gray-800 pb-0.5 mb-6 overflow-x-auto">
      {FILTERS.map(f => {
        const count = f.statKey ? counts[f.statKey] : null
        const active = filter === f.value
        return (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide font-mono transition-all duration-200 relative flex items-center gap-2 shrink-0 ${
              active
                ? 'text-white border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200 border-b-2 border-transparent'
            }`}
          >
            <span>{f.label}</span>
            {count !== null && count !== undefined && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                active
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-gray-800 text-gray-400'
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
