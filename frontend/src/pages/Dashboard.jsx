import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bot,
  Copy,
  ExternalLink,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch, errorMessage, invalidate } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { copyToClipboard, formatDate } from '@/lib/utils'

const BOTS_KEY = 'bots'

export default function Dashboard() {
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, refresh } = useApi(BOTS_KEY, () =>
    apiFetch(BOTS_KEY, { url: '/api/bots/list' }),
  )
  const bots = data?.bots ?? []

  const copyLink = async (bot) => {
    try {
      await copyToClipboard(bot.telegram_link)
      toast.success('Tautan bot disalin.')
    } catch {
      toast.error('Gagal menyalin tautan.')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await apiFetch(null, { method: 'delete', url: `/api/bots/${deleting.id}` })
      invalidate(BOTS_KEY)
      await refresh()
      toast.success(`Bot "${deleting.name}" berhasil dihapus.`)
      setDeleting(null)
    } catch (caught) {
      toast.error(errorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Bot Saya"
        description="Kelola bot layanan pelanggan Telegram Anda."
        actions={
          <Button asChild size="lg">
            <Link to="/bots/new">
              <Plus aria-hidden="true" />
              Buat Bot Baru
            </Link>
          </Button>
        }
      />

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" onClick={() => refresh()}>
            <RefreshCw aria-hidden="true" />
            Coba Lagi
          </Button>
        </Card>
      ) : bots.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Belum ada bot"
          description="Buat bot pertama Anda — cukup jawab beberapa pertanyaan dan bot siap dibagikan ke pelanggan."
          action={
            <Button asChild size="lg">
              <Link to="/bots/new">
                <Plus aria-hidden="true" />
                Buat Bot Baru
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {bots.map((bot) => (
            <Card
              key={bot.id}
              className="card-soft group relative flex flex-col gap-4 border-primary/10 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bot className="size-5.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-foreground">
                      <Link
                        to={`/bots/${bot.id}`}
                        className="outline-none after:absolute after:inset-0 focus-visible:underline"
                      >
                        {bot.name}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Dibuat {formatDate(bot.created_at)}
                    </p>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-1">
                  <StatusBadge status={bot.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Menu bot ${bot.name}`}>
                        <MoreVertical aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/bots/${bot.id}/pengaturan`}>
                          <Pencil aria-hidden="true" />
                          Ubah
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={bot.telegram_link} target="_blank" rel="noreferrer">
                          <ExternalLink aria-hidden="true" />
                          Buka di Telegram
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(bot)}>
                        <Trash2 aria-hidden="true" />
                        Hapus
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="relative z-10 flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                <span className="truncate text-xs text-muted-foreground" title={bot.telegram_link}>
                  {bot.telegram_link}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="ml-auto shrink-0"
                  onClick={() => copyLink(bot)}
                  aria-label={`Salin tautan ${bot.name}`}
                >
                  <Copy aria-hidden="true" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => (!open ? setDeleting(null) : null)}
        title={`Hapus bot "${deleting?.name ?? ''}"?`}
        description="Bot akan dinonaktifkan dan tidak bisa dipakai lagi oleh pelanggan. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus Bot"
        onConfirm={confirmDelete}
        loading={busy}
      />
    </>
  )
}
