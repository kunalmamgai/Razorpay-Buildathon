import { useState, useEffect } from 'react'
import {
  ShoppingBag, Sparkles, Trash2, Plus, Minus, CloudSun,
  ShieldCheck, Package, Zap, ArrowRight, Loader2,
} from 'lucide-react'
import { fetchProducts, proposeCheckout, approveCheckout, createOrder, verifyPayment } from '../api'
import { formatCurrency } from '../lib/colors'
import AISuggestion from '../components/AISuggestion'

const CATEGORY_TINTS = {
  Electronics: 'bg-sky-100 text-sky-600',
  Accessories: 'bg-pink-100 text-pink-600',
  Fashion: 'bg-purple-100 text-purple-600',
}

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [checkoutState, setCheckoutState] = useState(null)
  // null | { state: 'proposing' | 'proposal_ready' | 'needs_approval' | 'ordering' | 'order_ready' | 'paid' | 'failed', proposal?, policy_result?, entry_id?, order_id?, ... }
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('All')

  useEffect(() => {
    fetchProducts().then(d => setProducts(d.products)).catch(e => setError(e.message))
  }, [])

  const categories = ['All', ...new Set(products.map(p => p.category))]
  const visibleProducts = category === 'All' ? products : products.filter(p => p.category === category)

  const addToCart = (sku) => {
    setCart(prev => {
      const existing = prev.find(i => i.sku === sku)
      if (existing) return prev.map(i => i.sku === sku ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { sku, quantity: 1 }]
    })
    setCheckoutState(null)
    setError(null)
  }

  const changeQty = (sku, delta) => {
    setCart(prev =>
      prev
        .map(i => i.sku === sku ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
        .filter(i => i.quantity > 0)
    )
    if (delta < 0) { setCheckoutState(null); setError(null) }
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
      theme: { color: '#EC4899' },
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
    <div className="candy-sky-bg">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-card border-b border-pink-100/70">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-candy-btn flex items-center justify-center shadow-candy">
              <CloudSun className="w-5 h-5 text-white" />
            </span>
            <div>
              <p className="font-bold text-gray-800 leading-tight">Marlin</p>
              <p className="text-[10px] text-gray-400 leading-tight">cotton candy commerce</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 border border-purple-100">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Every AI offer audited
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 border border-pink-100 font-medium text-gray-600">
              <ShoppingBag className="w-4 h-4 text-pink-400" />
              {cart.length}
            </span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold sunrise-text">Shop under cotton candy skies</h1>
          <p className="text-gray-500 mt-2 max-w-xl flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-pink-400" />
            Add items to your cart — an AI growth agent may suggest a bundle. Every discount it proposes is checked by a rules engine and logged to a public audit trail.
          </p>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                category === c
                  ? 'bg-candy-btn text-white shadow-candy'
                  : 'bg-white/70 text-gray-500 hover:text-gray-800 border border-pink-100 hover:border-pink-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {products.map(product => (
            <div
              key={product.id}
              className="glass-card rounded-2xl overflow-hidden hover:shadow-candy-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="relative h-44 bg-candy-soft overflow-hidden">
                <img
                  src={`/products/${product.id}.jpg`}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className={`absolute top-3 left-3 text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur ${CATEGORY_TINTS[product.category] || 'bg-white/80 text-gray-500'}`}>
                  {product.category}
                </span>
                {product.stock_quantity <= 30 && (
                  <span className="absolute top-3 right-3 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/85 text-pink-600 backdrop-blur flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Only {product.stock_quantity} left
                  </span>
                )}
              </div>

              <div className="p-5">
                <h3 className="font-semibold text-gray-800">{product.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{product.id}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xl font-bold text-gray-800">{formatCurrency(product.price)}</span>
                  <button
                    onClick={() => addToCart(product.id)}
                    className="flex items-center gap-1.5 bg-candy-btn text-white px-4 py-2 rounded-xl text-sm font-medium shadow-candy hover:opacity-90 hover:shadow-glow transition"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Drawer */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 right-0 w-full md:w-96 glass-card border-t md:border-t-0 md:border-l border-pink-100 shadow-candy-lg z-40 p-6 rounded-t-2xl md:rounded-none md:rounded-l-2xl md:max-h-[92vh] md:overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-pink-400" />
              Cart ({cart.length})
            </h2>
            <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
              {cart.map(item => {
                const product = products.find(p => p.id === item.sku)
                return (
                  <div key={item.sku} className="flex items-center gap-3 bg-white/70 border border-pink-50 rounded-xl p-2.5">
                    <img
                      src={`/products/${item.sku}.jpg`}
                      alt={product?.name || item.sku}
                      loading="lazy"
                      className="w-12 h-12 rounded-lg object-cover bg-candy-soft"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{product?.name || item.sku}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => changeQty(item.sku, -1)} className="w-5 h-5 rounded-md bg-pink-50 text-gray-500 hover:bg-pink-100 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono w-4 text-center">{item.quantity}</span>
                        <button onClick={() => changeQty(item.sku, 1)} className="w-5 h-5 rounded-md bg-pink-50 text-gray-500 hover:bg-pink-100 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-gray-600">{formatCurrency((product?.price || 0) * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.sku)} className="text-pink-300 hover:text-red-500 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-pink-100 pt-3 mb-4">
              <div className="flex justify-between font-bold text-gray-800">
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
                disabled={checkoutState?.state === 'ordering'}
                className="w-full flex items-center justify-center gap-2 bg-candy-btn text-white py-3 rounded-xl font-medium shadow-candy hover:opacity-90 transition"
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
            ) : checkoutState.state === 'needs_approval' ? (
              <div className="text-center">
                <p className="text-sm text-clamped font-medium mb-2 flex items-center justify-center gap-1.5">
                  <Package className="w-4 h-4 pulse-active" /> Awaiting Merchant Approval
                </p>
                <p className="text-xs text-gray-500 mb-3">This offer is above the auto-approve threshold — a human must sign off first.</p>
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-400 py-3 rounded-xl font-medium cursor-not-allowed"
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
                  className="w-full flex items-center justify-center gap-2 bg-candy-btn text-white py-3 rounded-xl font-medium shadow-candy hover:opacity-90 transition"
                >
                  Try Again <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : checkoutState.state === 'ordering' ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-candy-btn text-white py-3 rounded-xl font-medium opacity-70 cursor-wait"
              >
                <Loader2 className="w-4 h-4 animate-spin" /> Creating order...
              </button>
            ) : checkoutState.state === 'order_ready' || checkoutState.order_id ? (
              <button
                onClick={() => openRazorpayCheckout(checkoutState)}
                className="w-full bg-approved text-white py-3 rounded-xl font-medium hover:bg-green-600 transition"
              >
                Pay {formatCurrency(checkoutState.final_amount_paise || cartTotal)}
              </button>
            ) : (
              <button
                onClick={handleApproveAndPay}
                disabled={checkoutState?.state === 'proposing'}
                className="w-full flex items-center justify-center gap-2 bg-candy-btn text-white py-3 rounded-xl font-medium shadow-candy hover:opacity-90 transition disabled:opacity-50"
              >
                {checkoutState?.state === 'proposing'
                  ? (<><Loader2 className="w-4 h-4 animate-spin" /> AI is thinking...</>)
                  : (<>Proceed <ArrowRight className="w-4 h-4" /></>)}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
