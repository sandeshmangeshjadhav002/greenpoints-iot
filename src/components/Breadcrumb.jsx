import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="mb-6 flex items-center gap-1.5 text-sm text-leaf-700/60 dark:text-leaf-200/50">
      <Link to="/dashboard" className="flex items-center gap-1 hover:text-leaf-600 dark:hover:text-mint-400">
        <Home size={14} />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight size={14} />
          {item.href ? (
            <Link to={item.href} className="hover:text-leaf-600 dark:hover:text-mint-400">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-leaf-800 dark:text-leaf-100">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
