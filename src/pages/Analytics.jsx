import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts'
import Card from '../components/Card'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { BarChart3 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

function useAdminData(path, apiFetch) {
  const [data, setData] = useState([])
  useEffect(() => {
    apiFetch(path).then((r) => setData(r.data)).catch(() => setData([]))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return data
}

export default function Analytics() {
  const { apiFetch, role } = useAuth()
  const isAdmin = role === 'admin'

  const collectionTrends  = useAdminData('/api/dashboard/collection-trends',  apiFetch)
  const categoryBreakdown = useAdminData('/api/dashboard/category-breakdown',  apiFetch)
  const tokenDist         = useAdminData('/api/dashboard/token-distribution',  apiFetch)
  const envImpact         = useAdminData('/api/dashboard/environmental-impact', apiFetch)
  const userGrowth        = useAdminData('/api/dashboard/user-growth',         apiFetch)
  const binUsage          = useAdminData('/api/dashboard/bin-usage',           apiFetch)

  const [wasteDist, setWasteDist] = useState([])
  useEffect(() => {
    apiFetch('/api/dashboard/waste-distribution').then((r) => setWasteDist(r.data)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Analytics' }]} />
        <EmptyState
          icon={BarChart3}
          title="Admin analytics"
          description="City-wide analytics charts are visible to administrators only."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Analytics' }]} />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">City-wide trends and platform performance</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <p className="mb-4 font-display text-sm font-semibold">Waste Collection Trends (kg/month)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={collectionTrends}>
              <defs>
                <linearGradient id="collGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284C7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#0284C7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Area type="monotone" dataKey="collected" stroke="#0284C7" strokeWidth={2.5} fill="url(#collGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="mb-4 font-display text-sm font-semibold">Recycling by Category</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryBreakdown} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="kg" fill="#16A34A" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="mb-4 font-display text-sm font-semibold">Monthly Token Distribution</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tokenDist}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="tokens" fill="#34D399" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="mb-4 font-display text-sm font-semibold">Environmental Impact</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={envImpact}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="co2"   name="CO₂ (kg)"  stroke="#16A34A" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="water" name="Water (L)" stroke="#0284C7" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="trees" name="Trees"     stroke="#f59e0b" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="mb-4 font-display text-sm font-semibold">User Growth</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={userGrowth}>
              <defs>
                <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Area type="monotone" dataKey="users" stroke="#16A34A" strokeWidth={2.5} fill="url(#userGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <p className="mb-4 font-display text-sm font-semibold">Smart Bin Usage by Area (%)</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={binUsage}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
              <XAxis dataKey="location" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Bar dataKey="usage" fill="#0284C7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="mt-5">
        <p className="mb-4 font-display text-sm font-semibold">Overall Waste Type Distribution</p>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ResponsiveContainer width="100%" height={260} className="sm:!w-1/2">
            <PieChart>
              <Pie data={wasteDist} dataKey="value" nameKey="name" outerRadius={95} paddingAngle={3}>
                {wasteDist.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid flex-1 grid-cols-2 gap-4">
            {wasteDist.map((w) => (
              <div key={w.name} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: w.color }} />
                <span className="text-sm">{w.name}</span>
                <span className="ml-auto font-mono text-sm font-semibold">{w.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
