import { useState, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, Coins, Flame, Gift, WifiOff, Trophy, CheckCircle2 } from 'lucide-react'
import { notifications as initialNotifications } from '../data/notifications'
import { Link } from 'react-router-dom'

const iconMap = { AlertTriangle, Coins, Flame, Gift, WifiOff, Trophy, CheckCircle2 }

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(initialNotifications)
  const ref = useRef(null)
  const unread = items.filter((n) => !n.read).length

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-leaf-700 hover:bg-leaf-100 dark:text-leaf-100 dark:hover:bg-leaf-900"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-80 rounded-2xl p-2 shadow-glow animate-fadeUp">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="font-display text-sm font-semibold">Notifications</p>
            <button
              onClick={() => setItems((its) => its.map((n) => ({ ...n, read: true })))}
              className="text-xs font-medium text-leaf-600 hover:underline dark:text-mint-400"
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.slice(0, 5).map((n) => {
              const Icon = iconMap[n.icon] || Bell
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-leaf-50 dark:hover:bg-leaf-900 ${
                    !n.read ? 'bg-leaf-50/60 dark:bg-leaf-900/40' : ''
                  }`}
                >
                  <Icon size={16} className="mt-0.5 shrink-0 text-leaf-500" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{n.title}</p>
                    <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">{n.time}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl px-3 py-2 text-center text-sm font-medium text-leaf-600 hover:bg-leaf-50 dark:text-mint-400 dark:hover:bg-leaf-900"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  )
}
