import { useState, useMemo } from 'react'
import { MapPin, BatteryMedium, Wifi, WifiOff, Radio, Clock, Trash2, Search as SearchIcon } from 'lucide-react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Breadcrumb from '../components/Breadcrumb'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import { ProgressBar } from '../components/ProgressBar'
import useLiveBins from '../hooks/useLiveBins'
import { healthColor, classNames } from '../utils/helpers'

const wasteTypes = ['All', 'Recyclable', 'Organic', 'General', 'E-Waste']

export default function SmartBins() {
  const { bins, loading } = useLiveBins()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = useMemo(() => {
    return bins.filter((b) => {
      const matchesQuery =
        b.id.toLowerCase().includes(query.toLowerCase()) ||
        b.location.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'All' || b.wasteType === filter
      return matchesQuery && matchesFilter
    })
  }, [query, filter])

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Smart Bins' }]} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Smart Bin Monitoring</h1>
          <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">Live status across {bins.length} registered bins</p>
        </div>
        <SearchBar value={query} onChange={setQuery} placeholder="Search by bin ID or location..." className="sm:w-72" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {wasteTypes.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={classNames(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === t
                ? 'bg-gradient-to-r from-leaf-500 to-sky-500 text-white shadow-lg'
                : 'glass text-leaf-700 dark:text-leaf-100 hover:bg-leaf-100 dark:hover:bg-leaf-900'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <EmptyState icon={Radio} title="Loading live bin status" description="Connecting to the EcoLoop API..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No bins found"
          description="Try a different search term or clear your filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((bin) => (
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

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <BatteryMedium size={16} className={bin.battery < 30 ? 'text-red-500' : 'text-leaf-500'} />
                  <span>{bin.battery}% battery</span>
                </div>
                <div className="flex items-center gap-2">
                  {bin.wifi === 'disconnected' ? (
                    <WifiOff size={16} className="text-red-500" />
                  ) : (
                    <Wifi size={16} className={bin.wifi === 'weak' ? 'text-amber-500' : 'text-leaf-500'} />
                  )}
                  <span className="capitalize">{bin.wifi}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Radio size={16} className={bin.sensor === 'online' ? 'text-leaf-500' : 'text-red-500'} />
                  <span className="capitalize">Sensor {bin.sensor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trash2 size={16} className="text-sky-500" />
                  <span>{bin.wasteType}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-leaf-100 dark:border-leaf-900 pt-3 text-xs text-leaf-700/60 dark:text-leaf-200/50">
                <span className="flex items-center gap-1"><Clock size={12} /> {bin.lastUpdated}</span>
                <Badge variant={bin.wasteType === 'E-Waste' ? 'amber' : 'leaf'}>{bin.wasteType}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
