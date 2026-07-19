import { useEffect, useState } from 'react'
import { classNames, fillColor } from '../utils/helpers'

export function ProgressBar({ value, label, showValue = true, colorClass }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 150)
    return () => clearTimeout(t)
  }, [value])

  return (
    <div className="w-full">
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-leaf-700/70 dark:text-leaf-200/60">{label}</span>
          {showValue && <span className="font-mono font-semibold">{value}%</span>}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-leaf-100 dark:bg-leaf-900">
        <div
          className={classNames(
            'h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out',
            colorClass || fillColor(value)
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function RadialProgress({ value, size = 96, stroke = 8, label, sublabel, colorClass = 'text-leaf-500' }) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setProgress(value), 150)
    return () => clearTimeout(t)
  }, [value])

  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          className="fill-none stroke-leaf-100 dark:stroke-leaf-900"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={classNames('fill-none transition-all duration-1000 ease-out', colorClass)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold">{label ?? `${Math.round(progress)}%`}</span>
        {sublabel && <span className="text-[10px] text-leaf-700/60 dark:text-leaf-200/50">{sublabel}</span>}
      </div>
    </div>
  )
}
