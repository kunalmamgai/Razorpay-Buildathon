import React from 'react'

const FILTERS = [
  { key: null, label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'clamped', label: 'Clamped' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'awaiting_approval', label: 'Awaiting' },
]

export default function FilterBar({ active, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {FILTERS.map(f => (
        <button
          key={f.key || 'all'}
          onClick={() => onChange(f.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition ${
            active === f.key
              ? 'bg-ai-proposed text-white'
              : 'bg-surface-dark-card text-gray-400 hover:text-gray-200 border border-surface-dark-border'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
