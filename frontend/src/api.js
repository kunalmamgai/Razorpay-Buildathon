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

// Products
export const fetchProducts = () => request('/products')

// Checkout
export const checkout = (cart) =>
  request('/checkout', { method: 'POST', body: JSON.stringify({ cart }) })

// Ledger
export const fetchLedger = (limit = 50, outcome = null) => {
  const params = new URLSearchParams({ limit })
  if (outcome) params.set('outcome', outcome)
  return request(`/ledger?${params}`)
}

export const fetchLedgerEntry = (id) => request(`/ledger/${id}`)
export const fetchLedgerStats = () => request('/ledger/stats')

// Campaigns
export const fetchCampaigns = () => request('/campaigns')
export const createCampaign = (data) =>
  request('/campaigns', { method: 'POST', body: JSON.stringify(data) })
export const approveCampaign = (id) =>
  request(`/campaigns/${id}/approve`, { method: 'POST' })
export const rejectCampaign = (id) =>
  request(`/campaigns/${id}/reject`, { method: 'POST' })

// Simulation
export const simulatePaymentFailure = (orderId) =>
  request(`/simulate/payment-failure?order_id=${orderId}`, { method: 'POST' })
