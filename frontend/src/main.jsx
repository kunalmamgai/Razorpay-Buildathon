import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Storefront from './pages/Storefront'
import Dashboard from './pages/Dashboard'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-surface-dark">🐟 Marlin</span>
          <span className="text-xs text-gray-400 font-mono">Growth Agent</span>
        </div>
        <div className="flex gap-4 text-sm">
          <Link to="/" className="text-gray-600 hover:text-ai-proposed transition">Storefront</Link>
          <Link to="/dashboard" className="text-gray-600 hover:text-ai-proposed transition">Dashboard</Link>
        </div>
      </nav>
      <main className="pt-14">
        <Routes>
          <Route path="/" element={<Storefront />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
