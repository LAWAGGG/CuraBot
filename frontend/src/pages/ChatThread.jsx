import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, Loader2, SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, apiFetch, errorMessage, invalidate } from '@/lib/api'
import { useBotEvents } from '@/hooks/useBotEvents'
import { formatTime, isValidUrl } from '@/lib/utils'

function dayKey(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function displayName(user) {
  return user.customer_name || `User ${String(user.user_id).slice(-6)}`
}

function mergeThreadBubbles(prev, incoming) {
  const byId = new Map()
  for (const item of prev) byId.set(item.id, item)
  for (const bubble of incoming) {
    if (bubble.sender === 'admin' && bubble.text) {
      for (const [id, item] of byId) {
        if (item.sender === 'admin' && item.text === bubble.text && String(id).startsWith('tmp-')) byId.delete(id)
      }
    }
    byId.set(bubble.id, bubble)
  }
  return [...byId.values()].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export default function ChatThread({ bot, user, onBack }) {
  const [bubbles, setBubbles] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingTop, setLoadingTop] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState(null)
  const [failedMedia, setFailedMedia] = useState(() => new Set())
  const [mediaUrls, setMediaUrls] = useState({})
  const [mode, setMode] = useState('ai')
  const [showJump, setShowJump] = useState(false)
  const [scrollDay, setScrollDay] = useState(null)
  const boxRef = useRef(null)
  const animIdsRef = useRef(new Set())
  const stickRef = useRef(true)
  const mountedRef = useRef(true)
  const generationRef = useRef(0)
  const loadingTopRef = useRef(false)

  const uid = encodeURIComponent(user.user_id)
  const threadKey = `thread:${bot.id}:${user.user_id}`

  const isCurrent = (generation) => mountedRef.current && generation === generationRef.current

  const scrollBottom = (generation = generationRef.current) => {
    requestAnimationFrame(() => {
      if (isCurrent(generation) && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
    })
  }

  const isNearBottom = () => {
    const box = boxRef.current
    return !box || box.scrollHeight - box.scrollTop - box.clientHeight < 120
  }

  const jumpToBottom = () => {
    stickRef.current = true
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    mountedRef.current = true
    const generation = ++generationRef.current
    loadingTopRef.current = false
    animIdsRef.current = new Set()
    stickRef.current = true
    setShowJump(false)
    setScrollDay(null)
    setFailedMedia(new Set())
    setSending(false)
    setText('')
    setLoaded(false)
    setBubbles([])
    setMediaUrls((previous) => {
      Object.values(previous).forEach((url) => URL.revokeObjectURL(url))
      return {}
    })
    api.post(`/api/bots/${bot.id}/conversations/${uid}/read`).catch(() => {})
    apiFetch(threadKey, {
      url: `/api/bots/${bot.id}/conversations/${uid}/messages`,
      force: true,
    }).then((d) => {
      if (!isCurrent(generation)) return
      setBubbles(d.bubbles ?? [])
      setMode(d.mode ?? 'ai')
      setHasMore(d.has_more)
      setLoaded(true)
      scrollBottom(generation)
    }).catch((e) => {
      if (isCurrent(generation)) { toast.error(errorMessage(e)); setLoaded(true) }
    })
    return () => { mountedRef.current = false }
  }, [bot.id, threadKey, uid])

  useBotEvents(bot.id, (event) => {
    if (event.type !== 'conversation_updated') return
    const item = event.data?.item
    if (item?.user_id !== user.user_id) return
    if (item.mode) setMode(item.mode)
    const incoming = event.data?.bubbles
    if (!Array.isArray(incoming) || incoming.length === 0) return
    for (const b of incoming) animIdsRef.current.add(b.id)
    setBubbles((previous) => mergeThreadBubbles(previous, incoming))
    api.post(`/api/bots/${bot.id}/conversations/${uid}/read`).catch(() => {})
    if (!stickRef.current) setShowJump(true)
  })

  useEffect(() => {
    if (stickRef.current && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [bubbles])

  useEffect(() => {
    let cancelled = false
    const urls = {}
    const media = bubbles.filter((bubble) => bubble.media_url && isValidUrl(bubble.media_url))
    Promise.all(media.map(async (bubble) => {
      try {
        const response = await api.get(bubble.media_url, { responseType: 'blob' })
        const url = URL.createObjectURL(response.data)
        if (cancelled) URL.revokeObjectURL(url)
        else urls[bubble.id] = url
      } catch {
        if (!cancelled) setFailedMedia((previous) => new Set(previous).add(bubble.id))
      }
    })).then(() => {
      if (!cancelled) setMediaUrls((previous) => ({ ...previous, ...urls }))
    })
    return () => {
      cancelled = true
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [bubbles])

  const loadOlder = async () => {
    const generation = generationRef.current
    if (!isCurrent(generation) || !hasMore || loadingTopRef.current || bubbles.length === 0) return
    const firstId = Number(String(bubbles[0].id).split('-')[0])
    if (!Number.isFinite(firstId)) return
    loadingTopRef.current = true
    setLoadingTop(true)
    try {
      const d = await apiFetch(threadKey, {
        url: `/api/bots/${bot.id}/conversations/${uid}/messages`,
        params: { before_id: firstId },
      })
      if (!isCurrent(generation)) return
      const box = boxRef.current
      const prevH = box ? box.scrollHeight : 0
      setBubbles((p) => [...(d.bubbles ?? []), ...p])
      setHasMore(d.has_more)
      requestAnimationFrame(() => {
        if (isCurrent(generation) && box) box.scrollTop = box.scrollHeight - prevH
      })
    } catch (e) {
      if (isCurrent(generation)) toast.error(errorMessage(e))
    } finally {
      if (isCurrent(generation)) {
        loadingTopRef.current = false
        setLoadingTop(false)
      }
    }
  }

  const handleScroll = () => {
    const box = boxRef.current
    if (!box) return
    if (box.scrollTop < 80) loadOlder()
    stickRef.current = isNearBottom()
    setShowJump(!stickRef.current)
    if (stickRef.current) {
      setScrollDay(null)
      return
    }
    let current = null
    for (const el of box.querySelectorAll('[data-day]')) {
      if (el.offsetTop - box.scrollTop <= 60) current = el.dataset.day
      else break
    }
    setScrollDay(current)
  }

  const resetToAi = async () => {
    try {
      await api.post(`/api/bots/${bot.id}/conversations/${uid}/mode`, { mode: 'ai' })
      setMode('ai')
      invalidate(threadKey)
      toast.success('Mode dikembalikan ke AI')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const leaveThread = async () => {
    if (mode !== 'manual') {
      onBack()
      return
    }
    try {
      await api.post(`/api/bots/${bot.id}/conversations/${uid}/mode`, { mode: 'ai' })
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      onBack()
    }
  }

  const send = async () => {
    const generation = generationRef.current
    const msg = text.trim()
    if (!isCurrent(generation) || !msg || sending) return
    setSending(true)
    const optimistic = { id: `tmp-${Date.now()}`, sender: 'admin', text: msg, created_at: new Date().toISOString() }
    animIdsRef.current.add(optimistic.id)
    setBubbles((p) => [...p, optimistic])
    setText('')
    scrollBottom(generation)
    try {
      await api.post(`/api/bots/${bot.id}/conversations/${uid}/reply`, { text: msg })
      if (!isCurrent(generation)) return
      invalidate(`conversations:${bot.id}`)
      invalidate(threadKey)
      setMode('manual')
    } catch (e) {
      if (!isCurrent(generation)) return
      setBubbles((p) => p.filter((b) => b.id !== optimistic.id))
      toast.error(errorMessage(e))
    } finally {
      if (isCurrent(generation)) setSending(false)
    }
  }

  const name = displayName(user)
  let lastDay = null

  return (
    <div className="relative flex h-[90vh] flex-col rounded-xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Button variant="ghost" size="icon-sm" onClick={leaveThread} aria-label="Kembali">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">ID: {String(user.user_id)}</p>
        </div>
        {mode === 'manual' ? (
          <Button variant="outline" size="sm" onClick={resetToAi} className="ml-auto shrink-0">
            Kembali ke mode AI
          </Button>
        ) : null}
      </div>

      <div ref={boxRef} onScroll={handleScroll} className="relative flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
        {loadingTop ? (
          <div className="flex justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
        {!loaded && bubbles.length === 0 ? (
          <div className="space-y-3" aria-busy="true" aria-label="Memuat pesan">
            <Skeleton className="ml-auto h-14 w-2/3 rounded-2xl" />
            <Skeleton className="h-20 w-3/4 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
            <Skeleton className="h-14 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-24 w-3/4 rounded-2xl" />
          </div>
        ) : bubbles.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Belum ada pesan.</p>
        ) : (
          bubbles.map((b) => {
            const day = dayKey(b.created_at)
            const showDay = day !== lastDay
            lastDay = day
            const mine = b.sender === 'admin' || b.sender === 'bot'
            const mediaOk = typeof b.media_url === 'string' && b.media_url.length > 0 && isValidUrl(b.media_url)
            const mediaSrc = mediaUrls[b.id]
            return (
              <div key={b.id} data-day={day}>
                {showDay ? (
                  <div className="mb-2 flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{day}</span>
                  </div>
                ) : null}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${animIdsRef.current.has(b.id) ? 'bubble-in' : ''}`}>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${mine ? 'bg-primary/10' : 'border border-border bg-background'}`}>
                    {mediaOk && mediaSrc && !failedMedia.has(b.id) ? (
                      <button type="button" onClick={() => setPreview(mediaSrc)} className="block">
                        <img
                          src={mediaSrc}
                          alt="Lampiran chat"
                          className="max-h-48 rounded-lg object-cover"
                          loading="lazy"
                          onError={() => setFailedMedia((p) => new Set(p).add(b.id))}
                        />
                      </button>
                    ) : mediaOk ? (
                      <p className="text-sm text-muted-foreground">
                        Lampiran tidak dapat dimuat.
                        <button type="button" className="ml-1 text-primary underline" onClick={() => setFailedMedia((p) => { const next = new Set(p); next.delete(b.id); return next })}>
                          Coba lagi
                        </button>
                      </p>
                    ) : null}
                    {b.text ? <p className="break-words whitespace-pre-wrap">{b.text}</p> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatTime(b.created_at)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div
        aria-hidden={!scrollDay}
        className={`absolute top-19 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-background/95 px-3 py-1 text-xs text-muted-foreground shadow-md backdrop-blur transition-all duration-200 ease-out ${
          scrollDay ? '-translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        }`}
      >
        {scrollDay || ' '}
      </div>

      <Button
        type="button"
        size="icon"
        onClick={jumpToBottom}
        aria-label="Lompat ke pesan terbaru"
        className={`absolute right-4 bottom-20 z-10 rounded-full shadow-lg transition-all duration-200 ease-out ${
          showJump ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-2 scale-75 opacity-0'
        }`}
      >
        <ChevronDown aria-hidden="true" />
      </Button>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder="Tulis balasan..."
          rows={1}
          className="min-h-0 resize-none"
          disabled={sending}
          aria-label="Tulis balasan"
        />
        <Button onClick={send} disabled={!text.trim() || sending} size="icon" aria-label="Kirim">
          {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
        </Button>
      </div>

      <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null) }}>
        <DialogContent className="sm:max-w-lg">
          {preview ? <img src={preview} alt="Pratinjau media" className="max-h-[70vh] w-full rounded-lg object-contain" onError={() => setPreview(null)} /> : null}
          {preview ? (
            <a href={preview} target="_blank" rel="noreferrer noopener" className="text-sm text-primary underline underline-offset-4">
              Buka tab baru
            </a>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
