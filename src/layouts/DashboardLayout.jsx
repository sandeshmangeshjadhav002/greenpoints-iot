import { useState } from 'react'
import { Menu, Sun, Moon } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import NotificationDropdown from '../components/NotificationDropdown'
import UserMenu from '../components/UserMenu'
import SearchBar from '../components/SearchBar'
import FloatingActionButton from '../components/FloatingActionButton'
import { useTheme } from '../context/ThemeContext'

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-leaf-200 dark:border-leaf-900 bg-white/70 dark:bg-leaf-950/80 backdrop-blur-xl px-4 py-3 sm:px-6">
          <button className="rounded-lg p-2 hover:bg-leaf-100 dark:hover:bg-leaf-900 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <SearchBar placeholder="Search bins, rewards, activity..." className="hidden max-w-sm flex-1 sm:block" />
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-leaf-700 hover:bg-leaf-100 dark:text-leaf-100 dark:hover:bg-leaf-900"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationDropdown />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      <FloatingActionButton />
    </div>
  )
}
