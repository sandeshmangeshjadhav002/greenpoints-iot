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
import ProtectedRoute from './components/ProtectedRoute'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<MainLayout><Landing /></MainLayout>} />
        <Route path="/about" element={<MainLayout><About /></MainLayout>} />
        <Route path="/contact" element={<MainLayout><Contact /></MainLayout>} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
        <Route path="/smart-bins" element={<ProtectedRoute><DashboardLayout><SmartBins /></DashboardLayout></ProtectedRoute>} />
        <Route path="/rewards" element={<ProtectedRoute><DashboardLayout><Rewards /></DashboardLayout></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><DashboardLayout><Leaderboard /></DashboardLayout></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><DashboardLayout><Analytics /></DashboardLayout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><Notifications /></DashboardLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><DashboardLayout><Profile /></DashboardLayout></ProtectedRoute>} />
      </Routes>
    </>
  )
}
