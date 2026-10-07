import { useEffect, useRef } from 'react'
import { API_BASE, getToken } from '@/lib/api'

export function useBotEvents(botId, onEvent) {
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  })

  useEffect(() => {
    if (!botId) return undefined
    const wsBase = API_BASE.replace(/^http/, 'ws')
    let ws
    let active = true
    let timeout

    function connect() {
      ws = new WebSocket(`${wsBase}/api/bots/${botId}/ws?token=${encodeURIComponent(getToken())}`)
      ws.onmessage = (e) => {
        try {
          onEventRef.current(JSON.parse(e.data))
        } catch {
          // ignore malformed event payloads
        }
      }
      ws.onclose = () => {
        if (active) timeout = setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      active = false
      clearTimeout(timeout)
      ws?.close()
    }
  }, [botId])
}
