import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'
import { currentUser } from '../data/users'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-leaf-100 dark:hover:bg-leaf-900"
      >
        {currentUser.avatar ? <img src={currentUser.avatar} alt={currentUser.name} className="h-8 w-8 rounded-full ring-2 ring-leaf-300 dark:ring-leaf-700" /> : <User size={20} className="m-1" />}
        <span className="hidden text-sm font-medium sm:block">{currentUser.name ? currentUser.name.split(' ')[0] : 'Guest'}</span>
        <ChevronDown size={14} className="hidden sm:block" />
      </button>
      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-52 rounded-2xl p-2 shadow-glow animate-fadeUp">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{currentUser.name || 'Guest'}</p>
            {currentUser.email && <p className="truncate text-xs text-leaf-700/60 dark:text-leaf-200/50">{currentUser.email}</p>}
          </div>
          <div className="my-1 h-px bg-leaf-200 dark:bg-leaf-800" />
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-leaf-50 dark:hover:bg-leaf-900">
            <User size={16} /> Profile
          </Link>
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-leaf-50 dark:hover:bg-leaf-900">
            <Settings size={16} /> Settings
          </Link>
          <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}
