import { useState, useEffect } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, Recycle, Sun, Moon, ArrowRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-glass' : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-glow">
            <Recycle size={18} />
          </span>
          EcoLoop
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors hover:text-leaf-600 dark:hover:text-mint-400 ${
                  isActive ? 'text-leaf-600 dark:text-mint-400' : 'text-leaf-800/70 dark:text-leaf-100/70'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 text-leaf-700 hover:bg-leaf-100 dark:text-leaf-100 dark:hover:bg-leaf-900"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link to="/dashboard" className="btn-primary text-sm">
            Open Dashboard <ArrowRight size={16} />
          </Link>
        </div>

        <button className="p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="glass mx-4 mb-4 flex flex-col gap-1 rounded-2xl p-4 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-leaf-50 dark:hover:bg-leaf-900"
            >
              {l.label}
            </NavLink>
          ))}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-leaf-50 dark:hover:bg-leaf-900"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Toggle theme
          </button>
          <Link to="/dashboard" onClick={() => setOpen(false)} className="btn-primary mt-2 text-sm">
            Open Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </header>
  )
}
