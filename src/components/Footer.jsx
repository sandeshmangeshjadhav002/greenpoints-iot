import { Link } from 'react-router-dom'
import { Recycle, Twitter, Instagram, Linkedin, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-leaf-200 dark:border-leaf-900 bg-white/40 dark:bg-leaf-950/60">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8 lg:px-10">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-leaf-500 to-sky-500 text-white">
                <Recycle size={18} />
              </span>
              EcoLoop
            </Link>
            <p className="mt-3 max-w-xs text-sm text-leaf-700/70 dark:text-leaf-200/60">
              Smart bins, real rewards. Turning everyday recycling into measurable environmental impact.
            </p>
            <div className="mt-5 flex gap-3">
              {[Twitter, Instagram, Linkedin, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="rounded-full border border-leaf-200 dark:border-leaf-800 p-2 text-leaf-600 dark:text-leaf-200 transition-colors hover:bg-leaf-500 hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="font-display text-sm font-semibold">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">
              <li><Link to="/dashboard" className="hover:text-leaf-600 dark:hover:text-mint-400">Dashboard</Link></li>
              <li><Link to="/smart-bins" className="hover:text-leaf-600 dark:hover:text-mint-400">Smart Bins</Link></li>
              <li><Link to="/rewards" className="hover:text-leaf-600 dark:hover:text-mint-400">Rewards</Link></li>
              <li><Link to="/analytics" className="hover:text-leaf-600 dark:hover:text-mint-400">Analytics</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-display text-sm font-semibold">Company</p>
            <ul className="mt-3 space-y-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">
              <li><Link to="/about" className="hover:text-leaf-600 dark:hover:text-mint-400">About</Link></li>
              <li><Link to="/contact" className="hover:text-leaf-600 dark:hover:text-mint-400">Contact</Link></li>
              <li><Link to="/leaderboard" className="hover:text-leaf-600 dark:hover:text-mint-400">Leaderboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-leaf-200 dark:border-leaf-900 pt-6 text-xs text-leaf-700/60 dark:text-leaf-200/50 sm:flex-row">
          <p>© {new Date().getFullYear()} EcoLoop. All rights reserved.</p>
          <p>Built for a cleaner tomorrow, one bin at a time. 🌱</p>
        </div>
      </div>
    </footer>
  )
}
