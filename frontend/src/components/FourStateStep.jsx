const STATUS_STYLES = {
  completed: 'border-approved bg-approved text-white',
  clamped: 'border-clamped bg-clamped text-white',
  pending: 'border-gray-600 bg-transparent text-gray-600',
  rejected: 'border-rejected bg-rejected text-white',
}

export default function FourStateStep({ icon, label, status }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${STATUS_STYLES[status] || STATUS_STYLES.pending} ${status === 'pending' ? 'pulse-active' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] text-gray-500 mt-1 text-center">{label}</span>
    </div>
  )
}
