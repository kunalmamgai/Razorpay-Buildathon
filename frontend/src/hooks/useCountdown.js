import { useState, useEffect } from 'react'

function parseUTC(ts) {
  if (!ts) return null
  // Backend emits naive UTC ISO timestamps — make sure JS parses them as UTC
  const s = /(z|Z|[+-]\d{2}:?\d{2})$/.test(ts) ? ts : `${ts}Z`
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatRemaining(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/**
 * Live countdown against an expiry timestamp.
 * Returns remaining time label, ms left and elapsed progress percentage.
 */
export default function useCountdown(expiresAt, startsAt = null) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!expiresAt) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  const end = parseUTC(expiresAt)
  const start = parseUTC(startsAt)

  if (!end) {
    return { hasExpiry: false, expired: false, remainingLabel: '—', remainingMs: 0, progressPct: 0 }
  }

  const remainingMs = end.getTime() - now
  const expired = remainingMs <= 0

  let progressPct = 0
  if (start && end > start) {
    progressPct = Math.min(100, Math.max(0,
      ((now - start.getTime()) / (end.getTime() - start.getTime())) * 100))
  }

  return {
    hasExpiry: true,
    expired,
    remainingMs: Math.max(0, remainingMs),
    remainingLabel: expired ? 'Expired' : formatRemaining(remainingMs),
    progressPct: Math.round(progressPct),
  }
}
