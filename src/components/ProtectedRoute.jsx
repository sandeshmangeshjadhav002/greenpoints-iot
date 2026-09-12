import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute
 *
 * Props:
 *   children   — the page to render when access is granted
 *   roles      — optional array of allowed roles e.g. ['cleaner','admin']
 *                If omitted any authenticated user is allowed.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, role } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && !roles.includes(role)) {
    // Redirect to the correct home for this role rather than showing a blank 403
    const roleHome = { cleaner: '/cleaner', shop: '/shop', admin: '/dashboard' }
    return <Navigate to={roleHome[role] || '/dashboard'} replace />
  }

  return children
}
