import { useState, useEffect, useCallback } from 'react'
import { Users, RefreshCw, CheckCircle2, AlertCircle, Shield } from 'lucide-react'
import Card from '../components/Card'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const ROLES = ['user', 'cleaner', 'shop', 'admin']

const ROLE_STYLE = {
  user:    'bg-leaf-100 text-leaf-700 dark:bg-leaf-900 dark:text-mint-400',
  cleaner: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  shop:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  admin:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export default function AdminUsers() {
  const { apiFetch } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState({})   // { [userId]: true }
  const [feedback, setFeedback] = useState({}) // { [userId]: 'ok' | 'err' }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/admin/users')
      setUsers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  async function changeRole(userId, newRole, shopName) {
    setSaving((s) => ({ ...s, [userId]: true }))
    setFeedback((f) => ({ ...f, [userId]: null }))
    try {
      await apiFetch('/api/auth/set-role', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, role: newRole, shop_name: shopName || null }),
      })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
      setFeedback((f) => ({ ...f, [userId]: 'ok' }))
    } catch (err) {
      // Revert dropdown to previous role on failure
      setUsers((prev) => [...prev])
      setFeedback((f) => ({ ...f, [userId]: err.message }))
      console.error('set-role failed:', err.message)
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }))
      setTimeout(() => setFeedback((f) => ({ ...f, [userId]: null })), 4000)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumb items={[{ label: 'Admin' }, { label: 'Users' }]} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-leaf-500" />
            <h1 className="font-display text-2xl font-bold">User Management</h1>
          </div>
          <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
            Assign roles to control what each user can access
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-leaf-200 dark:border-leaf-800 px-4 py-2 text-sm hover:bg-leaf-50 dark:hover:bg-leaf-900 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Role legend */}
      <div className="mb-5 flex flex-wrap gap-3">
        {ROLES.map((r) => (
          <span key={r} className={classNames('rounded-full px-3 py-1 text-xs font-semibold capitalize', ROLE_STYLE[r])}>
            {r} {r === 'user' ? '— can scan QR & earn tokens' : r === 'cleaner' ? '— sees full bins, marks collected' : r === 'shop' ? '— fulfills reward redemptions' : '— full access'}
          </span>
        ))}
      </div>

      {loading ? (
        <EmptyState icon={Users} title="Loading users…" description="Fetching all accounts." />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="No accounts registered yet." />
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} hover={false} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              {/* Avatar initial */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-leaf-500 to-sky-500 font-display font-bold text-white">
                {(u.email || u.display_name || '?')[0].toUpperCase()}
              </div>

              {/* User info */}
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{u.email}</p>
                <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50 truncate">
                  {u.display_name || 'No display name'} · {u.token_balance} tokens
                  <span className="ml-2 font-mono text-[10px] opacity-50">{u.id.slice(0, 8)}…</span>
                </p>
              </div>

              {/* Role selector */}
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={u.role}
                  disabled={saving[u.id]}
                  onChange={(e) => changeRole(u.id, e.target.value, u.shop_name)}
                  className={classNames(
                    'rounded-xl border px-3 py-1.5 text-sm font-semibold capitalize outline-none focus:ring-2 focus:ring-leaf-500/20 disabled:opacity-50',
                    ROLE_STYLE[u.role],
                    'border-transparent cursor-pointer',
                  )}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} className="bg-white dark:bg-leaf-950 text-leaf-900 dark:text-leaf-100 font-normal">
                      {r}
                    </option>
                  ))}
                </select>

                {/* Shop name input — only shown for shop role */}
                {u.role === 'shop' && (
                  <input
                    type="text"
                    defaultValue={u.shop_name || ''}
                    placeholder="Shop name"
                    onBlur={(e) => {
                      if (e.target.value !== (u.shop_name || '')) {
                        changeRole(u.id, 'shop', e.target.value)
                      }
                    }}
                    className="w-32 rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-3 py-1.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"
                  />
                )}

                {/* Feedback */}
                {saving[u.id] && (
                  <RefreshCw size={16} className="animate-spin text-leaf-500" />
                )}
                {feedback[u.id] === 'ok' && (
                  <CheckCircle2 size={16} className="text-leaf-500" />
                )}
                {feedback[u.id] && feedback[u.id] !== 'ok' && (
                  <span className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle size={14} /> {feedback[u.id].includes('constraint') ? 'Run the SQL fix in Supabase — see notes below' : feedback[u.id]}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-leaf-700/40 dark:text-leaf-200/30 text-center">
        Role changes take effect on the user's next sign-in (new JWT is issued at login).
      </p>

      {/* One-time setup note */}
      <div className="mt-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
        <p className="font-semibold mb-1">⚠ If role changes fail with a constraint error:</p>
        <p>Run this once in the <strong>Supabase SQL Editor</strong>:</p>
        <pre className="mt-2 overflow-x-auto rounded bg-amber-100 dark:bg-amber-900/40 p-2 text-[10px] leading-relaxed">{`ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('user','cleaner','shop','admin'));
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS shop_name text;`}</pre>
      </div>
    </div>
  )
}
