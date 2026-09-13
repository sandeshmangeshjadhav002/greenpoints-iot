/**
 * Printable QR Code page  —  /admin/bin-qr
 *
 * Shows every bin as a print-ready card:
 *   • Large QR code pointing to /scan?bin=<token>
 *   • Bin code, location and waste type
 *   • "Print All" button  (uses window.print — sidebar/header hidden via CSS)
 */
import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, RefreshCw, QrCode } from 'lucide-react'
import Breadcrumb from '../components/Breadcrumb'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const WASTE_COLOR = {
  Recyclable: '#16A34A',
  Organic:    '#0EA5E9',
  'E-Waste':  '#F59E0B',
  General:    '#6B7280',
}

export default function BinQRPrint() {
  const { apiFetch } = useAuth()
  const [bins, setBins]     = useState([])
  const [loading, setLoading] = useState(true)

    const origin = window.location.origin   // auto-uses vercel domain in production

  useEffect(() => {
    apiFetch('/api/bins/all-qr')
      .then((r) => setBins(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line

  return (
    <div className="mx-auto max-w-5xl">
      {/* Screen-only header — hidden when printing */}
      <div className="print:hidden">
        <Breadcrumb items={[{ label: 'Admin' }, { label: 'Bin QR Codes' }]} />
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Printable Bin QR Codes</h1>
            <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
              Print this page and stick each card on its physical dustbin.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setLoading(true); apiFetch('/api/bins/all-qr').then((r) => setBins(r.data)).finally(() => setLoading(false)) }}
              className="flex items-center gap-2 rounded-xl border border-leaf-200 dark:border-leaf-800 px-4 py-2 text-sm hover:bg-leaf-50 dark:hover:bg-leaf-900"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-leaf-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90"
            >
              <Printer size={16} /> Print All
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <EmptyState icon={QrCode} title="Loading bins…" description="Fetching bin data." />
      ) : bins.length === 0 ? (
        <EmptyState icon={QrCode} title="No bins found" description="Add bins first via the Smart Bins page." />
      ) : (
        /* Print grid — 2 per row on screen, 2 per row on paper */
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-4">
          {bins.map((bin) => {
            const scanUrl = `${origin}/scan?bin=${bin.qrToken}`
            const color   = WASTE_COLOR[bin.wasteType] || '#16A34A'
            return (
              <div
                key={bin.code}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-leaf-200 dark:border-leaf-800 bg-white dark:bg-leaf-950 p-6 text-center shadow print:shadow-none print:border-gray-300 print:break-inside-avoid"
              >
                {/* Colour band */}
                <div
                  className="w-full rounded-xl py-2 text-xs font-bold uppercase tracking-widest text-white"
                  style={{ background: color }}
                >
                  {bin.wasteType}
                </div>

                {/* QR code */}
                <div className="rounded-xl bg-white p-3 shadow-inner">
                  <QRCodeSVG
                    value={scanUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                    fgColor={color}
                  />
                </div>

                {/* Bin details */}
                <div className="space-y-0.5">
                  <p className="font-mono text-2xl font-bold tracking-widest" style={{ color }}>
                    {bin.code}
                  </p>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{bin.location}</p>
                  <p className="text-[10px] text-gray-400 break-all">{scanUrl}</p>
                </div>

                {/* Instructions */}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 print:text-gray-600">
                  Scan with EcoLoop app to earn reward tokens
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Print-only footer */}
      <p className="hidden print:block mt-8 text-center text-[10px] text-gray-400">
        EcoLoop Smart Waste Management · {origin}
      </p>
    </div>
  )
}
