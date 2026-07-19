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

        <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
        <Route path="/smart-bins" element={<DashboardLayout><SmartBins /></DashboardLayout>} />
        <Route path="/rewards" element={<DashboardLayout><Rewards /></DashboardLayout>} />
        <Route path="/leaderboard" element={<DashboardLayout><Leaderboard /></DashboardLayout>} />
        <Route path="/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
        <Route path="/notifications" element={<DashboardLayout><Notifications /></DashboardLayout>} />
        <Route path="/profile" element={<DashboardLayout><Profile /></DashboardLayout>} />
      </Routes>
    </>
  )
}
