import { createContext, useContext, useCallback, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const storageKey = 'ecoloop-session'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) } catch { return null }
  })

  const persist = useCallback((nextSession) => {
    setSession(nextSession)
    if (nextSession) localStorage.setItem(storageKey, JSON.stringify(nextSession))
    else localStorage.removeItem(storageKey)
  }, [])

  const authenticate = useCallback(async (mode, email, password) => {
    const response = await fetch(`${apiBaseUrl}/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.detail || body.error || 'Authentication failed')
    if (body.accessToken) {
      // Decode role from JWT payload (base64url middle segment) without a library
      try {
        const payloadB64 = body.accessToken.split('.')[1]
        const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
        body.role = payload.role || 'user'
      } catch {
        body.role = 'user'
      }
      persist(body)
    }
    return body
  }, [persist])

  const signOut = useCallback(() => persist(null), [persist])

  /** Perform an authenticated API request using the stored access token. */
  const apiFetch = useCallback(async (path, options = {}) => {
    const token = session?.accessToken
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    }
    const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers })
    if (response.status === 401) {
      persist(null)
      throw new Error('Session expired — please sign in again.')
    }
    const body = await response.json()
    if (!response.ok) throw new Error(body.detail || body.error || 'Request failed')
    return body
  }, [session, persist])

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    /** 'user' | 'cleaner' | 'shop' | 'admin' — decoded from JWT stored in session */
    role: session?.role ?? 'user',
    accessToken: session?.accessToken ?? null,
    authenticate,
    signOut,
    apiFetch,
    apiBaseUrl,
  }), [session, authenticate, signOut, apiFetch])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
