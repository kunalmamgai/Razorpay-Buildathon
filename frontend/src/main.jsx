import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Storefront from './pages/Storefront'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Onboarding is the main Landing Page */}
        <Route path='/' element={<Onboarding />} />
        <Route path='/onboarding' element={<Onboarding />} />
        <Route path='/store' element={<Storefront />} />
        <Route path='/storefront' element={<Storefront />} />
        <Route path='/dashboard' element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
