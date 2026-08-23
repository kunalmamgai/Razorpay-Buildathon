import React, { useState, useEffect } from 'react'
import { fetchProducts, checkout } from '../api'
import AISuggestion from '../components/AISuggestion'

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [suggestion, setSuggestion] = useState(null)
  const [checkoutResult, setCheckoutResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    fetchProducts()
      .then(data => setProducts(data.products || []))
      .catch(err => setError(err.message))
  }, [])

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.sku === product.id)
      if (existing) {
        return prev.map(item =>
          item.sku === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { sku: product.id, quantity: 1 }]
    })
    setCartOpen(true)
  }

  const removeFromCart = (sku) => {
    setCart(prev => prev.filter(item => item.sku !== sku))
  }

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.sku)
    return sum + (product ? product.price * item.quantity : 0)
  }, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const result = await checkout(cart)
      setCheckoutResult(result)
      if (result.proposal && result.proposal.discount_pct > 0) {
        setSuggestion(result.proposal)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fmtPaise = (p) => (p / 100).toLocaleString('en-IN')

  return (
    <div className="min-h-screen bg-surface-light">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-surface-dark">Marlin Store</h1>
            <p className="text-sm text-gray-500 mt-1">Demo e-commerce storefront powered by AI</p>
          </div>
          <button onClick={() => setCartOpen(!cartOpen)}
            className="relative px-4 py-2 bg-surface-dark text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
            Cart ({cart.length})
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-ai-proposed text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-surface-light-card rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <span className="text-4xl">&#x1F4E6;</span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-surface-dark">{product.name}</h3>
                    <span className="text-[10px] font-mono text-gray-400">{product.id}</span>
                  </div>
                  <span className="text-lg font-bold text-surface-dark">&#x20B9;{fmtPaise(product.price)}</span>
                </div>
                <button onClick={() => addToCart(product)}
                  className="w-full mt-3 px-4 py-2 bg-surface-dark text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
        {cartOpen && (
          <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-xl z-40 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-surface-dark">Your Cart</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">&#x2715;</button>
            </div>
            {cart.length === 0 ? (
              <p className="text-sm text-gray-400">Your cart is empty</p>
            ) : (
              <>
                {cart.map(item => {
                  const product = products.find(p => p.id === item.sku)
                  if (!product) return null
                  return (
                    <div key={item.sku} className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div>
                        <p className="text-sm font-medium text-surface-dark">{product.name}</p>
                        <p className="text-xs text-gray-400 font-mono">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono">&#x20B9;{fmtPaise(product.price * item.quantity)}</span>
                        <button onClick={() => removeFromCart(item.sku)} className="text-rejected text-xs">&#x2715;</button>
                      </div>
                    </div>
                  )
                })}
                <AISuggestion proposal={suggestion} />
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between mb-4">
                    <span className="text-sm font-medium text-gray-600">Total</span>
                    <span className="text-lg font-bold font-mono text-surface-dark">&#x20B9;{fmtPaise(cartTotal)}</span>
                  </div>
                  <button onClick={handleCheckout} disabled={loading}
                    className="w-full px-4 py-3 bg-ai-proposed text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition disabled:opacity-50">
                    {loading ? 'Processing...' : 'Checkout with Marlin AI'}
                  </button>
                </div>
              </>
            )}
            {checkoutResult && (
              <div className="mt-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <h3 className="text-xs font-bold text-surface-dark mb-2 uppercase tracking-wider">Order Result</h3>
                <div className="space-y-1 text-xs font-mono">
                  <p><span className="text-gray-500">Order: </span>{checkoutResult.order_id}</p>
                  <p><span className="text-gray-500">Outcome: </span>
                    <span className={checkoutResult.outcome === 'approved' ? ' text-approved' :
                      checkoutResult.outcome === 'clamped' ? ' text-clamped' :
                      checkoutResult.outcome === 'rejected' ? ' text-rejected' : ' text-gray-600'}>
                      {checkoutResult.outcome}
                    </span>
                  </p>
                  {checkoutResult.discount_amount > 0 && (
                    <p><span className="text-gray-500">Discount: </span>
                      <span className="text-approved">-&#x20B9;{fmtPaise(checkoutResult.discount_amount)}</span>
                    </p>
                  )}
                  <p><span className="text-gray-500">Final: </span>&#x20B9;{fmtPaise(checkoutResult.final_amount)}</p>
                </div>
                <button onClick={() => { setCheckoutResult(null); setSuggestion(null); setCart([]) }}
                  className="mt-3 w-full px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded font-medium hover:bg-gray-200 transition">
                  New Order
                </button>
              </div>
            )}
            {error
