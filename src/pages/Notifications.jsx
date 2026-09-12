import { useState, useEffect, useCallback } from 'react'
import {
  Bell, AlertTriangle, Coins, Flame, Gift, WifiOff, Trophy, CheckCircle2, Check,
} from 'lucide-react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const iconMap = { AlertTriangle, Coins, Flame, Gift, WifiOff, Trophy, CheckCircle2, Bell }

const categoryVariant = {
  Alert: 'red',
  Reward: 'leaf',
  Achievement: 'amber',
  Update: 'sky',
}

const filters = ['All', 'Alert', 'Reward', 'Achievement', 'Update']

export default function Notifications() {
  const { apiFetch } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('All')

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/dashboard/notifications')
      setItems(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'All' ? items : items.filter((n) => n.category === filter)

  async function markRead(id) {
    setItems((its) => its.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try { await apiFetch(`/api/dashboard/notifications/${id}/read`, { method: 'POST' }) } catch { /* best-effort */ }
  }

  async function markAllRead() {
    setItems((its) => its.map((n) => ({ ...n, read: true })))
    try { await apiFetch('/api/dashboard/notifications/read-all', { method: 'POST' }) } catch { /* best-effort */ }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb items={[{ label: 'Notifications' }]} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
            {items.filter((n) => !n.read).length} unread notifications
          </p>
        </div>
        <button onClick={markAllRead} className="btn-secondary text-sm">
          <Check size={16} /> Mark all as read
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === f
                ? 'bg-gradient-to-r from-leaf-500 to-sky-500 text-white shadow-lg'
                : 'glass hover:bg-leaf-100 dark:hover:bg-leaf-900',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <EmptyState icon={Bell} title="Loading notifications…" description="Fetching your notifications." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="No notifications in this category." />
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => {
            const Icon = iconMap[n.icon] || Bell
            return (
              <Card key={n.id} hover={false} className={classNames('flex items-start gap-4', !n.read && 'ring-1 ring-leaf-300 dark:ring-leaf-700')}>
                <div className={classNames(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  !n.read ? 'bg-gradient-to-br from-leaf-500 to-sky-500 text-white' : 'bg-leaf-100 text-leaf-500 dark:bg-leaf-900 dark:text-leaf-400',
                )}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant={categoryVariant[n.category]}>{n.category}</Badge>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-leaf-500" />}
                  </div>
                  <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">{n.message}</p>
                  <p className="mt-2 text-xs text-leaf-700/50 dark:text-leaf-200/40">{n.time}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-leaf-600 hover:bg-leaf-100 dark:text-mint-400 dark:hover:bg-leaf-900"
                  >
                    Mark as read
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
