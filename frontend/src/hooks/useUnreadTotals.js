/* oxlint-disable react/set-state-in-effect -- badge totals synchronize with websocket/backend */
import { useCallback, useEffect, useRef, useState } from 'react'

import { API_BASE, apiFetch, getToken, invalidate } from '@/lib/api'
import { useBotEvents } from '@/hooks/useBotEvents'

export function formatUnread(count) {
  const n = Number(count) || 0
  if (n >= 1000) return `${parseFloat((n / 1000).toFixed(2))}K`
  return String(n)
}

export function openBotSocket(botId, onEvent) {
  const wsBase = API_BASE.replace(/^http/, 'ws')
  let ws
  let active = true
  let timeout
  function connect() {
    ws = new WebSocket(`${wsBase}/api/bots/${botId}/ws?token=${encodeURIComponent(getToken() ?? '')}`)
    ws.onmessage = (event) => {
      try {
        onEvent(JSON.parse(event.data))
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
}

export function useUnreadTotals(bots) {
  const list = bots ?? []
  const idsKey = list.map((b) => b.id).join(',')
  const [live, setLive] = useState({})

  const totals = {}
  for (const b of list) totals[b.id] = live[b.id] ?? b.unread_total ?? 0

  useEffect(() => {
    const ids = idsKey.split(',').filter(Boolean).map(Number)
    if (ids.length === 0) return undefined
    let timer = 0
    const refresh = () => {
      clearTimeout(timer)
      timer = setTimeout(async () => {
        try {
          const d = await apiFetch('bots', { url: '/api/bots/list', force: true })
          const next = {}
          for (const b of d?.bots ?? []) next[b.id] = b.unread_total ?? 0
          setLive(next)
        } catch {
          // keep last known totals on network failure
        }
      }, 800)
    }
    const cleanups = ids.map((id) =>
      openBotSocket(id, (event) => {
        if (event.type === 'conversation_updated') refresh()
      }),
    )
    return () => {
      clearTimeout(timer)
      cleanups.forEach((fn) => fn())
    }
  }, [idsKey])

  return totals
}

export function useUnreadTotal(botId, initial = 0) {
  const [total, setTotal] = useState(initial ?? 0)
  const timer = useRef(0)

  const fetchTotal = useCallback(async () => {
    if (!botId) return
    try {
      const d = await apiFetch(`conversations:${botId}:unread-total`, {
        url: `/api/bots/${botId}/conversations`,
        params: { q: '', limit: 1 },
        force: true,
      })
      if (typeof d?.unread_total === 'number') setTotal(d.unread_total)
    } catch {
      // keep last known total on network failure
    }
  }, [botId])

  useEffect(() => {
    setTotal(initial ?? 0)
    fetchTotal()
  }, [botId, initial, fetchTotal])

  useEffect(() => {
    invalidate('bots')
  }, [total])

  useBotEvents(botId, (event) => {
    if (!botId || event.type !== 'conversation_updated') return
    clearTimeout(timer.current)
    timer.current = setTimeout(fetchTotal, 800)
  })

  useEffect(() => () => clearTimeout(timer.current), [])

  return total
}
