import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Search...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-leaf-500/60" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"
      />
    </div>
  )
}
