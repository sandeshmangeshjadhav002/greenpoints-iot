import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Trash2, Gift, Trophy, BarChart3,
  Bell, UserCircle, Recycle, X, Store, Truck, Users, QrCode,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// User nav — no Scan QR tab (scanning happens from bin detail / QR page directly)
const userNav = [
  { to: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/smart-bins',     label: 'Smart Bins',      icon: Trash2 },
  { to: '/rewards',        label: 'Rewards',         icon: Gift },
  { to: '/leaderboard',    label: 'Leaderboard',     icon: Trophy },
  { to: '/analytics',      label: 'Analytics',       icon: BarChart3 },
  { to: '/notifications',  label: 'Notifications',   icon: Bell },
  { to: '/profile',        label: 'Profile',         icon: UserCircle },
]

// Nav items for cleaners
const cleanerNav = [
  { to: '/cleaner',        label: 'Bin Status',     icon: Truck },
  { to: '/notifications',  label: 'Notifications',  icon: Bell },
  { to: '/profile',        label: 'Profile',        icon: UserCircle },
]

// Nav items for shops
const shopNav = [
  { to: '/shop',           label: 'Redemptions',    icon: Store },
  { to: '/notifications',  label: 'Notifications',  icon: Bell },
  { to: '/profile',        label: 'Profile',        icon: UserCircle },
]

// Admins get everything
const adminNav = [
  ...userNav,
  { to: '/cleaner',      label: 'Cleaner View',   icon: Truck },
  { to: '/shop',         label: 'Shop View',       icon: Store },
  { to: '/admin/bin-qr', label: 'Bin QR Codes',    icon: QrCode },
  { to: '/admin/users',  label: 'Manage Users',    icon: Users },
]

const navByRole = { user: userNav, cleaner: cleanerNav, shop: shopNav, admin: adminNav }

export default function Sidebar({ open, onClose }) {
  const { role } = useAuth()
  const navItems = navByRole[role] ?? userNav

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-leaf-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-leaf-200 dark:border-leaf-900 bg-white/80 dark:bg-leaf-950/90 backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <NavLink to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-glow">
              <Recycle size={18} />
            </span>
            EcoLoop
          </NavLink>
          <button className="p-1.5 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-leaf-500 to-sky-500 text-white shadow-lg shadow-leaf-500/20'
                    : 'text-leaf-700/80 hover:bg-leaf-100 dark:text-leaf-100/80 dark:hover:bg-leaf-900'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="glass m-3 rounded-2xl p-4 text-center">
          <p className="font-display text-sm font-semibold capitalize">{role} account</p>
          <p className="mt-1 text-xs text-leaf-700/60 dark:text-leaf-200/50">
            {role === 'cleaner' && 'Field collection mode'}
            {role === 'shop'    && 'Reward fulfillment mode'}
            {role === 'admin'   && 'Full admin access'}
            {role === 'user'    && 'ESP32-powered smart bins'}
          </p>
        </div>
      </aside>
    </>
  )
}
