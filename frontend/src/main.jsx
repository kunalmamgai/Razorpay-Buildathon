import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Storefront from './pages/Storefront'
import Dashboard from './pages/Dashboard'
import Onboarding from './pages/Onboarding'
import Campaigns from './pages/Campaigns'
import Approvals from './pages/Approvals'
import AuditLogs from './pages/AuditLogs'
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
        <Route path='/campaigns' element={<Campaigns />} />
        <Route path='/approvals' element={<Approvals />} />
        <Route path='/audit' element={<AuditLogs />} />
        <Route path='/audit-logs' element={<AuditLogs />} />
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
