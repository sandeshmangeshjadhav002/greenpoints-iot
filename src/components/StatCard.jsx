import Card from './Card'
import AnimatedCounter from './AnimatedCounter'
import { classNames } from '../utils/helpers'

export default function StatCard({ icon: Icon, label, value, decimals = 0, suffix = '', trend, accent = 'leaf' }) {
  const accents = {
    leaf: 'from-leaf-500 to-mint-400',
    sky: 'from-sky-500 to-sky-400',
    amber: 'from-amber-500 to-amber-400',
  }
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={classNames('rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg', accents[accent])}>
          <Icon size={20} strokeWidth={2} />
        </div>
        {trend && (
          <span className={classNames(
            'font-mono text-xs font-semibold',
            trend > 0 ? 'text-leaf-600 dark:text-mint-400' : 'text-red-500'
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
        </p>
        <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">{label}</p>
      </div>
    </Card>
  )
}
