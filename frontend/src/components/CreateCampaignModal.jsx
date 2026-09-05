import { useState, useEffect } from 'react'
import { X, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Hourglass } from 'lucide-react'
import { fetchProducts, createCampaign } from '../api'

const DURATIONS = [12, 24, 48, 72]

const VERDICT_STYLES = {
  approved: {
    icon: CheckCircle2,
    ring: 'border-approved/40 bg-approved/10',
    text: 'text-approved',
    label: 'Cage verdict: APPROVED — campaign is live',
  },
  clamped: {
    icon: AlertTriangle,
    ring: 'border-clamped/40 bg-clamped/10',
    text: 'text-clamped',
    label: 'Cage verdict: CLAMPED — policy modified it before activation',
  },
  awaiting_approval: {
    icon: Hourglass,
    ring: 'border-clamped/40 bg-clamped/10',
    text: 'text-clamped',
    label: 'Cage verdict: AWAITING APPROVAL — above your auto-approve threshold',
  },
  rejected: {
    icon: XCircle,
    ring: 'border-rejected/40 bg-rejected/10',
    text: 'text-rejected',
    label: 'Cage verdict: REJECTED — hard limits exceeded',
  },
}

/**
 * Create-Campaign modal — the manual path through the same Cage.
 * Type an aggressive discount and watch the deterministic rules engine
 * approve, clamp, gate, or reject it live.
 */
export default function CreateCampaignModal({ open, onClose, onCreated }) {
  const [products, setProducts] = useState([])
  const [name, setName] = useState('')
  const [discountPct, setDiscountPct] = useState(10)
  const [durationHours, setDurationHours] = useState(48)
  const [selected, setSelected] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [verdict, setVerdict] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return undefined
    setName('')
    setDiscountPct(10)
    setDurationHours(48)
    setSelected({})
    setVerdict(null)
    setError(null)
    fetchProducts()
      .then(d => setProducts(d.products || []))
      .catch(() => setProducts([]))
  }, [open])

  if (!open) return null

  const toggleSku = (sku) => setSelected(prev => ({ ...prev, [sku]: !prev[sku] }))
  const selectedSkus = Object.keys(selected).filter(k => selected[k])

  const submit = async () => {
    if (!name.trim()) { setError('Give the campaign a name.'); return }
    if (selectedSkus.length === 0) { setError('Select at least one target SKU.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await createCampaign({
        name: name.trim(),
        discount_pct: Number(discountPct),
        target_skus: selectedSkus,
        duration_hours: Number(durationHours),
      })
      setVerdict(res)
      if (onCreated) onCreated()
    } catch (e) {
      setError(e.message || String(e))
    }
    setSubmitting(false)
  }

  const v = verdict ? VERDICT_STYLES[verdict.decision] : null
  const violations = verdict?.policy_result?.violations || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-dusk-card border border-dusk-border rounded-2xl w-full max-w-md p-6 shadow-candy-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">New Campaign</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Manual proposals pass through the same Cage — try a 60% discount on it.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cage verdict panel */}
        {verdict && v && (
          <div className={`rounded-xl border p-4 mb-4 ${v.ring}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <v.icon className={`w-4 h-4 ${v.text}`} />
              <span className={`text-xs font-bold font-mono ${v.text}`}>{v.label}</span>
            </div>
            {violations.length > 0 && (
              <ul className="space-y-1 mt-2">
                {violations.map((vi, i) => (
                  <li key={i} className="text-[11px] text-gray-400 font-mono flex gap-1.5">
                    <span className={v.text}>&rsaquo;</span> {vi}
                  </li>
                ))}
              </ul>
            )}
            {violations.length === 0 && verdict.decision === 'approved' && (
              <p className="text-[11px] text-gray-400 mt-1">
                No violations — the campaign activated automatically.
              </p>
            )}
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Campaign name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Flash Weekend Sale"
              className="w-full bg-dusk border border-dusk-border rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-candy-lavender/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Discount %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPct}
                onChange={e => setDiscountPct(e.target.value)}
                className="w-full bg-dusk border border-dusk-border rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-candy-lavender/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Duration</label>
              <select
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
                className="w-full bg-dusk border border-dusk-border rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-candy-lavender/50"
              >
                {DURATIONS.map(h => (
                  <option key={h} value={h} className="bg-dusk-card">{h} hours</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">
              Target SKUs {products.length > 0 && <span className="text-gray-600">({products.length} in catalog)</span>}
            </label>
            {products.length === 0 ? (
              <p className="text-xs text-gray-600 font-mono py-2">Catalog unavailable.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto ledger-scroll pr-1">
                {products.map(p => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2.5 bg-dusk border border-dusk-border rounded-lg px-3 py-2 cursor-pointer hover:border-candy-lavender/40 transition"
                  >
                    <input
                      type="checkbox"
                      checked={!!selected[p.id]}
                      onChange={() => toggleSku(p.id)}
                      className="accent-candy-lavender-deep"
                    />
                    <span className="text-xs text-gray-300 flex-1">{p.name}</span>
                    <span className="text-[10px] font-mono text-gray-600">{p.id}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-rejected font-mono">{error}</p>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {submitting ? 'Cage is evaluating…' : 'Propose to the Cage'}
          </button>
        </div>
      </div>
    </div>
  )
}
