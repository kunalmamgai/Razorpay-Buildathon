const FILTERS = [
  { value: null, label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'clamped', label: 'Clamped' },
  { value: 'awaiting_approval', label: 'Awaiting' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'reverted', label: 'Reverted' },
]

export default function FilterBar({ filter, setFilter }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(f => (
        <button
          key={f.label}
          onClick={() => setFilter(f.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
            filter === f.value
              ? 'bg-ai-proposed text-white'
              : 'bg-surface-dark-card text-gray-400 hover:text-white border border-surface-dark-border'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
