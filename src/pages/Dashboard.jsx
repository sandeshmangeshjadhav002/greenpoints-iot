import { useEffect, useState, useCallback } from 'react'
import {
  Coins, Recycle, Leaf, Flame, Sparkles, Award, Cpu, Users, Trophy,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import { RadialProgress, ProgressBar } from '../components/ProgressBar'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'

const badgeIconMap = { Sparkles, Flame, Award, Cpu, Users, Trophy }

const typeVariant = {
  Recyclable: 'leaf',
  Organic: 'sky',
  General: 'neutral',
  'E-Waste': 'amber',
}

function useApi(fetchFn) {
  const [data, setData]   = useState(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    fetchFn().then((d) => { if (active) setData(d) }).catch(console.error).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return { data, loading }
}

export default function Dashboard() {
  const { apiFetch } = useAuth()

  const summary  = useApi(() => apiFetch('/api/dashboard/summary').then((r) => r.data))
  const weekly   = useApi(() => apiFetch('/api/dashboard/weekly-activity').then((r) => r.data))
  const wasteDist = useApi(() => apiFetch('/api/dashboard/waste-distribution').then((r) => r.data))
  const activity  = useApi(() => apiFetch('/api/dashboard/recent-activity').then((r) => r.data))
  const badges    = useApi(() => apiFetch('/api/dashboard/badges').then((r) => r.data))

  const s   = summary.data   || {}
  const act = activity.data  || []
  const bdg = badges.data    || []
  const wa  = weekly.data    || []
  const wd  = wasteDist.data || []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome */}
      <Card className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">
              Welcome back, {s.name?.split(' ')[0] || '…'} 👋
            </h1>
            <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
              You're on a{' '}
              <span className="font-semibold text-leaf-600 dark:text-mint-400">
                {s.streakDays ?? 0}-day
              </span>{' '}
              recycling streak. Keep it going!
            </p>
          </div>
        </div>
        {s.level && <Badge variant="leaf" className="px-4 py-2 text-sm">{s.level}</Badge>}
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Coins}  label="Token Balance"              value={s.tokens ?? 0}        trend={0} accent="leaf" />
        <StatCard icon={Recycle} label="Total Waste Recycled (kg)" value={s.totalWasteKg ?? 0}  decimals={1} trend={0} accent="sky" />
        <StatCard icon={Leaf}   label="Carbon Emissions Saved (kg)" value={s.co2SavedKg ?? 0}   decimals={1} trend={0} accent="leaf" />
        <StatCard icon={Flame}  label="Recycling Streak (days)"     value={s.streakDays ?? 0}    trend={0} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Environmental impact */}
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="mb-3 font-display text-sm font-semibold text-leaf-700/70 dark:text-leaf-200/60">Environmental Impact</p>
          <RadialProgress
            value={s.levelProgress ?? 0}
            colorClass="text-leaf-500"
            label={`${s.levelProgress ?? 0}%`}
            sublabel="Eco Score"
            size={120}
          />
          <p className="mt-3 text-xs text-leaf-700/60 dark:text-leaf-200/50">
            Level: <span className="font-semibold">{s.level || 'Bronze'}</span>
          </p>
        </Card>

        {/* Progress to next reward */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Progress to next level</p>
            <span className="font-mono text-xs text-leaf-700/60 dark:text-leaf-200/50">{s.levelProgress ?? 0}%</span>
          </div>
          <ProgressBar value={s.levelProgress ?? 0} colorClass="from-leaf-500 to-sky-500" showValue={false} />
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-lg font-bold">{(s.tokens ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-leaf-700/60 dark:text-leaf-200/50">Tokens</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold">{s.rank ?? '—'}</p>
              <p className="text-[11px] text-leaf-700/60 dark:text-leaf-200/50">City rank</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold">{s.disposalCount ?? 0}</p>
              <p className="text-[11px] text-leaf-700/60 dark:text-leaf-200/50">Disposals</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-4 font-display text-sm font-semibold">Weekly Recycling Activity (kg)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={wa}>
              <defs>
                <linearGradient id="kgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#16A34A" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Area type="monotone" dataKey="kg" stroke="#16A34A" strokeWidth={2.5} fill="url(#kgGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="mb-4 font-display text-sm font-semibold">Waste Type Distribution</p>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={wd} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {wd.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <p className="mb-4 font-display text-sm font-semibold">Token Earnings This Week</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={wa}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0284C7" strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
            <Bar dataKey="tokens" fill="#0284C7" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <p className="mb-4 font-display text-sm font-semibold">Recent Recycling Activity</p>
          {activity.loading ? (
            <p className="text-sm text-leaf-700/50 dark:text-leaf-200/40">Loading…</p>
          ) : act.length === 0 ? (
            <EmptyState icon={Recycle} title="No activity yet" description="Your recycling drops will appear here." />
          ) : (
            <div className="space-y-3">
              {act.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-xl border border-leaf-100 dark:border-leaf-900 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf-100 dark:bg-leaf-900 text-leaf-600 dark:text-mint-400">
                      <Recycle size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{a.bin}</p>
                        <Badge variant={typeVariant[a.type]}>{a.type}</Badge>
                      </div>
                      <p className="text-xs text-leaf-700/60 dark:text-leaf-200/50">{a.date} · {a.kg}kg</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-semibold text-leaf-600 dark:text-mint-400">+{a.tokens}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Achievement badges */}
        <Card>
          <p className="mb-4 font-display text-sm font-semibold">Achievement Badges</p>
          {badges.loading ? (
            <p className="text-sm text-leaf-700/50 dark:text-leaf-200/40">Loading…</p>
          ) : bdg.length === 0 ? (
            <EmptyState icon={Award} title="No badges yet" description="Earn badges by hitting recycling milestones." />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {bdg.map((b) => {
                const Icon = badgeIconMap[b.icon] || Award
                return (
                  <div
                    key={b.id}
                    title={b.desc}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center ${
                      b.earned
                        ? 'bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-lg'
                        : 'bg-leaf-100 text-leaf-400 dark:bg-leaf-900 dark:text-leaf-700'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-medium leading-tight">{b.name}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
