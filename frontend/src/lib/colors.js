/**
 * Centralized state color helpers.
 * Maps policy decisions and outcomes to the 6-color system from the design spec.
 */

const COLORS = {
  ai: { bg: '#DBEAFE', text: '#3B82F6', border: '#93C5FD' },
  clamped: { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' },
  approved: { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' },
  rejected: { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' },
  dark: { bg: '#1E293B', text: '#F8FAFC', border: '#334155' },
}

export function getStateColor(decision) {
  switch (decision) {
    case 'approved': return COLORS.approved
    case 'clamped': return COLORS.clamped
    case 'awaiting_approval': return COLORS.clamped
    case 'rejected': return COLORS.rejected
    default: return COLORS.ai
  }
}

export function getOutcomeColor(outcome) {
  switch (outcome) {
    case 'approved':
    case 'paid':
    case 'order_created': return COLORS.approved
    case 'clamped':
    case 'awaiting_approval':
    case 'pending': return COLORS.clamped
    case 'rejected':
    case 'failed':
    case 'reverted': return COLORS.rejected
    default: return COLORS.ai
  }
}

export function formatCurrency(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
}

export function formatDiscount(pct) {
  return pct > 0 ? `${pct}% off` : 'No discount'
}

export { COLORS }
