import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Loader2, SendHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { api, apiFetch, errorMessage, invalidate } from '@/lib/api'
import { formatDateTime, isValidUrl } from '@/lib/utils'

function dayKey(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function displayName(user) {
  return user.customer_name || `User ${String(user.user_id).slice(-6)}`
}

export default function ChatThread({ bot, user, onBack }) {
  const [bubbles, setBubbles] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingTop, setLoadingTop] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState(null)
  const [failedMedia, setFailedMedia] = useState(() => new Set())
  const [mediaUrls, setMediaUrls] = useState({})
  const boxRef = useRef(null)
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

  useEffect(() => {
    mountedRef.current = true
    const generation = ++generationRef.current
    loadingTopRef.current = false
    setFailedMedia(new Set())
    setSending(false)
    setText('')
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
      setHasMore(d.has_more)
      scrollBottom(generation)
    }).catch((e) => {
      if (isCurrent(generation)) toast.error(errorMessage(e))
    })
    return () => { mountedRef.current = false }
  }, [bot.id, threadKey, uid])

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
    if (boxRef.current && boxRef.current.scrollTop < 80) loadOlder()
  }

  const send = async () => {
    const generation = generationRef.current
    const msg = text.trim()
    if (!isCurrent(generation) || !msg || sending) return
    setSending(true)
    const optimistic = { id: `tmp-${Date.now()}`, sender: 'admin', text: msg, created_at: new Date().toISOString() }
    setBubbles((p) => [...p, optimistic])
    setText('')
    scrollBottom(generation)
    try {
      await api.post(`/api/bots/${bot.id}/conversations/${uid}/reply`, { text: msg })
      if (!isCurrent(generation)) return
      invalidate(`conversations:${bot.id}`)
      invalidate(threadKey)
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
    <div className="flex h-[90vh] flex-col rounded-xl border border-border bg-background">
      <div className="flex items-center gap-2 border-b border-border p-3">
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Kembali">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-muted-foreground">ID: {String(user.user_id)}</p>
        </div>
      </div>

      <div ref={boxRef} onScroll={handleScroll} className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
        {loadingTop ? (
          <div className="flex justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : null}
        {bubbles.length === 0 ? (
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
              <div key={b.id}>
                {showDay ? (
                  <div className="mb-2 flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{day}</span>
                  </div>
                ) : null}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
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
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(b.created_at)}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

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
