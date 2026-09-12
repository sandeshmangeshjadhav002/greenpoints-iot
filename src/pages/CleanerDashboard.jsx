import { useState, useEffect, useCallback } from 'react'
import { Trash2, AlertTriangle, CheckCircle2, Radio, RefreshCw, MapPin, BatteryMedium } from 'lucide-react'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'
import { ProgressBar } from '../components/ProgressBar'
import { useAuth } from '../context/AuthContext'
import { healthColor, classNames } from '../utils/helpers'

export default function CleanerDashboard() {
  const { apiFetch } = useAuth()

  const [stats, setStats]         = useState(null)
  const [fullBins, setFullBins]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [collecting, setCollecting] = useState(null)   // bin code being marked collected
  const [message, setMessage]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statsRes, binsRes] = await Promise.all([
        apiFetch('/api/cleaner/stats'),
        apiFetch('/api/cleaner/bins/full?threshold=75'),
      ])
      setStats(statsRes.data)
      setFullBins(binsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [apiFetch])

  useEffect(() => { load() }, [load])

  async function markCollected(code) {
    setCollecting(code)
    setMessage('')
    try {
      await apiFetch(`/api/cleaner/bins/${code}/collected`, { method: 'POST' })
      setMessage(`Bin ${code} marked as collected.`)
      setFullBins((prev) => prev.filter((b) => b.id !== code))
      setStats((s) => s ? { ...s, critical_bins: Math.max(0, s.critical_bins - 1), near_full_bins: Math.max(0, s.near_full_bins - 1) } : s)
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setCollecting(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Cleaner Dashboard' }]} />

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Cleaner Dashboard</h1>
          <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
            Bins needing collection right now
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-leaf-200 dark:border-leaf-800 px-4 py-2 text-sm hover:bg-leaf-50 dark:hover:bg-leaf-900 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={Trash2}         label="Total Bins"    value={stats.total_bins}    accent="leaf" trend={0} />
          <StatCard icon={AlertTriangle}  label="Critical"      value={stats.critical_bins}  accent="amber" trend={0} />
          <StatCard icon={Radio}          label="Near Full"     value={stats.near_full_bins} accent="sky" trend={0} />
          <StatCard icon={CheckCircle2}   label="Online"        value={stats.online_bins}    accent="leaf" trend={0} />
        </div>
      )}

      {message && (
        <div className={classNames(
          'mb-4 rounded-xl px-4 py-3 text-sm',
          message.startsWith('Error')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
            : 'bg-leaf-50 dark:bg-leaf-900/60 text-leaf-700 dark:text-mint-400',
        )}>
          {message}
        </div>
      )}

      {loading ? (
        <EmptyState icon={Radio} title="Loading bins…" description="Fetching live bin status." />
      ) : fullBins.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All bins are clear"
          description="No bins currently at or above 75% fill. Check back later."
        />
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-leaf-700/60 dark:text-leaf-200/50">
            {fullBins.length} bin{fullBins.length !== 1 ? 's' : ''} need attention
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {fullBins.map((bin) => (
              <Card key={bin.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-base font-bold">{bin.id}</p>
                    <p className="flex items-center gap-1 text-xs text-leaf-700/60 dark:text-leaf-200/50">
                      <MapPin size={12} /> {bin.location}
                    </p>
                  </div>
                  <span className={classNames('rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize', healthColor(bin.health))}>
                    {bin.health}
                  </span>
                </div>

                <ProgressBar value={bin.fillLevel} label="Fill Level" />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <BatteryMedium size={14} className={bin.battery < 30 ? 'text-red-500' : 'text-leaf-500'} />
                    {bin.battery}% battery
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={bin.wasteType === 'E-Waste' ? 'amber' : 'leaf'}>{bin.wasteType}</Badge>
                  </div>
                </div>

                <button
                  onClick={() => markCollected(bin.id)}
                  disabled={collecting === bin.id}
                  className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-leaf-500 to-sky-500 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  {collecting === bin.id ? 'Marking…' : 'Mark as Collected'}
                </button>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
