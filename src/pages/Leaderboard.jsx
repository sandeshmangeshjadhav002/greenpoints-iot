import { Trophy, TrendingUp } from 'lucide-react'
import Card from '../components/Card'
import Table from '../components/Table'
import Breadcrumb from '../components/Breadcrumb'
import { weeklyLeaders, monthlyAchievements } from '../data/leaderboard'
import { currentUser } from '../data/users'
import { classNames } from '../utils/helpers'

const podiumStyles = {
  1: 'from-amber-400 to-amber-500 order-2 sm:-translate-y-4',
  2: 'from-slate-300 to-slate-400 order-1',
  3: 'from-orange-400 to-orange-500 order-3',
}

export default function Leaderboard() {
  const podium = weeklyLeaders.slice(0, 3)
  const rest = weeklyLeaders.slice(3)

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Leaderboard' }]} />

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
        <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">Top recyclers in Mumbai this week</p>
      </div>

      {/* Podium */}
      <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center">
        {podium.map((p) => (
          <div key={p.rank} className={classNames('flex w-full flex-col items-center sm:w-52', podiumStyles[p.rank])}>
            <div className="glass w-full rounded-2xl p-5 text-center">
              <div className="relative mx-auto mb-3 w-fit">
                <img src={p.avatar} alt={p.name} className="h-16 w-16 rounded-full ring-4 ring-white dark:ring-leaf-900" />
                <span className={classNames('absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-lg', podiumStyles[p.rank])}>
                  {p.rank}
                </span>
              </div>
              <p className="truncate font-display font-semibold">{p.name}</p>
              <p className="mt-1 font-mono text-sm text-leaf-600 dark:text-mint-400">{p.points.toLocaleString()} pts</p>
              <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">{p.wasteKg}kg recycled</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Table
            columns={['Rank', 'Recycler', 'Points', 'Waste (kg)']}
            data={rest}
            renderRow={(row) => (
              <>
                <td className="whitespace-nowrap px-5 py-3.5 font-mono font-semibold">#{row.rank}</td>
                <td className="whitespace-nowrap px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <img src={row.avatar} alt={row.name} className="h-8 w-8 rounded-full" />
                    {row.name}
                  </div>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 font-mono">{row.points.toLocaleString()}</td>
                <td className="whitespace-nowrap px-5 py-3.5">{row.wasteKg}</td>
              </>
            )}
          />
        </div>

        <div className="space-y-5">
          <Card className="text-center">
            <p className="font-display font-semibold">Your rank</p>
            <p className="mt-1 text-sm text-leaf-700/60 dark:text-leaf-200/50">Your rank will appear once leaderboard data is available.</p>
          </Card>

          <Card>
            <p className="mb-4 flex items-center gap-2 font-display text-sm font-semibold">
              <Trophy size={16} className="text-amber-500" /> Monthly Achievements
            </p>
            <div className="space-y-3">
              {monthlyAchievements.map((a) => (
                <div key={a.title} className="rounded-xl border border-leaf-100 dark:border-leaf-900 p-3">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-leaf-700/70 dark:text-leaf-200/60">{a.name} · {a.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
