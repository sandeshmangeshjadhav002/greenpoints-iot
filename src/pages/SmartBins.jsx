import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, BatteryMedium, Wifi, WifiOff, Radio, Clock, Trash2, Search as SearchIcon, QrCode, X } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import Breadcrumb from '../components/Breadcrumb'
import SearchBar from '../components/SearchBar'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { ProgressBar } from '../components/ProgressBar'
import useLiveBins from '../hooks/useLiveBins'
import { healthColor, classNames } from '../utils/helpers'

const wasteTypes = ['All', 'Recyclable', 'Organic', 'General', 'E-Waste']

// Derive the QR token the same way the backend does: sha256(code + '-qr-ecoloop')
// We replicate it client-side so we don't need an extra API call per bin.
async function deriveBinQrToken(binCode) {
  const msg = new TextEncoder().encode(binCode + '-qr-ecoloop')
  const hashBuffer = await crypto.subtle.digest('SHA-256', msg)
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function BinQRModal({ bin, onClose }) {
  const [qrToken, setQrToken] = useState(null)

  // Derive token once when modal opens
  useEffect(() => {
    if (bin) {
      setQrToken(null)
      deriveBinQrToken(bin.id).then(setQrToken)
    }
  }, [bin?.id])

  const scanUrl = qrToken ? `${window.location.origin}/scan?bin=${qrToken}` : ''

  if (!bin) return null

  return (
    <Modal open onClose={onClose} title={`QR Code — ${bin.id}`}>
      <div className="flex flex-col items-center gap-4 py-2">
        {/* Bin summary */}
        <div className="w-full rounded-xl bg-leaf-50 dark:bg-leaf-900/60 px-4 py-3 text-sm">
          <p className="font-semibold">{bin.id}</p>
          <p className="flex items-center gap-1 text-xs text-leaf-700/60 dark:text-leaf-200/50 mt-0.5">
            <MapPin size={11} /> {bin.location}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={bin.wasteType === 'E-Waste' ? 'amber' : 'leaf'}>{bin.wasteType}</Badge>
            <span className={classNames('rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize', healthColor(bin.health))}>
              {bin.health}
            </span>
          </div>
        </div>

        {/* QR code */}
        {qrToken ? (
          <div className="rounded-2xl bg-white p-4 shadow-inner">
            <QRCodeSVG
              value={scanUrl}
              size={200}
              level="M"
              includeMargin={false}
              fgColor="#15803d"
            />
          </div>
        ) : (
          <div className="flex h-[216px] w-[216px] items-center justify-center rounded-2xl bg-white">
            <p className="text-xs text-leaf-700/50">Generating…</p>
          </div>
        )}

        {/* Bin code label — print this on the physical bin */}
        <div className="w-full rounded-xl border-2 border-dashed border-leaf-300 dark:border-leaf-700 px-4 py-3 text-center">
          <p className="text-xs text-leaf-700/50 dark:text-leaf-200/40 mb-1">Bin Code</p>
          <p className="font-mono text-xl font-bold tracking-widest text-leaf-700 dark:text-leaf-100">{bin.id}</p>
        </div>

        {/* Scan URL */}
        {scanUrl && (
          <p className="break-all text-center text-[10px] text-leaf-700/40 dark:text-leaf-200/30">
            {scanUrl}
          </p>
        )}

        {/* Download button */}
        <button
          onClick={() => {
            const svg = document.querySelector('#bin-qr-download svg')
            if (!svg) return
            const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
            const a = document.createElement('a')
            a.href = URL.createObjectURL(blob)
            a.download = `${bin.id}-qr.svg`
            a.click()
          }}
          className="w-full rounded-xl bg-gradient-to-r from-leaf-500 to-sky-500 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90"
        >
          Download QR
        </button>

        {/* Hidden SVG for download */}
        {qrToken && (
          <div id="bin-qr-download" className="hidden">
            <QRCodeSVG value={scanUrl} size={400} level="M" includeMargin fgColor="#15803d" />
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function SmartBins() {
  const { bins, loading } = useLiveBins()
  const navigate = useNavigate()
  const [query, setQuery]       = useState('')
  const [filter, setFilter]     = useState('All')
  const [qrBin, setQrBin]       = useState(null)   // bin whose QR is shown

  const filtered = useMemo(() => {
    return bins.filter((b) => {
      const matchesQuery =
        b.id.toLowerCase().includes(query.toLowerCase()) ||
        b.location.toLowerCase().includes(query.toLowerCase())
      const matchesFilter = filter === 'All' || b.wasteType === filter
      return matchesQuery && matchesFilter
    })
  }, [bins, query, filter])

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Smart Bins' }]} />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Smart Bin Monitoring</h1>
          <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
            Live status across {bins.length} registered bins
          </p>
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
                : 'glass text-leaf-700 dark:text-leaf-100 hover:bg-leaf-100 dark:hover:bg-leaf-900',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <EmptyState icon={Radio} title="Loading live bin status" description="Connecting to the EcoLoop API..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={SearchIcon} title="No bins found" description="Try a different search term or clear your filters." />
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
                  {bin.wifi === 'disconnected'
                    ? <WifiOff size={16} className="text-red-500" />
                    : <Wifi size={16} className={bin.wifi === 'weak' ? 'text-amber-500' : 'text-leaf-500'} />
                  }
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
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {bin.lastUpdated ? new Date(bin.lastUpdated).toLocaleString() : 'Never'}
                </span>
                <div className="flex items-center gap-2">
                  {/* QR code button */}
                  <button
                    onClick={() => setQrBin(bin)}
                    title="Show QR code"
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-leaf-600 dark:text-mint-400 hover:bg-leaf-100 dark:hover:bg-leaf-900 transition-colors"
                  >
                    <QrCode size={14} /> QR
                  </button>
                  {/* Scan button */}
                  <button
                    onClick={() => {
                      deriveBinQrToken(bin.id).then((token) => navigate(`/scan?bin=${token}`))
                    }}
                    className="rounded-lg bg-gradient-to-r from-leaf-500 to-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow hover:opacity-90"
                  >
                    Scan
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* QR modal */}
      {qrBin && <BinQRModal bin={qrBin} onClose={() => setQrBin(null)} />}
    </div>
  )
}
