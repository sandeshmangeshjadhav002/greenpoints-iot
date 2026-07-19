import { classNames } from '../utils/helpers'

const variants = {
  leaf: 'bg-leaf-100 text-leaf-700 dark:bg-leaf-900 dark:text-mint-400',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  neutral: 'bg-leaf-100/70 text-leaf-600 dark:bg-white/5 dark:text-leaf-200',
}

export default function Badge({ children, variant = 'leaf', className = '' }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
