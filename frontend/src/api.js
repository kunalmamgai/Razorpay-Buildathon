const API_BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

// ── Products ──────────────────────────────────────────────
export const fetchProducts = () => request('/products')

// ── Checkout (3-step flow) ────────────────────────────────
export const proposeCheckout = (cart, idempotencyKey = null) => {
  const body = { cart }
  if (idempotencyKey) body.idempotency_key = idempotencyKey
  return request('/checkout/propose', { method: 'POST', body: JSON.stringify(body) })
}

export const approveCheckout = (ledgerId) =>
  request('/checkout/approve', { method: 'POST', body: JSON.stringify({ ledger_id: ledgerId }) })

export const createOrder = (ledgerId, idempotencyKey = null) => {
  const body = { ledger_id: ledgerId }
  if (idempotencyKey) body.idempotency_key = idempotencyKey
  return request('/checkout/create-order', { method: 'POST', body: JSON.stringify(body) })
}

// ── Payment ───────────────────────────────────────────────
export const verifyPayment = (orderId, paymentId, signature) =>
  request('/payment/verify', {
    method: 'POST',
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    }),
  })

// ── Ledger ────────────────────────────────────────────────
export const fetchLedger = (limit = 50, outcome = null) => {
  const params = new URLSearchParams({ limit })
  if (outcome) params.set('outcome', outcome)
  return request(`/ledger?${params}`)
}

export const fetchLedgerByCorrelation = (correlationId) =>
  request(`/ledger/${correlationId}`)

export const fetchOrderLifecycle = (orderId) =>
  request(`/ledger/order/${orderId}`)

export const fetchLedgerStats = () => request('/ledger/stats')

// ── Approvals ─────────────────────────────────────────────
export const fetchApprovals = () => request('/approvals')

export const approveProposal = (ledgerId) =>
  request(`/approvals/${ledgerId}/approve`, { method: 'POST' })

export const rejectProposal = (ledgerId) =>
  request(`/approvals/${ledgerId}/reject`, { method: 'POST' })

// ── Campaigns ─────────────────────────────────────────────
export const fetchCampaigns = () => request('/campaigns')
export const createCampaign = (data) =>
  request('/campaigns', { method: 'POST', body: JSON.stringify(data) })
export const reviewCampaign = () =>
  request('/campaigns/review', { method: 'POST' })
export const approveCampaign = (id) =>
  request(`/campaigns/${id}/approve`, { method: 'POST' })
export const rejectCampaign = (id) =>
  request(`/campaigns/${id}/reject`, { method: 'POST' })

// ── Simulation ────────────────────────────────────────────
export const simulatePaymentFailure = (orderId) =>
  request(`/simulate/payment-failure?order_id=${orderId}`, { method: 'POST' })
