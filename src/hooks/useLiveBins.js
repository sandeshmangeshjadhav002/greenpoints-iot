import { useEffect, useState, useRef } from 'react'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const websocketUrl = apiBaseUrl.replace(/^http/, 'ws') + '/ws/bins'

// Poll interval in ms — used as fallback when WebSocket is unavailable
// (e.g. NodeMCU writes directly to Supabase, not through the backend)
const POLL_INTERVAL_MS = 10000  // refresh every 10 s

export default function useLiveBins() {
  const [bins, setBins]       = useState([])
  const [loading, setLoading] = useState(true)
  const pollRef               = useRef(null)

  useEffect(() => {
    let active = true

    // ── Initial fetch + polling ───────────────────────────────────────────
    const fetchBins = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/bins`)
        if (!response.ok) throw new Error('Unable to load bins')
        const data = await response.json()
        if (active) setBins(data)
      } catch (error) {
        console.error('useLiveBins fetch error:', error)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchBins()

    // Poll every 10 s so NodeMCU direct-to-Supabase writes are reflected
    pollRef.current = setInterval(() => {
      if (active) fetchBins()
    }, POLL_INTERVAL_MS)

    // ── WebSocket for instant updates when backend is running ─────────────
    let socket = null
    try {
      socket = new WebSocket(websocketUrl)
      socket.onmessage = ({ data }) => {
        try {
          const message = JSON.parse(data)
          if (message.type !== 'bin.updated') return
          setBins((current) => {
            const exists = current.some((bin) => bin.id === message.bin.id)
            return exists
              ? current.map((bin) => bin.id === message.bin.id ? message.bin : bin)
              : [...current, message.bin]
          })
        } catch { /* ignore malformed frames */ }
      }
      socket.onerror = () => {
        // WebSocket unavailable (backend offline or NodeMCU direct mode)
        // polling above handles updates
      }
    } catch { /* WebSocket not supported */ }

    return () => {
      active = false
      clearInterval(pollRef.current)
      socket?.close()
    }
  }, [])

  return { bins, loading }
}
