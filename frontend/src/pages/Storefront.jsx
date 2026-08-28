import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingBag, Trash2, Plus, Minus,
  ShieldCheck, Zap, ArrowRight, Loader2, Info, X,
  BrainCircuit, ShieldAlert, BookOpen, CheckCircle2, AlertCircle, Play
} from 'lucide-react'
import { fetchProducts, proposeCheckout, approveCheckout, createOrder, verifyPayment } from '../api'
import { formatCurrency } from '../lib/colors'
import AISuggestion from '../components/AISuggestion'
import Navbar from '../components/Navbar'

// Supplemental products to complete full catalog matching user mockup
const EXTRA_PRODUCTS = [
  {
    id: 'SKU_107',
    name: 'Smartwatch Ultra',
    price: 699900, // ₹6,999
    category: 'Wearables',
    discountable: 1,
    stock_quantity: 42,
    description: 'Health tracking, AMOLED screen and notifications.',
  },
  {
    id: 'SKU_108',
    name: 'Urban Backpack',
    price: 189900, // ₹1,899
    category: 'Gear',
    discountable: 1,
    stock_quantity: 25,
    description: 'Water-resistant fabric, fits up to 15" laptops.',
  },
  {
    id: 'SKU_109',
    name: 'Aviator Sunglasses',
    price: 129900, // ₹1,299
    category: 'Accessories',
    discountable: 1,
    stock_quantity: 0, // Out of stock
    description: 'UV400 protection with anti-glare polarized lenses.',
  },
  {
    id: 'SKU_110',
    name: 'Insulated Water Bottle',
    price: 39900, // ₹399
    category: 'Gear',
    discountable: 1,
    stock_quantity: 85,
    description: 'Double-wall insulated 100% stainless steel, 1L.',
  },
]

const PRODUCT_DESCRIPTIONS = {
  SKU_101: 'Premium sound, active noise cancellation.',
  SKU_102: 'Braided high-speed 60W charging cable.',
  SKU_103: 'Military-grade drop protection phone case.',
  SKU_104: 'Compact high-density 10000mAh battery pack.',
  SKU_105: '360° surround bass portable Bluetooth speaker.',
  SKU_106: 'Handcrafted genuine leather RFID blocking wallet.',
  SKU_107: 'Health tracking, AMOLED screen and notifications.',
  SKU_108: 'Water-resistant fabric, fits up to 15" laptops.',
  SKU_109: 'UV400 protection with anti-glare polarized lenses.',
  SKU_110: 'Double-wall insulated 100% stainless steel, 1L.',
}

