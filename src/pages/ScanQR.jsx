/**
 * ScanQR  —  /scan
 *
 * • Opens the rear camera and decodes QR frames using jsQR (works in all browsers).
 * • Also accepts a ?bin=<token> URL param (user taps printed QR → browser opens this page).
 * • Manual entry fallback for devices without camera.
 * • Posts to POST /api/waste/scan-qr → awards tokens and shows result.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import {
  QrCode, ScanLine, CheckCircle2, AlertCircle,
  Coins, Recycle, ChevronDown, Camera, X,
} from 'lucide-react'
import Card from '../components/Card'
import Breadcrumb from '../components/Breadcrumb'
import Button from '../components/Button'
import { useAuth } from '../context/AuthContext'
import { classNames } from '../utils/helpers'

const WASTE_TYPES = ['Recyclable', 'Organic', 'General', 'E-Waste']
const TOKEN_RATES = { Recyclable: 5, Organic: 3, 'E-Waste': 10, General: 2 }
const estimate    = (type, kg) => 1 + Math.round((TOKEN_RATES[type] ?? 2) * Math.max(0, kg))

// Extract qr_token from a raw QR value — accepts:
//   • full URL  /scan?bin=TOKEN  or  http://…/scan?bin=TOKEN
//   • bare 64-char hex token
function extractToken(raw) {
  const m = raw.match(/[?&]bin=([a-f0-9]{64})/)
  if (m) return m[1]
  if (/^[a-f0-9]{64}$/.test(raw.trim())) return raw.trim()
  return null
}

export default function ScanQR() {
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const { apiFetch }      = useAuth()

  // Pre-fill from URL ?bin=<token>  (user opens page by scanning a printed QR)
  const urlToken = searchParams.get('bin') || ''

  const [qrToken,    setQrToken]    = useState(urlToken)
  const [weightKg,   setWeightKg]   = useState('')
  const [wasteType,  setWasteType]  = useState('Recyclable')
  const [submitting, setSubmitting] = useState(false)
  const [result,     setResult]     = useState(null)
  const [error,      setError]      = useState('')

  // Camera state
  const [cameraOpen,  setCameraOpen]  = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [scanning,    setScanning]    = useState(false)   // actively reading frames
  const [scanMsg,     setScanMsg]     = useState('')

  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const streamRef  = useRef(null)
  const rafRef     = useRef(null)

  // ── camera lifecycle ──────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOpen(false)
    setScanning(false)
    setScanMsg('')
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  async function startCamera() {
    setCameraError('')
    setScanMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOpen(true)
      setScanning(true)
    } catch (e) {
      setCameraError('Camera access denied. Enter the bin token manually below.')
    }
  }

  // ── jsQR scan loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!scanning || !cameraOpen) return

    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    function tick() {
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })
      if (code) {
        const token = extractToken(code.data)
        if (token) {
          setQrToken(token)
          setScanMsg('✓ QR code scanned successfully!')
          stopCamera()
          return
        } else {
          setScanMsg('QR found but not an EcoLoop bin code. Keep scanning…')
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [scanning, cameraOpen, stopCamera])

  // ── submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    const wt = parseFloat(weightKg)
    if (!qrToken.trim())       { setError('Please scan a bin QR code or enter the token.'); return }
    if (!weightKg || wt <= 0)  { setError('Enter the weight of waste (> 0 kg).'); return }

    setSubmitting(true)
    setError('')
    setResult(null)
    try {
      const body = await apiFetch('/api/waste/scan-qr', {
        method: 'POST',
        body: JSON.stringify({ qr_token: qrToken.trim(), weight_kg: wt, manual_waste_type: wasteType }),
      })
      setResult(body.data)
      setQrToken('')
      setWeightKg('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const est = weightKg && parseFloat(weightKg) > 0 ? estimate(wasteType, parseFloat(weightKg)) : null

  // ── success screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="mx-auto max-w-lg">
        <Breadcrumb items={[{ label: 'Scan QR' }]} />
        <Card className="flex flex-col items-center py-10 text-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-leaf-500 to-sky-500 text-white shadow-glow">
            <CheckCircle2 size={40} />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Recycling recorded!</h2>
            <p className="mt-1 text-sm text-leaf-700/70 dark:text-leaf-200/60">
              {result.weight_kg} kg of {result.waste_type}
              {result.bin_location ? ` · ${result.bin_location}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-leaf-500 to-sky-500 px-8 py-4 text-white shadow-glow">
            <Coins size={28} />
            <div className="text-left">
              <p className="font-display text-3xl font-bold">+{result.tokens_earned}</p>
              <p className="text-sm opacity-80">EcoPoints earned</p>
            </div>
          </div>
          <p className="text-sm text-leaf-700/60 dark:text-leaf-200/50">
            New balance: <span className="font-semibold">{result.new_balance} tokens</span>
          </p>
          <Button className="w-full" onClick={() => setResult(null)}>
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
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold">Scan Bin QR Code</h1>
        <p className="text-sm text-leaf-700/70 dark:text-leaf-200/60">
          Scan the QR sticker on any EcoLoop bin to earn tokens.
        </p>
      </div>

      {/* ── Camera viewfinder ── */}
      {cameraOpen ? (
        <Card className="mb-5 overflow-hidden p-0">
          <div className="relative bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full max-h-72 object-cover"
            />
            {/* Targeting overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-52 w-52">
                {/* Corner brackets */}
                {['top-0 left-0 border-t-4 border-l-4',
                  'top-0 right-0 border-t-4 border-r-4',
                  'bottom-0 left-0 border-b-4 border-l-4',
                  'bottom-0 right-0 border-b-4 border-r-4'].map((cls, i) => (
                  <div key={i} className={classNames('absolute h-8 w-8 rounded-sm border-leaf-400', cls)} />
                ))}
                {/* Scan line animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-leaf-400/80 animate-bounce" style={{ top: '50%' }} />
              </div>
            </div>
            <button
              onClick={stopCamera}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X size={16} />
            </button>
          </div>
          {scanMsg && (
            <p className={classNames(
              'px-4 py-2 text-center text-sm font-medium',
              scanMsg.startsWith('✓') ? 'text-leaf-600 dark:text-mint-400' : 'text-amber-600 dark:text-amber-400',
            )}>
              {scanMsg}
            </p>
          )}
          {/* Hidden canvas used by jsQR */}
          <canvas ref={canvasRef} className="hidden" />
        </Card>
      ) : (
        <button
          onClick={startCamera}
          className="glass mb-5 flex w-full flex-col items-center gap-3 rounded-2xl py-8 transition hover:shadow-glow"
        >
          <Camera size={40} className="text-leaf-500" />
          <span className="font-display font-semibold">Open Camera to Scan</span>
          <span className="text-xs text-leaf-700/60 dark:text-leaf-200/50">
            Or enter the bin code manually below
          </span>
        </button>
      )}

      {cameraError && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {cameraError}
        </div>
      )}

      {/* ── Form ── */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* QR token */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Bin QR token</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrToken}
                onChange={(e) => { setQrToken(e.target.value); setScanMsg('') }}
                placeholder="Scanned automatically, or paste here"
                className={classNames(
                  'flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2',
                  qrToken
                    ? 'border-leaf-500 focus:ring-leaf-500/20 bg-leaf-50 dark:bg-leaf-900/60'
                    : 'border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 focus:border-leaf-500 focus:ring-leaf-500/20',
                )}
              />
              {qrToken && (
                <button type="button" onClick={() => { setQrToken(''); setScanMsg('') }}
                  className="rounded-xl border border-leaf-200 dark:border-leaf-800 px-3 text-leaf-500 hover:bg-leaf-50 dark:hover:bg-leaf-900">
                  <X size={16} />
                </button>
              )}
            </div>
            {qrToken && (
              <p className="mt-1 flex items-center gap-1 text-xs text-leaf-600 dark:text-mint-400">
                <CheckCircle2 size={12} />
                {urlToken && !scanMsg ? 'Token pre-filled from QR link' : scanMsg || 'Token ready'}
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
                {WASTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-leaf-500" />
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Estimated weight (kg)</label>
            <input
              type="number"
              min="0.1"
              max="500"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 1.5"
              className="w-full rounded-xl border border-leaf-200 dark:border-leaf-800 bg-white/70 dark:bg-leaf-900/60 px-4 py-2.5 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"
            />
          </div>

          {/* Token preview */}
          {est !== null && (
            <div className="flex items-center justify-between rounded-xl bg-leaf-50 dark:bg-leaf-900/60 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-leaf-700/70 dark:text-leaf-200/60">
                <Recycle size={16} className="text-leaf-500" />
                {weightKg} kg · {wasteType}
              </div>
              <div className="flex items-center gap-1.5 font-mono font-bold text-leaf-600 dark:text-mint-400">
                <Coins size={16} /> ~{est} pts
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <Button disabled={submitting || !qrToken} className="w-full">
            <ScanLine size={16} />
            {submitting ? 'Recording…' : 'Submit Recycling'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
