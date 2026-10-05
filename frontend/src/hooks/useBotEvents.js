import { useEffect, useRef } from 'react'
import { API_BASE, getToken } from '@/lib/api'

export function useBotEvents(botId, onEvent) {
  const onEventRef = useRef(onEvent)

  useEffect(() => {
    onEventRef.current = onEvent
  })

  useEffect(() => {
    if (!botId) return undefined
    const controller = new AbortController()
    let active = true
    let timeout

    async function connect() {
      try {
        const response = await fetch(`${API_BASE}/api/bots/${botId}/events`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error('stream failed')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (active) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''
          for (const part of parts) {
            let event = 'message'
            const dataLines = []
            for (const line of part.split('\n')) {
              if (line.startsWith(':')) continue
              if (line.startsWith('event:')) event = line.slice(6).trim()
              else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
            }
            if (!dataLines.length) continue
            try {
              onEventRef.current({ type: event, data: JSON.parse(dataLines.join('\n')) })
            } catch {
              // ignore malformed event payloads
            }
          }
        }
      } catch {
        if (!active || controller.signal.aborted) return
      }
      if (active && !controller.signal.aborted) timeout = setTimeout(connect, 3000)
    }

    connect()
    return () => {
      active = false
      controller.abort()
      clearTimeout(timeout)
    }
  }, [botId])
}