export default function Storefront() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [checkoutState, setCheckoutState] = useState(null)
  const [error, setError] = useState(null)
  const [category, setCategory] = useState('All Products')
  const [showExplainer, setShowExplainer] = useState(false)

  useEffect(() => {
    fetchProducts().then(d => {
      let catalog = d.products || []
      // Merge extra products if not already in API catalog
      EXTRA_PRODUCTS.forEach(extra => {
        if (!catalog.some(p => p.id === extra.id)) {
          catalog.push(extra)
        }
      })
      setProducts(catalog)

      try {
        if (sessionStorage.getItem('marlin_demo_autofill') === 'true') {
          sessionStorage.removeItem('marlin_demo_autofill')
          // Auto fill Earbuds & USB Cable for instant AI proposal test
          const earbuds = catalog.find(p => p.id === 'SKU_101') || catalog[0]
          const accessory = catalog.find(p => p.id === 'SKU_102') || catalog[1]
          if (earbuds && accessory) {
            setCart([
              { sku: earbuds.id, quantity: 1 },
              { sku: accessory.id, quantity: 1 },
            ])
          }
        }
      } catch (e) {
        console.error(e)
      }
    }).catch(() => {
      // Fallback catalog if backend is loading
      setProducts(EXTRA_PRODUCTS)
    })
  }, [])

  const categories = ['All Products', 'Electronics', 'Accessories', 'Wearables', 'Gear', 'Fashion']

  const visibleProducts = products.filter(p => {
    if (category === 'All Products') return true
    if (category === 'Electronics') return p.category === 'Electronics' || p.id === 'SKU_101'
    return p.category === category
  })

  const addToCart = (sku) => {
    const product = products.find(p => p.id === sku)
    if (product && product.stock_quantity === 0) return

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

  const cartTotalPaise = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.sku)
    return sum + (product ? product.price * item.quantity : 0)
  }, 0)

  const cartTotalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col font-sans selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Ambient lighting glows matching landing page */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-blue-900/15 via-indigo-900/10 to-transparent blur-3xl pointer-events-none" />

      {/* Main Navbar */}
      <Navbar cartCount={cartTotalItemsCount} />

      {/* Sub Header Badge Bar matching mockup logo tagline */}
      <div className="border-b border-gray-800/60 bg-[#090c15]/80 backdrop-blur-sm py-2.5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              EVERY AI OFFER IS CHECKED & LOGGED
            </span>
          </div>

          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="text-xs text-gray-400 hover:text-cyan-300 flex items-center gap-1 transition"
          >
            <Info className="w-3.5 h-3.5" />
            {showExplainer ? 'Hide Architecture' : 'How AI Offers Work'}
          </button>
        </div>
      </div>

      {/* Explainer Drawer if toggled */}
      {showExplainer && (
        <div className="bg-[#0b0e1a] border-b border-blue-500/20 p-5 animate-fadeIn">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
                Marlin 4-Layer Safety Framework
              </h3>
              <button onClick={() => setShowExplainer(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3">
                <span className="font-bold text-blue-300">01. The Brain</span>
                <p className="text-gray-400 mt-1 text-[11px]">Proposes smart discounts based on order history and cart signal.</p>
              </div>
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3">
                <span className="font-bold text-amber-300">02. The Cage</span>
                <p className="text-gray-400 mt-1 text-[11px]">Enforces strict rules: max 20% discount, min ₹500 order.</p>
              </div>
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3">
                <span className="font-bold text-emerald-300">03. The Gate</span>
                <p className="text-gray-400 mt-1 text-[11px]">High-value discounts require human sign-off before payment.</p>
              </div>
              <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3">
                <span className="font-bold text-purple-300">04. The Ledger</span>
                <p className="text-gray-400 mt-1 text-[11px]">Every step is logged to an immutable audit record.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Store Layout Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT AREA: Category Chips & Products Grid (8 columns on lg) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Category Filter Chips */}
            <div className="flex items-center gap-2 flex-wrap pb-2">
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                    category === c
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/40 shadow-lg shadow-blue-500/20 scale-[1.02]'
                      : 'bg-[#0e111b] text-gray-400 border-[#1b1f32] hover:border-gray-700 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {visibleProducts.map(product => {
                const isOutOfStock = product.stock_quantity === 0
                const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 15
                const productCategoryUpper = (product.category || 'General').toUpperCase()
                const productDesc = PRODUCT_DESCRIPTIONS[product.id] || product.description || 'Premium build quality tech accessory.'

                return (
                  <div
                    key={product.id}
                    className="bg-[#0e111b] border border-[#1b1f32] hover:border-cyan-500/40 rounded-2xl overflow-hidden transition-all duration-300 shadow-xl group flex flex-col justify-between"
                  >
                    {/* Top Image Container */}
                    <div className="relative aspect-[4/3] bg-[#090b11] border-b border-white/5 overflow-hidden">
                      <img
                        src={`/products/${product.id}.jpg`}
                        alt={product.name}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = '/onboarding/layer1.png'
                        }}
                        className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? 'opacity-40 grayscale' : 'group-hover:scale-105'}`}
                      />
                      
                      {/* Top-Left Category Badge */}
                      <span className="absolute top-3 left-3 text-[10px] font-mono font-bold tracking-wider uppercase text-blue-300 bg-blue-950/80 border border-blue-500/30 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                        {productCategoryUpper}
                      </span>

                      {/* Top-Right Stock Badge */}
                      <span className="absolute top-3 right-3 text-[10px] font-mono font-medium backdrop-blur-md">
                        {isOutOfStock ? (
                          <span className="text-red-400 bg-red-950/80 border border-red-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Out of Stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-amber-400 bg-amber-950/80 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Low Stock
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> In Stock
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Product Details Section */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2 font-normal">
                          {productDesc}
                        </p>
                      </div>

                      {/* Price & Add to Cart Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-base font-extrabold text-white font-mono">
                          {formatCurrency(product.price)}
                        </span>

                        {isOutOfStock ? (
                          <button
                            disabled
                            className="bg-gray-800/60 text-gray-500 font-medium text-xs px-3 py-1.5 rounded-xl cursor-not-allowed border border-gray-700/50"
                          >
                            Sold Out
                          </button>
                        ) : (
                          <button
                            onClick={() => addToCart(product.id)}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT AREA: Your Cart Drawer / Sidebar (4 columns on lg) */}
          <div className="lg:col-span-4 sticky top-20">
            <div className="bg-[#0e111b] border border-[#1b1f32] rounded-2xl p-5 shadow-2xl flex flex-col justify-between max-h-[85vh] overflow-y-auto ledger-scroll">
              
              {/* Cart Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Your Cart</h2>
                </div>
                <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  {cartTotalItemsCount} {cartTotalItemsCount === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-gray-600">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-400">Your cart is empty</p>
                  <p className="text-xs text-gray-600 max-w-xs mx-auto">
                    Add products to trigger the AI Brain discount proposal in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1 ledger-scroll">
                  {cart.map(item => {
                    const product = products.find(p => p.id === item.sku)
                    return (
                      <div key={item.sku} className="flex items-center gap-3 bg-[#121625] border border-white/5 rounded-xl p-3">
                        <img
                          src={`/products/${item.sku}.jpg`}
                          alt={product?.name || item.sku}
                          onError={(e) => { e.target.src = '/onboarding/layer1.png' }}
                          className="w-12 h-12 rounded-lg object-cover bg-[#090b11] border border-white/5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{product?.name || item.sku}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{product?.category || 'Tech'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => changeQty(item.sku, -1)}
                              className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center text-xs font-mono"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-mono font-bold w-4 text-center text-white">{item.quantity}</span>
                            <button
                              onClick={() => changeQty(item.sku, 1)}
                              className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center justify-center text-xs font-mono"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-mono font-bold text-white">
                            {formatCurrency((product?.price || 0) * item.quantity)}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.sku)}
                            className="text-gray-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Dynamic AI Proposal Suggestion Box */}
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

              {/* Error Message */}
              {error && (
                <div className="bg-red-950/60 text-red-300 border border-red-500/30 p-3 rounded-xl text-xs mb-3 font-mono">
                  {error}
                </div>
              )}

              {/* Cart Footer Subtotal & Action CTA */}
              {cart.length > 0 && (
                <div className="border-t border-gray-800 pt-4 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">Subtotal</span>
                    <span className="font-mono text-xl font-extrabold text-white">
                      {formatCurrency(checkoutState?.final_amount_paise || cartTotalPaise)}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 -mt-2">Shipping & Taxes calculated at checkout</p>

                  {/* Checkout Button States */}
                  {!checkoutState || checkoutState.state === null ? (
                    <button
                      onClick={handleCheckout}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
                    >
                      Checkout Now <ArrowRight className="w-4 h-4 text-cyan-200" />
                    </button>
                  ) : checkoutState.state === 'needs_approval' ? (
                    <div className="text-center bg-amber-950/40 border border-amber-500/30 rounded-xl p-3">
                      <p className="text-xs text-amber-300 font-bold mb-1 flex items-center justify-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" /> Awaiting Merchant Approval
                      </p>
                      <p className="text-[10px] text-gray-400 mb-3">Discount exceeds 15% auto-approval threshold.</p>
                      <button
                        onClick={handleApproveAndPay}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold transition"
                      >
                        Approve & Pay ({formatCurrency(checkoutState.final_amount_paise)})
                      </button>
                    </div>
                  ) : checkoutState.state === 'paid' ? (
                    <div className="space-y-3">
                      <div className="text-center bg-emerald-950/60 border border-emerald-500/30 p-4 rounded-xl">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                        <p className="font-bold text-sm text-emerald-300">Payment Successful</p>
                        <p className="text-xs text-gray-400 mt-0.5">Order logged to audit ledger.</p>
                      </div>
                      <Link
                        to="/dashboard"
                        className="flex items-center justify-center gap-1.5 w-full bg-blue-950/60 border border-blue-500/30 text-cyan-300 py-2.5 rounded-xl text-xs font-semibold hover:bg-blue-900/60 transition"
                      >
                        View Decision in Audit Trail <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : checkoutState.state === 'ordering' ? (
                    <button
                      disabled
                      className="w-full flex items-center justify-center gap-2 bg-gray-800 text-gray-400 py-3.5 rounded-xl font-medium cursor-wait text-xs"
                    >
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> Processing Order...
                    </button>
                  ) : (
                    <button
                      onClick={handleApproveAndPay}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                      Pay {formatCurrency(checkoutState.final_amount_paise || cartTotalPaise)}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Audit Trail Notification Banner matching user's mockup */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="bg-[#0e111b] border border-cyan-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-lg">
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <span className="text-xs text-gray-300 font-medium">
                This decision is on the public audit trail
              </span>
            </div>
            <Link
              to="/dashboard"
              className="text-xs font-semibold text-cyan-300 hover:text-cyan-200 flex items-center gap-1 transition"
            >
              View in Dashboard &rarr;
            </Link>
          </div>
        </div>

      </main>

      {/* Footer matching user mockup */}
      <footer className="border-t border-gray-800/80 bg-[#090b11] mt-16 py-6 px-6 text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] text-gray-400">
            &copy; 2026 Marlin Infrastructure. AI Policy Protected.
          </span>
          <div className="flex items-center gap-6 text-[11px] text-gray-400">
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Privacy</a>
            <a href="#" className="hover:text-white transition">Trust Center</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
