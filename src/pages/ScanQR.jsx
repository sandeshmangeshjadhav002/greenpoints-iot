import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QrCode, ScanLine, CheckCircle2, AlertCircle, Coins, Recycle, ChevronDown } from 'lucide-react'
import Card from '../components/Card'
import Breadcrumb from '../components/Breadcrumb'
import Button from '../components/Button'
import { ProgressBar } from '../components/ProgressBar'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const WASTE_TYPES = ['Recyclable', 'Organic', 'General', 'E-Waste']

const WEIGHT_PRESETS = [
  { label: '0.5 kg', value: 0.5 },
  { label: '1 kg',   value: 1 },
  { label: '2 kg',   value: 2 },
  { label: '5 kg',   value: 5 },
]

const TOKEN_RATES = { Recyclable: 5, Organic: 3, 'E-Waste': 10, General: 2 }

function estimateTokens(wasteType, weightKg) {
  return 1 + Math.round((TOKEN_RATES[wasteType] ?? 2) * weightKg)
}

export default function ScanQR() {
  const [searchParams] = useSearchParams()
  const { apiFetch } = useAuth()

  // Pre-fill from URL ?bin=<qr_token>
  const [qrToken, setQrToken]       = useState(searchParams.get('bin') || '')
  const [weightKg, setWeightKg]     = useState(1)
  const [wasteType, setWasteType]   = useState('Recyclable')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState(null)   // { tokens_earned, new_balance, bin_location, waste_type, weight_kg }
  const [error, setError]           = useState('')
  const [cameraOpen, setCameraOpen] = useState(false)
  const videoRef  = useRef(null)
  const streamRef = useRef(null)

  // If a ?bin= param arrived, auto-fill and scroll straight to the form
  const hasUrlToken = !!searchParams.get('bin')

  // ── camera helpers ────────────────────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOpen(true)
    } catch {
      setError('Camera access denied. Enter the bin code manually below.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  useEffect(() => () => stopCamera(), [])

  // ── QR decode via BarcodeDetector (Chrome 88+) ───────────────────────────
  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return
    if (!('BarcodeDetector' in window)) return

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    let running = true

    async function tick() {
      if (!running || !videoRef.current) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes.length > 0) {
          const raw = codes[0].rawValue
          // Accept either a full URL like /scan?bin=TOKEN or bare token
          const match = raw.match(/[?&]bin=([^&]+)/) || raw.match(/^([a-f0-9]{64})$/)
          if (match) {
            setQrToken(match[1])
            stopCamera()
            return
          }
        }
      } catch { /* frame not ready */ }
      if (running) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    return () => { running = false }
  }, [cameraOpen])

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!qrToken.trim()) { setError('Please enter or scan a bin QR code.'); return }
    if (weightKg <= 0)   { setError('Weight must be greater than 0.'); return }

    setSubmitting(true)
    setError('')
    setResult(null)
    try {
      const body = await apiFetch('/api/waste/scan-qr', {
        method: 'POST',
        body: JSON.stringify({
          qr_token: qrToken.trim(),
          weight_kg: weightKg,
          manual_waste_type: wasteType,
        }),
      })
      setResult(body.data)
      setQrToken('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const estimated = estimateTokens(wasteType, weightKg)

  // ── success screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="mx-auto max-w-lg">
        <Breadcrumb items={[{ label: 'Scan QR' }]} />
        <Card className="flex flex-col items-center py-10 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-glow">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="font-display text-2xl font-bold">Recycling recorded!</h2>
          <p className="mt-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">
            {result.weight_kg} kg of {result.waste_type} at {result.bin_location || result.bin_code}
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-leaf-500 to-sky-500 px-8 py-4 text-white shadow-glow">
            <Coins size={28} />
            <div className="text-left">
              <p className="font-display text-3xl font-bold">+{result.tokens_earned}</p>
              <p className="text-sm opacity-80">EcoPoints earned</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-leaf-700/60 dark:text-leaf-200/50">
            New balance: <span className="font-semibold">{result.new_balance} tokens</span>
          </p>

          <Button className="mt-8 w-full" onClick={() => setResult(null)}>
            <ScanLine size={16} /> Scan Another
          </Button>
        </Card>
      </div>
    )
  }

  // ── main form ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg">
      <Breadcrumb items={[{ label: 'Scan QR' }]} />

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Scan Bin QR Code</h1>
        <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
          Scan the QR on any EcoLoop bin or enter its code manually to earn tokens.
        </p>
      </div>

      {/* Camera viewfinder */}
      {cameraOpen ? (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-2xl border-4 border-white/80 shadow-glow" />
            </div>
            <button
              onClick={stopCamera}
              className="absolute right-3 top-3 rounded-full bg-black/50 px-3 py-1 text-xs text-white"
            >
              Cancel
            </button>
          </div>
          <p className="py-3 text-center text-xs text-leaf-700/60 dark:text-leaf-200/50">
            Point at the QR code on the bin
          </p>
        </Card>
      ) : (
        <button
          onClick={startCamera}
          className="glass mb-5 flex w-full flex-col items-center gap-3 rounded-2xl py-8 transition hover:shadow-glow"
        >
          <QrCode size={40} className="text-leaf-500" />
          <span className="font-display font-semibold">Open Camera to Scan</span>
          <span className="text-xs text-leaf-700/60 dark:text-leaf-200/50">
            Or enter the bin code below
          </span>
        </button>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* QR token / bin code */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Bin QR token</label>
            <input
              type="text"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              placeholder="Scanned automatically, or paste here"
              className={classNames(
                'w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2',
                qrToken
                  ? 'border-leaf-500 focus:ring-leaf-500/20'
                  : 'border-leaf-200 dark:border-leaf-800 focus:border-leaf-500 focus:ring-leaf-500/20',
                'bg-white/70 dark:bg-leaf-900/60',
              )}
              readOnly={hasUrlToken && !!qrToken && !cameraOpen}
            />
            {hasUrlToken && qrToken && (
              <p className="mt-1 flex items-center gap-1 text-xs text-leaf-600 dark:text-mint-400">
                <CheckCircle2 size={12} /> QR token detected from URL
              </p>
            )}
          </div>

          {/* Waste type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Waste type</label>
            <div className="relative">
              <select
                value={wasteType}
                onChange={(e) => setWasteType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-4 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"
              >
                {WASTE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-leaf-500" />
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium">
              <span>Estimated weight</span>
              <span className="font-mono text-leaf-600 dark:text-mint-400">{weightKg} kg</span>
            </label>
            <input
              type="range"
              min="0.1" max="50" step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(parseFloat(e.target.value))}
              className="w-full accent-leaf-500"
            />
            <div className="mt-2 flex gap-2">
              {WEIGHT_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setWeightKg(p.value)}
                  className={classNames(
                    'flex-1 rounded-lg py-1.5 text-xs font-medium transition',
                    weightKg === p.value
                      ? 'bg-gradient-to-r from-leaf-500 to-sky-500 text-white'
                      : 'glass text-leaf-700 dark:text-leaf-100 hover:bg-leaf-100 dark:hover:bg-leaf-900',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Token preview */}
          <div className="flex items-center justify-between rounded-xl bg-leaf-50 dark:bg-leaf-900/60 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">
              <Recycle size={16} className="text-leaf-500" />
              {weightKg} kg · {wasteType}
            </div>
            <div className="flex items-center gap-1.5 font-mono font-bold text-leaf-600 dark:text-mint-400">
              <Coins size={16} />
              ~{estimated} pts
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button disabled={submitting} className="w-full">
            <ScanLine size={16} />
            {submitting ? 'Recording…' : 'Submit Recycling'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
