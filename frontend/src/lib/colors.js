/**
 * Centralized state color constants.
 * Maps directly to the design-spec §2.2 color system.
 * Use these instead of hardcoded Tailwind classes when dynamic styling is needed.
 */
export const STATE_COLORS = {
  ai_proposed: '#3B82F6',
  clamped_pending: '#F59E0B',
  approved_complete: '#10B981',
  rejected_failed: '#EF4444',
}

export const SURFACE_COLORS = {
  dark: '#0F172A',
  dark_card: '#1E293B',
  dark_border: '#334155',
  light: '#FAFAFA',
  light_card: '#FFFFFF',
}

/**
 * Get the Tailwind class for a given outcome state.
 * Used to dynamically color ledger entries.
 */
export function getOutcomeColor(outcome) {
  switch (outcome) {
    case 'approved':
    case 'paid':
      return { bg: 'bg-approved-light', text: 'text-approved', border: 'border-approved', dot: 'bg-approved' }
    case 'clamped':
    case 'awaiting_approval':
      return { bg: 'bg-clamped-light', text: 'text-clamped', border: 'border-clamped', dot: 'bg-clamped' }
    case 'rejected':
    case 'failed':
      return { bg: 'bg-rejected-light', text: 'text-rejected', border: 'border-rejected', dot: 'bg-rejected' }
    case 'reverted':
      return { bg: 'bg-rejected-light', text: 'text-rejected', border: 'border-rejected', dot: 'bg-rejected' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', dot: 'bg-gray-400' }
  }
}

/**
 * Get label text for an outcome.
 */
export function getOutcomeLabel(outcome) {
  const labels = {
    approved: 'Approved',
    clamped: 'Clamped',
    rejected: 'Rejected',
    awaiting_approval: 'Awaiting Approval',
    paid: 'Paid',
    failed: 'Failed',
    reverted: 'Reverted',
    pending: 'Pending',
  }
  return labels[outcome] || outcome
}
