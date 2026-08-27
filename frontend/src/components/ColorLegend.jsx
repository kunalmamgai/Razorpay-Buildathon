import { STEP_DESCRIPTIONS } from './FourStateStep'

const LEGEND = [
  { dot: 'bg-ai-proposed', label: 'AI proposed' },
  { dot: 'bg-clamped', label: 'Clamped / pending' },
  { dot: 'bg-approved', label: 'Approved / complete' },
  { dot: 'bg-rejected', label: 'Rejected / failed' },
]

const STEPS = [
  { key: 'brain', label: 'Brain', desc: STEP_DESCRIPTIONS.brain },
  { key: 'cage', label: 'Cage', desc: STEP_DESCRIPTIONS.cage },
  { key: 'gate', label: 'Gate', desc: STEP_DESCRIPTIONS.gate },
  { key: 'payment', label: 'Payment', desc: STEP_DESCRIPTIONS.payment },
]

export default function ColorLegend() {
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-center gap-4 flex-wrap bg-dusk-card/70 border border-dusk-border rounded-xl px-4 py-2">
        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">State key</span>
        {LEGEND.map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className={`w-2 h-2 rounded-full ${item.dot}`}></span>
            {item.label}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 flex-wrap bg-dusk-card/70 border border-dusk-border rounded-xl px-4 py-2">
        <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Pipeline</span>
        {STEPS.map(step => (
          <span key={step.key} className="text-xs text-gray-400" title={step.desc}>
            <strong className="text-gray-300">{step.label}</strong> <span className="text-gray-600">&mdash;</span> {step.desc.split(': ')[1]}
          </span>
        ))}
      </div>
    </div>
  )
}
