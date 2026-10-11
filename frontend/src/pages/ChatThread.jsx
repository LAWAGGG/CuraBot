import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, FileText, Loader2, Paperclip, Reply, SendHorizontal, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api, apiFetch, errorMessage, invalidate } from '@/lib/api'
import { useBotEvents } from '@/hooks/useBotEvents'
import { formatTime, isValidUrl } from '@/lib/utils'

const MAX_ATTACH_BYTES = 20 * 1024 * 1024
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.mp3', '.ogg', '.mp4', '.zip']

function dayKey(ts) {
  return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function displayName(user) {
  return user.customer_name || `User ${String(user.user_id).slice(-6)}`
}

function isImageBubble(b) {
  if (b.file_mime) return String(b.file_mime).startsWith('image/')
  return false
}

function mergeThreadBubbles(prev, incoming) {
  const byId = new Map()
  for (const item of prev) byId.set(item.id, item)
  for (const bubble of incoming) {
    if (bubble.sender === 'admin' && String(bubble.id).includes('-b')) {
      for (const [id, item] of byId) {
        if (!String(id).startsWith('tmp-')) continue
        if (item.sender !== 'admin') continue
        if (bubble.text && item.text === bubble.text) byId.delete(id)
        else if (item.file_name && bubble.file_name === item.file_name) byId.delete(id)
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
  const [replyTo, setReplyTo] = useState(null)
  const [attach, setAttach] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [menu, setMenu] = useState(null)
  const [pressingId, setPressingId] = useState(null)
  const boxRef = useRef(null)
  const fileRef = useRef(null)
  const inputRef = useRef(null)
  const pressTimer = useRef(null)
  const pressOrigin = useRef(null)
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
    setReplyTo(null)
    setAttach(null)
    setDeletingId(null)
    setConfirmDelete(null)
    setMenu(null)
    setPressingId(null)
    if (pressTimer.current) clearTimeout(pressTimer.current)
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
    return () => {
      mountedRef.current = false
      if (pressTimer.current) clearTimeout(pressTimer.current)
    }
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
    const media = bubbles.filter((bubble) => bubble.media_url && isValidUrl(bubble.media_url) && !bubble.is_deleted)
    Promise.all(media.map(async (bubble) => {
      if (bubble.file_mime && !String(bubble.file_mime).startsWith('image/')) return
      try {
        const response = await api.get(bubble.media_url, { responseType: 'blob' })
        const ct = response.headers?.['content-type'] ?? response.data?.type ?? ''
        if (ct && !ct.startsWith('image/')) return
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
    setMenu(null)
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

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const ext = `.${(f.name.split('.').pop() ?? '').toLowerCase()}`
    if (!ALLOWED_EXTS.includes(ext)) {
      toast.error(`Tipe file tidak didukung (${ext || 'tanpa ekstensi'})`)
      return
    }
    if (f.size > MAX_ATTACH_BYTES) {
      toast.error('File terlalu besar (maks 20MB)')
      return
    }
    setAttach(f)
  }

  const send = async () => {
    const generation = generationRef.current
    const msg = text.trim()
    if (!isCurrent(generation) || sending) return
    if (!msg && !attach) return
    setSending(true)
    const optimistic = {
      id: `tmp-${Date.now()}`, sender: 'admin',
      text: msg || (attach ? `[file] ${attach.name}` : ''),
      file_name: attach?.name ?? null,
      reply_to_text: replyTo?.text ? String(replyTo.text).slice(0, 300) : null,
      created_at: new Date().toISOString(),
    }
    animIdsRef.current.add(optimistic.id)
    setBubbles((p) => [...p, optimistic])
    const sendText = msg
    const sendReply = replyTo?.id ?? null
    const sendFile = attach
    setText('')
    setReplyTo(null)
    setAttach(null)
    scrollBottom(generation)
    try {
      if (sendFile) {
        const form = new FormData()
        form.append('file', sendFile)
        if (sendText) form.append('text', sendText)
        if (sendReply) form.append('reply_to_bubble_id', sendReply)
        await api.post(`/api/bots/${bot.id}/conversations/${uid}/reply-media`, form)
      } else {
        const payload = { text: sendText }
        if (sendReply) payload.reply_to_bubble_id = sendReply
        await api.post(`/api/bots/${bot.id}/conversations/${uid}/reply`, payload)
      }
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

  const askDelete = (b) => {
    const rawId = Number(String(b.id).split('-')[0])
    if (!Number.isFinite(rawId) || b.sender !== 'admin') return
    setMenu(null)
    setConfirmDelete(b)
  }

  const removeMessage = async (b) => {
    const rawId = Number(String(b.id).split('-')[0])
    if (!Number.isFinite(rawId) || b.sender !== 'admin') return
    setDeletingId(b.id)
    try {
      await api.delete(`/api/bots/${bot.id}/conversations/${uid}/messages/${rawId}`)
      setBubbles((p) => p.map((x) => (x.id === b.id ? { ...x, is_deleted: true, text: 'Pesan ini telah dihapus.', media_url: null } : x)))
      invalidate(threadKey)
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const HOLD_MS = 450

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
    pressOrigin.current = null
    setPressingId(null)
  }

  const openMenu = (b, x, y) => {
    const canReply = !b.is_deleted && !String(b.id).startsWith('tmp-')
    const canDelete = b.sender === 'admin' && b.can_delete && !String(b.id).startsWith('tmp-')
    if (!canReply && !canDelete) return
    if (navigator.vibrate) {
      try { navigator.vibrate(10) } catch { /* abaikan */ }
    }
    setMenu({
      id: b.id,
      x: Math.max(8, Math.min(x, window.innerWidth - 180)),
      y: Math.max(8, Math.min(y, window.innerHeight - 140)),
    })
  }

  const closeMenu = () => setMenu(null)

  const startPress = (b, x, y) => {
    cancelPress()
    pressOrigin.current = { x, y }
    setPressingId(b.id)
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      setPressingId(null)
      openMenu(b, x, y)
    }, HOLD_MS)
  }

  const chooseReply = (b) => {
    setReplyTo({ id: b.id, text: b.text, sender: b.sender })
    setMenu(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  useEffect(() => {
    if (!menu) return
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

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
            const deleted = !!b.is_deleted
            const mediaOk = !deleted && typeof b.media_url === 'string' && b.media_url.length > 0 && isValidUrl(b.media_url)
            const showImage = mediaOk && (isImageBubble(b) || !b.file_mime)
            const showFile = mediaOk && b.file_name && !isImageBubble(b) && b.file_mime
            const mediaSrc = mediaUrls[b.id]
            const canReply = !deleted && !String(b.id).startsWith('tmp-')
            const canDel = mine && b.sender === 'admin' && b.can_delete && !String(b.id).startsWith('tmp-')
            const holdable = canReply || canDel
            const selected = pressingId === b.id || menu?.id === b.id
            return (
              <div key={b.id} data-day={day}>
                {showDay ? (
                  <div className="mb-2 flex justify-center">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{day}</span>
                  </div>
                ) : null}
                <div
                  onTouchStart={(e) => {
                    if (!holdable) return
                    const t = e.touches[0]
                    startPress(b, t.clientX, t.clientY)
                  }}
                  onTouchMove={(e) => {
                    const o = pressOrigin.current
                    if (!o) return
                    const t = e.touches[0]
                    if (Math.hypot(t.clientX - o.x, t.clientY - o.y) > 10) cancelPress()
                  }}
                  onTouchEnd={cancelPress}
                  onTouchCancel={cancelPress}
                  onContextMenu={(e) => {
                    if (!holdable) return
                    e.preventDefault()
                    openMenu(b, e.clientX, e.clientY)
                  }}
                  className={`group flex items-center gap-1 ${mine ? 'justify-end' : 'justify-start'} ${animIdsRef.current.has(b.id) ? 'bubble-in' : ''}`}
                >
                  {mine && canReply ? (
                    <button
                      type="button"
                      onClick={() => chooseReply(b)}
                      aria-label="Balas pesan"
                      title="Balas"
                      className="hidden shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 md:block"
                    >
                      <Reply className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                  {canDel ? (
                    <button
                      type="button"
                      onClick={() => askDelete(b)}
                      disabled={deletingId === b.id}
                      aria-label="Hapus pesan"
                      title="Hapus"
                      className="hidden shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 md:block"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm transition-shadow ${mine ? 'bg-primary/10' : 'border border-border bg-background'} ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background select-none' : ''}`}>
                    {b.reply_to_text ? (
                      <div className="mb-1.5 line-clamp-3 rounded-md border-l-2 border-primary/60 bg-background/60 px-2 py-1 text-xs text-muted-foreground">
                        {b.reply_to_text}
                      </div>
                    ) : null}
                    {showImage && mediaSrc && !failedMedia.has(b.id) ? (
                      <button type="button" onClick={() => setPreview(mediaSrc)} className="block">
                        <img
                          src={mediaSrc}
                          alt="Lampiran chat"
                          className="max-h-48 rounded-lg object-cover"
                          loading="lazy"
                          onError={() => setFailedMedia((p) => new Set(p).add(b.id))}
                        />
                      </button>
                    ) : showImage && mediaOk ? (
                      <p className="text-sm text-muted-foreground">
                        Lampiran tidak dapat dimuat.
                        <button type="button" className="ml-1 text-primary underline" onClick={() => setFailedMedia((p) => { const next = new Set(p); next.delete(b.id); return next })}>
                          Coba lagi
                        </button>
                      </p>
                    ) : null}
                    {showFile ? (
                      <a
                        href={b.media_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mb-1.5 flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left hover:border-primary/40"
                      >
                        <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">{b.file_name}</span>
                          <span className="block text-[11px] text-muted-foreground">Ketuk untuk unduh / buka</span>
                        </span>
                      </a>
                    ) : null}
                    {b.text ? (
                      <p className={`break-words whitespace-pre-wrap ${deleted ? 'text-muted-foreground italic' : ''}`}>{b.text}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatTime(b.created_at)}</p>
                  </div>
                  {!mine && canReply ? (
                    <button
                      type="button"
                      onClick={() => chooseReply(b)}
                      aria-label="Balas pesan"
                      title="Balas"
                      className="hidden shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 md:block"
                    >
                      <Reply className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
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

      <div className="border-t border-border p-3">
        {replyTo ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5">
            <div className="min-w-0 flex-1 border-l-2 border-primary/60 pl-2">
              <p className="text-[11px] font-medium text-primary">Membalas {replyTo.sender === 'admin' || replyTo.sender === 'bot' ? 'Anda' : name}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{replyTo.text || '(lampiran)'}</p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setReplyTo(null)} aria-label="Batalkan balasan">
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : null}
        {attach ? (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-2.5 py-1.5">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="min-w-0 flex-1 truncate text-xs">{attach.name} ({(attach.size / 1024).toFixed(0)} KB)</p>
            <Button variant="ghost" size="icon-sm" onClick={() => setAttach(null)} aria-label="Hapus lampiran">
              <X aria-hidden="true" />
            </Button>
          </div>
        ) : null}
        <div className="flex items-end gap-1">
          <input ref={fileRef} type="file" className="hidden" onChange={pickFile} aria-label="Pilih lampiran" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Tambah lampiran"
            title="Tambah gambar / file"
            className="shrink-0"
          >
            <Paperclip aria-hidden="true" />
          </Button>
          <Textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={attach ? 'Tulis keterangan (opsional)...' : 'Tulis balasan...'}
            rows={1}
            className="min-h-0 resize-none"
            disabled={sending}
            aria-label="Tulis balasan"
          />
          <Button onClick={send} disabled={(!text.trim() && !attach) || sending} size="icon" aria-label="Kirim">
            {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <SendHorizontal aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {menu ? (
        <>
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={closeMenu}
            onTouchEnd={closeMenu}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div
            role="menu"
            aria-label="Opsi pesan"
            style={{ left: menu.x, top: menu.y }}
            onContextMenu={(e) => e.preventDefault()}
            className="fixed z-50 w-44 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg select-none"
          >
            {(() => {
              const target = bubbles.find((x) => x.id === menu.id)
              if (!target) return null
              const mReply = !target.is_deleted && !String(target.id).startsWith('tmp-')
              const mDel = target.sender === 'admin' && target.can_delete && !String(target.id).startsWith('tmp-')
              return (
                <>
                  {mReply ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => chooseReply(target)}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm hover:bg-muted"
                    >
                      <Reply className="size-4 text-muted-foreground" aria-hidden="true" />
                      Balas
                    </button>
                  ) : null}
                  {mDel ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => askDelete(target)}
                      disabled={deletingId === target.id}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Hapus
                    </button>
                  ) : null}
                </>
              )
            })()}
          </div>
        </>
      ) : null}

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

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => { if (!open && !deletingId) setConfirmDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Hapus pesan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Pesan akan dihapus di Telegram bila masih memungkinkan, dan riwayat dashboard ditandai sebagai dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmDelete?.text && !confirmDelete?.is_deleted ? (
            <p className="line-clamp-3 rounded-lg border-l-2 border-primary/60 bg-muted/60 px-2.5 py-1.5 text-xs text-muted-foreground">
              {confirmDelete.text}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault()
                if (confirmDelete && !deletingId) removeMessage(confirmDelete)
              }}
            >
              {deletingId ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
