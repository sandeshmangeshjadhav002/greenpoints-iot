import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Recycle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const { authenticate } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const result = await authenticate(mode === 'login' ? 'login' : 'signup', email, password)
      if (!result.accessToken) {
        // signup with email confirmation required, or signup returned a message
        setMode('login')
        setMessage(result.message || 'Account created! Confirm your email, then sign in.')
      } else {
        navigate(location.state?.from || '/dashboard', { replace: true })
      }
    } catch (requestError) {
      // Surface confirmation errors differently so the user knows what to do
      const msg = requestError.message || ''
      if (msg.toLowerCase().includes('not confirmed') || msg.toLowerCase().includes('confirmation')) {
        setError('') 
        setMessage('Please confirm your email first — check your inbox for the link from Supabase, then sign in.')
      } else {
        setError(msg)
      }
    } finally { setBusy(false) }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="glass w-full max-w-md rounded-3xl p-7 shadow-glow sm:p-9">
        <Link to="/" className="mb-7 flex items-center gap-2 font-display text-lg font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white"><Recycle size={18} /></span>EcoLoop</Link>
        <h1 className="font-display text-2xl font-bold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="mt-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">{mode === 'login' ? 'Sign in to see your recycling activity.' : 'Start tracking verified recycling activity.'}</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="w-full rounded-xl border border-leaf-200 bg-white/70 px-4 py-3 text-sm outline-none focus:border-leaf-500 dark:border-leaf-800 dark:bg-leaf-900/60" />
          <input required minLength="8" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ characters)" className="w-full rounded-xl border border-leaf-200 bg-white/70 px-4 py-3 text-sm outline-none focus:border-leaf-500 dark:border-leaf-800 dark:bg-leaf-900/60" />
          {error && <p className="text-sm text-red-500">{error}</p>}{message && <p className="text-sm text-leaf-600 dark:text-mint-400">{message}</p>}
          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button className="mt-5 w-full text-sm text-leaf-600 hover:underline dark:text-mint-400" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage('') }}>
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}
