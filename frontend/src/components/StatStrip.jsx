import React from 'react'

export default function StatStrip({ stats }) {
  if (!stats) return null

  const items = [
    { label: 'Total Proposals', value: stats.total_proposals, color: 'text-gray-200' },
    { label: 'Approved', value: stats.approved, color: 'text-approved' },
    { label: 'Clamped', value: stats.clamped, color: 'text-clamped' },
    { label: 'Rejected', value: stats.rejected, color: 'text-rejected' },
    { label: 'Awaiting', value: stats.awaiting_approval, color: 'text-clamped' },
    { label: 'Rejection Rate', value: `${stats.rejection_rate}%`, color: 'text-gray-400' },
  ]

  return (
    <div className="flex gap-4 mb-4 p-3 rounded-lg bg-surface-dark-card border border-surface-dark-border">
      {items.map(item => (
        <div key={item.label} className="flex flex-col items-center min-w-[80px]">
          <span className={`font-mono text-lg font-bold ${item.color}`}>
            {item.value}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
