export function classNames(...c) {
  return c.filter(Boolean).join(' ')
}

export function healthColor(health) {
  switch (health) {
    case 'good':
      return 'text-leaf-600 bg-leaf-100 dark:bg-leaf-900 dark:text-mint-400'
    case 'warning':
      return 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300'
    case 'critical':
      return 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300'
    default:
      return 'text-leaf-600 bg-leaf-100'
  }
}

export function fillColor(level) {
  if (level >= 85) return 'from-red-500 to-red-400'
  if (level >= 60) return 'from-amber-500 to-amber-400'
  return 'from-leaf-500 to-mint-400'
}
