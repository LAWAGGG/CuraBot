import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Loader2, MessageSquareText, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'

import EmptyState from '@/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, errorMessage } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatDateTime } from '@/lib/utils'

const PAGE_SIZE = 20

const MODEL_LABELS = {
  'flash-3.6': { label: 'Flash 3.6', className: 'border-primary/25 bg-primary/10 text-primary' },
  'flash-3.5-lite': {
    label: 'Flash 3.5 Lite',
    className: 'border-info/25 bg-info/10 text-info',
  },
  none: { label: 'Gagal', className: 'border-destructive/25 bg-destructive/10 text-destructive' },
}

function ModelBadge({ model }) {
  const item = MODEL_LABELS[model] ?? {
    label: model || '—',
    className: 'border-border bg-muted text-muted-foreground',
  }
  return (
    <Badge variant="outline" className={item.className}>
      {item.label}
    </Badge>
  )
}

function MessageDetail({ message, onClose }) {
  return (
    <Drawer
      open={Boolean(message)}
      onOpenChange={(open) => (!open ? onClose() : null)}
      direction="right"
    >
      <DrawerContent className="w-full sm:max-w-md">
        <DrawerHeader className="border-b border-border">
          <DrawerTitle>Detail percakapan</DrawerTitle>
          <DrawerDescription>
            {formatDateTime(message?.created_at)} · respons {message?.response_time ?? '—'} dtk
          </DrawerDescription>
        </DrawerHeader>
        {message ? (
          <div className="space-y-4 overflow-y-auto p-4">
            <div className="flex items-center gap-2">
              <ModelBadge model={message.model_used} />
              <span className="text-xs text-muted-foreground">ID pengguna: {message.user_id}</span>
            </div>
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Pesan pelanggan
              </h3>
              <p className="mt-2 rounded-lg border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {message.message_text}
              </p>
            </section>
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Balasan bot
              </h3>
              <p className="mt-2 rounded-lg border border-primary/15 bg-primary/5 p-3 text-sm whitespace-pre-wrap">
                {message.response_text}
              </p>
            </section>
            {message.extracted_data ? (
              <section>
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Data ekstraksi
                </h3>
                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap">
                  {JSON.stringify(message.extracted_data, null, 2)}
                </pre>
              </section>
            ) : null}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

export default function BotChats() {
  const { bot } = useOutletContext()
  const [pages, setPages] = useState([1])
  const [extra, setExtra] = useState({})
  const [loadingMore, setLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState(null)

  const firstKey = `messages:${bot.id}:1`
  const { data: first, loading, error, refresh } = useApi(firstKey, () =>
    apiFetch(firstKey, {
      url: `/api/messages/${bot.id}`,
      params: { page: 1, limit: PAGE_SIZE },
    }),
  )

  const rows = useMemo(() => {
    const list = []
    for (const page of pages) {
      const pageData = page === 1 ? first : extra[page]
      if (pageData?.messages) list.push(...pageData.messages)
    }
    return list
  }, [pages, first, extra])

  const total = first?.total ?? 0
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery
    ? rows.filter(
        (row) =>
          row.message_text?.toLowerCase().includes(normalizedQuery) ||
          row.response_text?.toLowerCase().includes(normalizedQuery) ||
          row.user_id?.toLowerCase().includes(normalizedQuery),
      )
    : rows

  const loadMore = async () => {
    const nextPage = Math.max(...pages) + 1
    setLoadingMore(true)
    try {
      const pageData = await apiFetch(`messages:${bot.id}:${nextPage}`, {
        url: `/api/messages/${bot.id}`,
        params: { page: nextPage, limit: PAGE_SIZE },
      })
      setExtra((prev) => ({ ...prev, [nextPage]: pageData }))
      setPages((prev) => [...prev, nextPage])
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pesan, balasan, atau ID pengguna"
            className="pl-10"
            aria-label="Cari percakapan"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {normalizedQuery
            ? `Menyaring ${filtered.length} dari ${rows.length} percakapan yang dimuat`
            : `${rows.length} dari ${total} percakapan dimuat`}
        </p>
      </div>

      {loading && !first ? (
        <div className="space-y-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw aria-hidden="true" />
            Coba Lagi
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title="Belum ada percakapan"
          description="Setelah pelanggan mengobrol dengan bot Anda, riwayatnya akan muncul di sini."
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Tidak ada percakapan yang cocok dengan pencarian Anda pada data yang sudah dimuat.
        </p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {filtered.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => setDetail(row)}
                  className="w-full rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/25 hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {row.user_id} · {formatDateTime(row.created_at)}
                    </span>
                    <span className="flex items-center gap-2">
                      <ModelBadge model={row.model_used} />
                      {row.response_time != null ? (
                        <span className="text-xs text-muted-foreground">{row.response_time} dtk</span>
                      ) : null}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-medium">{row.message_text}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {row.response_text}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {rows.length < total ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                Muat Lebih Banyak
              </Button>
            </div>
          ) : null}
        </>
      )}

      <MessageDetail message={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
