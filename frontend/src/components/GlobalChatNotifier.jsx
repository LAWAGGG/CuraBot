import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { ChatNavContext } from '@/components/AppShell'
import { apiFetch } from '@/lib/api'
import { openBotSocket } from '@/hooks/useUnreadTotals'

function incomingSnippet(bubbles) {
  const userBubble = (bubbles ?? []).find((b) => b.sender === 'user' && (b.text || b.media_url))
  if (!userBubble) return ''
  return userBubble.text || '[lampiran]'
}

// ponytail: 1 WS per toko (pola sama dgn badge unread), toast per user biar pesan beruntun menimpa yg sama
export default function GlobalChatNotifier() {
  const { selectedChat, setSelectedChat } = useContext(ChatNavContext)
  const navigate = useNavigate()
  const [bots, setBots] = useState([])
  const selectedRef = useRef(null)
  selectedRef.current = selectedChat

  useEffect(() => {
    let cancelled = false
    apiFetch('bots', { url: '/api/bots/list' })
      .then((d) => {
        if (!cancelled) setBots(d?.bots ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const idsKey = bots.map((b) => b.id).join(',')

  useEffect(() => {
    const ids = idsKey.split(',').filter(Boolean).map(Number)
    if (ids.length === 0) return undefined
    const names = {}
    for (const b of bots) names[b.id] = b.name
    const cleanups = ids.map((id) =>
      openBotSocket(id, (event) => {
        if (event?.type !== 'conversation_updated') return
        const item = event.data?.item
        if (!item?.user_id) return
        const incoming = (event.data?.bubbles ?? []).some((b) => b.sender === 'user')
        if (!incoming) return
        if (selectedRef.current?.user_id === item.user_id) return
        const name = item.customer_name || `User ${String(item.user_id).slice(-6)}`
        const snippet = incomingSnippet(event.data?.bubbles)
        toast.message(`Pesan baru dari ${name}`, {
          id: `chat-${id}-${item.user_id}`,
          description: `${names[id] || 'Toko'} · ${snippet || '...'}`,
          duration: 8000,
          position: 'top-right',
          classNames: { title: 'truncate', description: 'line-clamp-2' },
          action: {
            label: 'Buka chat',
            onClick: () => {
              navigate(`/bots/${id}/percakapan`)
              // ponytail: BotLayout mereset selectedChat saat pathname berubah -> set setelah navigasi
              setTimeout(
                () => setSelectedChat?.({ user_id: item.user_id, customer_name: item.customer_name }),
                50,
              )
            },
          },
        })
      }),
    )
    return () => cleanups.forEach((fn) => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  return null
}
