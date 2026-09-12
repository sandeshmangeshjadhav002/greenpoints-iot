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
import { currentUser } from '../data/users'
import { weeklyActivity, wasteDistribution } from '../data/analytics'
import { recentActivity, badges } from '../data/history'

const badgeIconMap = { Sparkles, Flame, Award, Cpu, Users, Trophy }

const typeVariant = {
  Recyclable: 'leaf',
  Organic: 'sky',
  General: 'neutral',
  'E-Waste': 'amber',
}

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Welcome */}
      <Card className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-display text-xl font-bold sm:text-2xl">Welcome back, {currentUser.name.split(' ')[0]} 👋</h1>
            <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
              You're on a <span className="font-semibold text-leaf-600 dark:text-mint-400">{currentUser.streakDays}-day</span> recycling streak. Keep it going!
            </p>
          </div>
        </div>
        {currentUser.level && <Badge variant="leaf" className="px-4 py-2 text-sm">{currentUser.level}</Badge>}
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Coins} label="Token Balance" value={currentUser.tokens} trend={0} accent="leaf" />
        <StatCard icon={Recycle} label="Total Waste Recycled (kg)" value={currentUser.totalWasteKg} decimals={1} trend={0} accent="sky" />
        <StatCard icon={Leaf} label="Carbon Emissions Saved (kg)" value={currentUser.co2SavedKg} decimals={1} trend={0} accent="leaf" />
        <StatCard icon={Flame} label="Recycling Streak (days)" value={currentUser.streakDays} trend={0} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Environmental impact + progress */}
        <Card className="flex flex-col items-center justify-center text-center">
          <p className="mb-3 font-display text-sm font-semibold text-leaf-700/70 dark:text-leaf-200/60">Environmental Impact</p>
          <RadialProgress value={0} colorClass="text-leaf-500" label="0" sublabel="Eco Score" size={120} />
          <p className="mt-4 text-xs text-leaf-700/60 dark:text-leaf-200/50">
            No impact data is available yet.
          </p>
        </Card>

        {/* Progress to next reward */}
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-display text-sm font-semibold">Progress to next reward</p>
            <span className="font-mono text-xs text-leaf-700/60 dark:text-leaf-200/50">{currentUser.levelProgress}%</span>
          </div>
          <ProgressBar value={currentUser.levelProgress} colorClass="from-leaf-500 to-sky-500" showValue={false} />
          <p className="mt-3 text-xs text-leaf-700/60 dark:text-leaf-200/50">
            Recycling progress will be shown here when available.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-lg font-bold">0</p>
              <p className="text-[11px] text-leaf-700/60 dark:text-leaf-200/50">Tokens to next tier</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold">—</p>
              <p className="text-[11px] text-leaf-700/60 dark:text-leaf-200/50">City rank</p>
            </div>
            <div>
              <p className="font-display text-lg font-bold">—</p>
              <p className="text-[11px] text-leaf-700/60 dark:text-leaf-200/50">Next multiplier</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <p className="mb-4 font-display text-sm font-semibold">Weekly Recycling Activity (kg)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={weeklyActivity}>
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
              <Pie data={wasteDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {wasteDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="none" />
                ))}
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
          <BarChart data={weeklyActivity}>
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
          {recentActivity.length === 0 ? (
            <EmptyState icon={Recycle} title="No activity yet" description="Your recycling drops will appear here." />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((a) => (
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
          {badges.length === 0 ? (
            <EmptyState icon={Award} title="No badges yet" description="Earn badges by hitting recycling milestones." />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {badges.map((b) => {
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
