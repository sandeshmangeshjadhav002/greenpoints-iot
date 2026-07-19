import { useState } from 'react'
import { Plus, ScanLine, MapPin, X } from 'lucide-react'

export default function FloatingActionButton() {
  const [open, setOpen] = useState(false)

  const actions = [
    { icon: ScanLine, label: 'Scan Bin QR' },
    { icon: MapPin, label: 'Find Nearest Bin' },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open &&
        actions.map((a, i) => (
          <button
            key={i}
            className="glass flex items-center gap-2 rounded-full py-2 pl-4 pr-5 text-sm font-medium shadow-glow animate-fadeUp"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <a.icon size={16} className="text-leaf-500" />
            {a.label}
          </button>
        ))}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-glow transition-transform duration-300 hover:scale-110 active:scale-95"
        aria-label="Quick actions"
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  )
}
