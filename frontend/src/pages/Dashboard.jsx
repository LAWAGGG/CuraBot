import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ExternalLink,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import BannerWord from '@/components/BannerWord'
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
import { formatDate } from '@/lib/utils'

const BOTS_KEY = 'bots'

export default function Dashboard() {
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data, loading, error, refresh } = useApi(BOTS_KEY, () =>
    apiFetch(BOTS_KEY, { url: '/api/bots/list' }),
  )
  const bots = data?.bots ?? []

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
            <Skeleton key={index} className="h-36 rounded-xl" />
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
          image="/CuraBot1.svg"
          imageAlt="CuraBot"
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
          {bots.map((bot, index) => (
            <Card
              key={bot.id}
              style={{ animationDelay: `${index * 60}ms` }}
              className="rise group relative overflow-hidden border-border/80 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-24 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(14,159,138,0.25),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_50%),radial-gradient(circle_at_70%_90%,rgba(163,230,53,0.18),transparent_55%)]">
                <BannerWord word={bot.name.trim().split(/\s+/).pop()} />
                <div className="absolute top-3 right-3">
                  <StatusBadge status={bot.status} />
                </div>
              </div>
              <div className="flex items-start justify-between gap-3 px-5 pt-7 pb-5">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold tracking-tight text-foreground">
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
                <div className="relative z-10 flex items-center gap-1">
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
