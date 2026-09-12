import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import Card from '../components/Card'
import Table from '../components/Table'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const podiumStyles = {
  1: 'from-amber-400 to-amber-500 order-2 sm:-translate-y-4',
  2: 'from-slate-300 to-slate-400 order-1',
  3: 'from-orange-400 to-orange-500 order-3',
}

export default function Leaderboard() {
  const { apiFetch } = useAuth()
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      apiFetch('/api/points/leaderboard?limit=50').then((r) => r.data),
      apiFetch('/api/points/me/rank').then((r) => r.data.rank).catch(() => null),
    ]).then(([lb, rank]) => {
      if (!active) return
      setLeaders(lb)
      setMyRank(rank)
    }).catch(console.error)
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const podium = leaders.slice(0, 3)
  const rest   = leaders.slice(3)

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Leaderboard' }]} />

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Leaderboard</h1>
        <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">Top recyclers this week</p>
      </div>

      {loading ? (
        <EmptyState icon={Trophy} title="Loading leaderboard…" description="Fetching rankings." />
      ) : leaders.length === 0 ? (
        <EmptyState icon={Trophy} title="No leaderboard data yet" description="Rankings will appear once recycling activity is recorded." />
      ) : (
        <>
          {/* Podium */}
          <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-center">
            {podium.map((p) => (
              <div key={p.rank} className={classNames('flex w-full flex-col items-center sm:w-52', podiumStyles[p.rank])}>
                <div className="glass w-full rounded-2xl p-5 text-center">
                  <div className="relative mx-auto mb-3 w-fit">
                    {p.avatar
                      ? <img src={p.avatar} alt={p.name} className="h-16 w-16 rounded-full ring-4 ring-white dark:ring-leaf-900" />
                      : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 dark:bg-leaf-900 ring-4 ring-white dark:ring-leaf-900 font-display text-xl font-bold text-leaf-600 dark:text-mint-400">{p.name[0]}</div>
                    }
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
              {rest.length > 0 && (
                <Table
                  columns={['Rank', 'Recycler', 'Points', 'Waste (kg)']}
                  data={rest}
                  renderRow={(row) => (
                    <>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono font-semibold">#{row.rank}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          {row.avatar
                            ? <img src={row.avatar} alt={row.name} className="h-8 w-8 rounded-full" />
                            : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-100 dark:bg-leaf-900 text-xs font-bold text-leaf-600 dark:text-mint-400">{row.name[0]}</div>
                          }
                          {row.name}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono">{row.points.toLocaleString()}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">{row.wasteKg}</td>
                    </>
                  )}
                />
              )}
            </div>

            <div>
              <Card className="text-center">
                <p className="font-display font-semibold">Your rank</p>
                {myRank
                  ? <p className="mt-2 font-display text-3xl font-bold text-leaf-600 dark:text-mint-400">#{myRank}</p>
                  : <p className="mt-1 text-sm text-leaf-700/60 dark:text-leaf-200/50">Start recycling to earn a rank!</p>
                }
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
