import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingBag, Trash2, Plus, Minus,
  ShieldCheck, Zap, ArrowRight, Loader2, Info, X,
  BrainCircuit, ShieldAlert, BookOpen,
} from 'lucide-react'
import { fetchProducts, proposeCheckout, approveCheckout, createOrder, verifyPayment } from '../api'
import { formatCurrency } from '../lib/colors'
import AISuggestion from '../components/AISuggestion'

import Navbar from '../components/Navbar'

const CATEGORY_TINTS = {
  Electronics: 'bg-sky-50 text-sky-600 border-sky-200',
  Accessories: 'bg-pink-50 text-pink-600 border-pink-200',
  Fashion: 'bg-purple-50 text-purple-600 border-purple-200',
}

const EXPLAINER_STEPS = [
  { icon: BrainCircuit, title: 'Brain', desc: 'The AI proposes a bundle discount based on your cart and order history.', color: 'text-blue-500 bg-blue-50 border-blue-200' },
  { icon: ShieldAlert, title: 'Cage', desc: 'A deterministic rules engine caps, approves, or rejects the proposal. No LLM, no ambiguity.', color: 'text-amber-500 bg-amber-50 border-amber-200' },
  { icon: ShieldCheck, title: 'Gate', desc: 'Discounts above 15% require explicit human approval before an order is created.', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  { icon: BookOpen, title: 'Ledger', desc: 'Every decision, including rejections, is immutably logged to a public audit trail.', color: 'text-purple-500 bg-purple-50 border-purple-200' },
]

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [checkoutState, setCheckoutState] = useState(null)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('All')
  const [showExplainer, setShowExplainer] = useState(() => {
    try { return !sessionStorage.getItem('explainerDismissed') } catch { return true }
  })

  useEffect(() => {
    fetchProducts().then(d => {
      setProducts(d.products)
      try {
        if (sessionStorage.getItem('marlin_demo_autofill') === 'true') {
          sessionStorage.removeItem('marlin_demo_autofill')
          if (d.products && d.products.length >= 2) {
            setCart([
              { sku: d.products[0].id, quantity: 1 },
              { sku: d.products[1].id, quantity: 1 },
            ])
          }
        }
      } catch (e) {
        console.error(e)
      }
    }).catch(e => setError(e.message))
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
      openRazorpayCheckout(orderResult)
    } catch (e) {
      setError(e.message)
      setCheckoutState(null)
    }
  }

  const simulateMockPayment = async (orderData) => {
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

  const dismissExplainer = () => {
    setShowExplainer(false)
    try { sessionStorage.setItem('explainerDismissed', '1') } catch {}
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar cartCount={cart.length} />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Onboarding Explainer */}
        {showExplainer && (
          <div className="mb-8 border border-blue-200 bg-blue-50/50 rounded-xl p-5 relative">
            <button onClick={dismissExplainer} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-800">How Marlin works</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4 max-w-2xl">
              Every discount you see goes through four layers before money moves. The AI proposes, a rules engine enforces limits,
              a human gate approves high-value decisions, and every step is immutably logged.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {EXPLAINER_STEPS.map((step) => (
                <div key={step.title} className={`rounded-lg border p-3 ${step.color}`}>
                  <step.icon className="w-4 h-4 mb-1.5" />
                  <p className="text-xs font-semibold">{step.title}</p>
                  <p className="text-[10px] opacity-75 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Shop under Marlin</h1>
          <p className="text-gray-500 mt-2 max-w-xl text-sm">
            Add items to your cart &mdash; an AI growth agent may suggest a bundle. Every discount it proposes
            is checked by a rules engine and logged to a public audit trail.
            {' '}
            <Link to="/dashboard" className="text-blue-500 hover:text-blue-600 underline underline-offset-2">
              See the audit trail &rarr;
            </Link>
          </p>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 flex-wrap mb-8">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border ${
                category === c
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 hover:text-gray-800 border-gray-200 hover:border-gray-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {visibleProducts.map(product => (
            <div
              key={product.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
            >
              <div className="relative h-44 bg-gray-100 overflow-hidden">
                <img
                  src={`/products/${product.id}.jpg`}
                  alt={product.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className={`absolute top-3 left-3 text-[11px] font-medium px-2.5 py-1 rounded-md border backdrop-blur-sm ${CATEGORY_TINTS[product.category] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                  {product.category}
                </span>
                {product.stock_quantity <= 30 && (
                  <span className="absolute top-3 right-3 text-[11px] font-medium px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 backdrop-blur-sm flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Only {product.stock_quantity} left
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-gray-800">{product.name}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{product.id}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(product.price)}</span>
                  <button
                    onClick={() => addToCart(product.id)}
                    className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
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
          <div className="fixed bottom-0 right-0 w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-gray-200 shadow-2xl z-40 p-6 rounded-t-xl md:rounded-none md:rounded-l-xl md:max-h-[92vh] md:overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-400" />
              Cart ({cart.length})
            </h2>
            <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-1">
              {cart.map(item => {
                const product = products.find(p => p.id === item.sku)
                return (
                  <div key={item.sku} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                    <img
                      src={`/products/${item.sku}.jpg`}
                      alt={product?.name || item.sku}
                      loading="lazy"
                      className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{product?.name || item.sku}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button onClick={() => changeQty(item.sku, -1)} className="w-5 h-5 rounded-md bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono w-4 text-center">{item.quantity}</span>
                        <button onClick={() => changeQty(item.sku, 1)} className="w-5 h-5 rounded-md bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="text-sm font-mono text-gray-600">{formatCurrency((product?.price || 0) * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.sku)} className="text-gray-300 hover:text-red-500 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-gray-200 pt-3 mb-4">
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
              <div className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>
            )}

            {/* Checkout Button */}
            {!checkoutState || checkoutState.state === null ? (
              <button
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition"
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
            ) : checkoutState.state === 'needs_approval' ? (
              <div className="text-center">
                <p className="text-sm text-amber-600 font-medium mb-2 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 pulse-active" /> Awaiting Merchant Approval
                </p>
                <p className="text-xs text-gray-500 mb-3">This offer exceeds the auto-approve threshold &mdash; a human must sign off.</p>
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-400 py-3 rounded-lg font-medium cursor-not-allowed"
                >
                  Waiting for Approval...
                </button>
              </div>
            ) : checkoutState.state === 'paid' ? (
              <div className="space-y-3">
                <div className="text-center bg-emerald-50 text-emerald-700 border border-emerald-200 p-4 rounded-lg">
                  <p className="font-bold">Payment Successful</p>
                  <p className="text-sm mt-1">Thank you for your purchase.</p>
                </div>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-600 border border-blue-200 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                >
                  View this decision in the audit trail <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : checkoutState.state === 'failed' ? (
              <div className="space-y-3">
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg">
                  <p className="font-bold">Payment Failed</p>
                  <p className="text-sm mt-1">The offer has been invalidated. Please try again.</p>
                </div>
                <Link
                  to="/dashboard"
                  className="flex items-center justify-center gap-2 w-full bg-blue-50 text-blue-600 border border-blue-200 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                >
                  View this decision in the audit trail <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => { setCheckoutState(null); setError(null) }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition"
                >
                  Try Again <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : checkoutState.state === 'ordering' ? (
              <button
                disabled
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-lg font-medium opacity-70 cursor-wait"
              >
                <Loader2 className="w-4 h-4 animate-spin" /> Creating order...
              </button>
            ) : checkoutState.state === 'order_ready' || checkoutState.order_id ? (
              <button
                onClick={() => openRazorpayCheckout(checkoutState)}
                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition"
              >
                Pay {formatCurrency(checkoutState.final_amount_paise || cartTotal)}
              </button>
            ) : (
              <button
                onClick={handleApproveAndPay}
                disabled={checkoutState?.state === 'proposing'}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {checkoutState?.state === 'proposing'
                  ? (<><Loader2 className="w-4 h-4 animate-spin" /> AI is thinking...</>)
                  : (<>Proceed <ArrowRight className="w-4 h-4" /></>)}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <p className="text-xs text-gray-400 leading-relaxed max-w-3xl">
            <strong className="text-gray-500">Why this matters:</strong> In India's UPI ecosystem, real-time payments
            move billions of dollars with near-zero friction &mdash; but merchant growth tools haven't kept pace.
            Marlin demonstrates how an AI agent can continuously propose revenue strategies (bundles, campaigns)
            while staying within deterministic safety bounds: no unchecked discounts, no opaque decisions,
            every action auditable. This is the control infrastructure that makes agentic commerce trustworthy
            enough for production payments.
          </p>
          <p className="text-[10px] text-gray-300 mt-4">
            Marlin Growth Agent &middot; Built for the Razorpay AI Commerce Hackathon
          </p>
        </div>
      </footer>
    </div>
  )
}
