import { Sparkles, Zap, Receipt, CreditCard, Check, ChevronRight } from 'lucide-react'

export const STEP_ICONS = {
  brain: Sparkles,
  cage: Zap,
  gate: Receipt,
  payment: CreditCard,
}

const STATUS_STYLES = {
  completed: 'border-approved bg-approved text-white',
  clamped: 'border-clamped bg-clamped text-white',
  pending: 'border-gray-600 bg-transparent text-gray-500',
  rejected: 'border-rejected bg-rejected text-white',
}

export default function FourStateStep({ icon, label, status }) {
  const Icon = typeof icon === 'string' ? (STEP_ICONS[icon] || Sparkles) : icon
  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center flex-1">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${STATUS_STYLES[status] || STATUS_STYLES.pending} ${status === 'pending' ? 'pulse-active' : ''}`}>
          {status === 'completed'
            ? <Check className="w-4 h-4" />
            : <Icon className="w-3.5 h-3.5" />}
        </div>
        <span className="text-[10px] text-gray-500 mt-1 text-center">{label}</span>
      </div>
    </div>
  )
}

export function StepConnector({ status }) {
  const color = status === 'completed' ? 'bg-approved/60' : 'bg-dusk-border'
  return (
    <div className={`step-connector rounded-full ${color} self-start mt-4`}></div>
  )
}
