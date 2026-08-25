import { useState, useEffect } from 'react'
import { fetchProducts, proposeCheckout, approveCheckout, createOrder, verifyPayment } from '../api'
import { formatCurrency } from '../lib/colors'
import AISuggestion from '../components/AISuggestion'

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [checkoutState, setCheckoutState] = useState(null)
  // null | { state: 'proposing' | 'proposal_ready' | 'needs_approval' | 'ordering' | 'order_ready' | 'paid' | 'failed', proposal?, policy_result?, entry_id?, order_id?, ... }
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchProducts().then(d => setProducts(d.products)).catch(e => setError(e.message))
  }, [])

  const addToCart = (sku) => {
    setCart(prev => {
      const existing = prev.find(i => i.sku === sku)
      if (existing) return prev.map(i => i.sku === sku ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { sku, quantity: 1 }]
    })
    setCheckoutState(null)
    setError(null)
  }

  const removeFromCart = (sku) => {
    setCart(prev => prev.filter(i => i.sku !== sku))
    setCheckoutState(null)
  }

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setCheckoutState({ state: 'proposing' })
    setError(null)
    try {
      const result = await proposeCheckout(cart)
      const needsApproval = !!result.policy_result?.needs_human_approval
      setCheckoutState({ ...result, state: needsApproval ? 'needs_approval' : 'proposal_ready' })
    } catch (e) {
      setError(e.message)
      setCheckoutState(null)
    }
  }

  const handleApproveAndPay = async () => {
    if (!checkoutState?.entry_id) return
    setCheckoutState(prev => ({ ...prev, state: 'ordering' }))
    try {
      let orderResult
      if (checkoutState.state === 'needs_approval') {
        orderResult = await approveCheckout(checkoutState.entry_id)
      } else {
        orderResult = await createOrder(checkoutState.entry_id)
      }
      setCheckoutState(prev => ({ ...prev, ...orderResult, order_id: orderResult.order_id, state: 'order_ready' }))
      // Open Razorpay checkout
      openRazorpayCheckout(orderResult)
    } catch (e) {
      setError(e.message)
      setCheckoutState(null)
    }
  }

  const simulateMockPayment = async (orderData) => {
    // Test mode without Razorpay keys — settle the mock order server-side
    try {
      await verifyPayment(
        orderData.order_id,
        `pay_test_sim_${Math.random().toString(36).slice(2, 10)}`,
        'mock_signature',
      )
      setCheckoutState(prev => ({ ...prev, state: 'paid' }))
      setCart([])
    } catch {
      setCheckoutState(prev => ({ ...prev, state: 'failed' }))
    }
  }

  const openRazorpayCheckout = (orderData) => {
    const isMockOrder = !orderData.razorpay_key_id || orderData.order_id.startsWith('order_test_')
    if (isMockOrder || !window.Razorpay) {
      if (!isMockOrder && !window.Razorpay) {
        setError('Razorpay SDK not loaded.')
        setCheckoutState(prev => ({ ...prev, state: 'failed' }))
        return
      }
      simulateMockPayment(orderData)
      return
    }
    const options = {
      key: orderData.razorpay_key_id,
      amount: orderData.final_amount_paise,
      currency: 'INR',
      name: 'Marlin Store',
      order_id: orderData.order_id,
      handler: async (response) => {
        // Payment successful — verify server-side
        try {
          await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
          )
          setCheckoutState(prev => ({ ...prev, state: 'paid' }))
          setCart([])
        } catch {
          setCheckoutState(prev => ({ ...prev, state: 'failed' }))
        }
      },
      prefill: { name: 'Demo Customer', email: 'demo@marlin.ai' },
      theme: { color: '#3B82F6' },
      modal: {
        ondismiss: () => {
          setCheckoutState(prev => ({ ...prev, state: null }))
        },
      },
    }
    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.sku)
    return sum + (product ? product.price * item.quantity : 0)
  }, 0)

  return (
    <div className="min-h-screen bg-surface-light">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-surface-dark mb-2">Shop</h1>
        <p className="text-gray-500 text-sm mb-8">Add items to your cart to see AI-powered upsell suggestions.</p>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-surface-dark">{product.name}</h3>
                  <p className="text-xs text-gray-400 font-mono mt-1">{product.id}</p>
                </div>
                {product.discountable ? (
                  <span className="text-xs bg-ai-proposed-light text-ai-proposed px-2 py-0.5 rounded-full">Discountable</span>
                ) : (
                  <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Fixed Price</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-2">{product.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-surface-dark">{formatCurrency(product.price)}</span>
                <button
                  onClick={() => addToCart(product.id)}
                  className="bg-ai-proposed text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Drawer */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 right-0 w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 shadow-2xl z-40 p-6 rounded-t-2xl md:rounded-none md:rounded-l-2xl">
            <h2 className="text-lg font-bold text-surface-dark mb-4">Cart ({cart.length})</h2>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {cart.map(item => {
                const product = products.find(p => p.id === item.sku)
                return (
                  <div key={item.sku} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{product?.name || item.sku}</span>
                      <span className="text-xs text-gray-400 ml-2">×{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono">{formatCurrency(product?.price * item.quantity || 0)}</span>
                      <button onClick={() => removeFromCart(item.sku)} className="text-red-400 text-xs hover:text-red-600">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t pt-3 mb-4">
              <div className="flex justify-between font-bold text-surface-dark">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* AI Suggestion */}
            {checkoutState?.proposal && (
              <AISuggestion
                proposal={checkoutState.proposal}
                policyResult={checkoutState.policy_result}
                originalAmount={checkoutState.original_amount_paise}
                finalAmount={checkoutState.final_amount_paise}
                discountAmount={checkoutState.discount_amount_paise}
                state={checkoutState.state || checkoutState.policy_result?.decision}
              />
            )}

            {/* Error */}
            {error && (
              <div className="bg-rejected-light text-rejected px-3 py-2 rounded-lg text-sm mb-3">{error}</div>
            )}

            {/* Checkout Button */}
            {!checkoutState || checkoutState.state === null ? (
              <button
                onClick={handleCheckout}
                className="w-full bg-surface-dark text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition"
              >
                Checkout
              </button>
            ) : checkoutState.state === 'needs_approval' ? (
              <div className="text-center">
                <p className="text-sm text-clamped font-medium mb-2">⏳ Awaiting Merchant Approval</p>
                <p className="text-xs text-gray-500 mb-3">This offer requires merchant approval before proceeding.</p>
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 py-3 rounded-xl font-medium cursor-not-allowed"
                >
                  Waiting for Approval...
                </button>
              </div>
            ) : checkoutState.state === 'paid' ? (
              <div className="text-center bg-approved-light text-approved p-4 rounded-xl">
                <p className="font-bold">✅ Payment Successful!</p>
                <p className="text-sm mt-1">Thank you for your purchase.</p>
              </div>
            ) : checkoutState.state === 'failed' ? (
              <div className="text-center">
                <div className="bg-rejected-light text-rejected p-3 rounded-xl mb-3">
                  <p className="font-bold">❌ Payment Failed</p>
                  <p className="text-sm mt-1">The offer has been invalidated. Please try again.</p>
                </div>
                <button
                  onClick={() => { setCheckoutState(null); setError(null) }}
                  className="w-full bg-ai-proposed text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition"
                >
                  Try Again
                </button>
              </div>
            ) : checkoutState.state === 'order_ready' || checkoutState.order_id ? (
              <button
                onClick={() => openRazorpayCheckout(checkoutState)}
                className="w-full bg-approved text-white py-3 rounded-xl font-medium hover:bg-green-600 transition"
              >
                Pay {formatCurrency(checkoutState.final_amount_paise || cartTotal)}
              </button>
            ) : checkoutState.state === 'ordering' ? (
              <button
                disabled
                className="w-full bg-ai-proposed text-white py-3 rounded-xl font-medium opacity-50 cursor-wait"
              >
                Creating order...
              </button>
            ) : (
              <button
                onClick={handleApproveAndPay}
                disabled={checkoutState?.state === 'proposing'}
                className="w-full bg-ai-proposed text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition disabled:opacity-50"
              >
                {checkoutState?.state === 'proposing' ? 'AI is thinking...' : 'Proceed'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
