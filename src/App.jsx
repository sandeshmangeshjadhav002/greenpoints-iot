import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'

import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import SmartBins from './pages/SmartBins'
import Rewards from './pages/Rewards'
import Leaderboard from './pages/Leaderboard'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import ScanQR from './pages/ScanQR'
import CleanerDashboard from './pages/CleanerDashboard'
import ShopDashboard from './pages/ShopDashboard'
import AdminUsers from './pages/AdminUsers'
import BinQRPrint from './pages/BinQRPrint'
import ProtectedRoute from './components/ProtectedRoute'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

// Wrap a page in DashboardLayout with optional role restriction
function DashPage({ children, roles }) {
  return (
    <ProtectedRoute roles={roles}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* ── Public ── */}
        <Route path="/"        element={<MainLayout><Landing /></MainLayout>} />
        <Route path="/about"   element={<MainLayout><About /></MainLayout>} />
        <Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />
        <Route path="/login"   element={<Login />} />

        {/* ── User (and admin) ── */}
        <Route path="/dashboard"    element={<DashPage roles={['user','admin']}><Dashboard /></DashPage>} />
        <Route path="/scan"         element={<DashPage roles={['user','admin']}><ScanQR /></DashPage>} />
        <Route path="/smart-bins"   element={<DashPage roles={['user','admin']}><SmartBins /></DashPage>} />
        <Route path="/rewards"      element={<DashPage roles={['user','admin']}><Rewards /></DashPage>} />
        <Route path="/leaderboard"  element={<DashPage roles={['user','admin']}><Leaderboard /></DashPage>} />
        <Route path="/analytics"    element={<DashPage roles={['user','admin']}><Analytics /></DashPage>} />
        <Route path="/notifications" element={<DashPage><Notifications /></DashPage>} />
        <Route path="/profile"      element={<DashPage><Profile /></DashPage>} />

        {/* ── Cleaner ── */}
        <Route path="/cleaner" element={<DashPage roles={['cleaner','admin']}><CleanerDashboard /></DashPage>} />

        {/* ── Shop ── */}
        <Route path="/shop" element={<DashPage roles={['shop','admin']}><ShopDashboard /></DashPage>} />

        {/* ── Admin ── */}
        <Route path="/admin/users"  element={<DashPage roles={['admin']}><AdminUsers /></DashPage>} />
        <Route path="/admin/bin-qr" element={<DashPage roles={['admin']}><BinQRPrint /></DashPage>} />
      </Routes>
    </>
  )
}
