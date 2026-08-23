import React from 'react'
import { getOutcomeColor } from '../lib/colors'

/**
 * A single step in the Four-State timeline.
 * Props:
 *   label    - "PROPOSED" | "POLICY CHECK" | "GATE" | "OUTCOME"
 *   status   - determines color: 'active' | 'completed' | 'pending' | 'failed'
 *   icon     - optional emoji/icon
 *   detail   - main text content
 *   subtext  - smaller text below (e.g. reasoning, timestamp)
 *   isActive - if true, show pulse animation
 */
export default function FourStateStep({ label, status = 'pending', icon, detail, subtext, isActive = false }) {
  const colorMap = {
    active:    { ring: 'ring-ai-proposed', bg: 'bg-ai-proposed/10', text: 'text-ai-proposed', border: 'border-ai-proposed' },
    completed: { ring: 'ring-approved', bg: 'bg-approved/10', text: 'text-approved', border: 'border-approved' },
    clamped:   { ring: 'ring-clamped', bg: 'bg-clamped/10', text: 'text-clamped', border: 'border-clamped' },
    failed:    { ring: 'ring-rejected', bg: 'bg-rejected/10', text: 'text-rejected', border: 'border-rejected' },
    pending:   { ring: 'ring-gray-500', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300' },
  }

  const colors = colorMap[status] || colorMap.pending

  return (
    <div className={`flex flex-col items-center text-center min-w-[100px] max-w-[140px] ${isActive ? 'pulse-active' : ''}`}>
      {/* Step circle */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${colors.border} ${colors.bg} ${colors.ring} ring-2 ring-opacity-30`}>
        <span className={`text-lg ${colors.text}`}>{icon || '●'}</span>
      </div>

      {/* Label */}
      <span className={`mt-2 text-[10px] font-mono font-bold tracking-wider uppercase ${colors.text}`}>
        {label}
      </span>

      {/* Detail */}
      {detail && (
        <span className="mt-1 text-xs font-mono text-gray-300 leading-tight">
          {detail}
        </span>
      )}

      {/* Subtext (reasoning, timestamp) */}
      {subtext && (
        <span className="mt-1 text-[10px] text-gray-500 italic leading-tight">
          {subtext}
        </span>
      )}
    </div>
  )
}
