const LEGEND = [
  { dot: 'bg-ai-proposed', label: 'AI proposed' },
  { dot: 'bg-clamped', label: 'Clamped / pending' },
  { dot: 'bg-approved', label: 'Approved / complete' },
  { dot: 'bg-rejected', label: 'Rejected / failed' },
]

export default function ColorLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap bg-dusk-card/70 border border-dusk-border rounded-xl px-4 py-2 mb-6">
      <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">State key</span>
      {LEGEND.map(item => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className={`w-2 h-2 rounded-full ${item.dot}`}></span>
          {item.label}
        </span>
      ))}
    </div>
  )
}
