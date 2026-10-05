import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { MessageSquareText, RefreshCw, Search } from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatDateTime } from '@/lib/utils'
import ChatThread from './ChatThread'

function displayName(c) {
  return c.customer_name || `User ${String(c.user_id).slice(-6)}`
}

function initial(name) {
  return (String(name ?? 'U').trim().charAt(0) || 'U').toUpperCase()
}

export default function BotChats() {
  const { bot } = useOutletContext()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState(null)
  const key = `conversations:${bot.id}:${debounced}`
  const { data, loading, error, refresh } = useApi(key, ({ force } = {}) =>
    apiFetch(key, { url: `/api/bots/${bot.id}/conversations`, params: { q: debounced }, force }),
  )
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400)
    return () => clearTimeout(t)
  }, [query])
  useEffect(() => {
    if (selected) return undefined
    const t = setInterval(() => refresh(), 10000)
    return () => clearInterval(t)
  }, [refresh, selected])
  const items = data?.conversations ?? []
  if (selected) {
    return <ChatThread bot={bot} user={selected} onBack={() => { setSelected(null); refresh() }} />
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
            placeholder="Cari nama, ID pengguna, atau isi pesan"
            className="pl-10"
            aria-label="Cari percakapan"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
          <RefreshCw aria-hidden="true" />
          Muat Ulang
        </Button>
      </div>

      {loading && items.length === 0 ? (
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
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={debounced ? 'Tidak ada hasil' : 'Belum ada percakapan'}
          description={
            debounced
              ? 'Tidak ada percakapan yang cocok dengan pencarian Anda.'
              : 'Setelah pelanggan mengobrol dengan bot Anda, daftarnya akan muncul di sini.'
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, index) => {
            const name = displayName(item)
            return (
              <li key={item.user_id} className="rise" style={{ animationDelay: `${index * 50}ms` }}>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-primary/25 hover:bg-primary/5"
                >
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {initial(name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(item.last_created_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="line-clamp-1 min-w-0 flex-1 text-sm text-muted-foreground">
                        {item.last_sender === 'admin' || item.last_sender === 'bot' ? 'Anda: ' : ''}
                        {item.last_text}
                      </span>
                      {item.unread_count > 0 ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                          {item.unread_count}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
