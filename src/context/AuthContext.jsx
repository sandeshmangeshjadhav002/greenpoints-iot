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
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.detail || body.error || 'Authentication failed')
    if (body.accessToken) persist(body)
    return body
  }, [persist])

  const signOut = useCallback(() => persist(null), [persist])

  const value = useMemo(() => ({ session, user: session?.user ?? null, authenticate, signOut }), [session, authenticate, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
