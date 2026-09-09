import { useEffect, useState } from 'react'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const websocketUrl = apiBaseUrl.replace(/^http/, 'ws') + '/ws/bins'

export default function useLiveBins() {
  const [bins, setBins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/bins`)
        if (!response.ok) throw new Error('Unable to load bins')
        if (active) setBins(await response.json())
      } catch (error) {
        console.error(error)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()

    const socket = new WebSocket(websocketUrl)
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data)
      if (message.type !== 'bin.updated') return
      setBins((current) => {
        const exists = current.some((bin) => bin.id === message.bin.id)
        return exists
          ? current.map((bin) => bin.id === message.bin.id ? message.bin : bin)
          : [...current, message.bin]
      })
    }
    return () => { active = false; socket.close() }
  }, [])

  return { bins, loading }
}
