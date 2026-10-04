import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { Bot, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { copyToClipboard, formatDate } from '@/lib/utils'

const TABS = [
  { to: '.', label: 'Ringkasan', end: true },
  { to: 'percakapan', label: 'Percakapan' },
  { to: 'pesanan', label: 'Pesanan' },
  { to: 'berkas', label: 'Berkas' },
  { to: 'analitik', label: 'Analitik' },
  { to: 'pengaturan', label: 'Pengaturan' },
]

export default function BotLayout() {
  const { id } = useParams()
  const { data: bot, loading, error, refresh } = useApi(`bot:${id}`, () =>
    apiFetch(`bot:${id}`, { url: `/api/bots/${id}` }),
  )

  const copyLink = async () => {
    try {
      await copyToClipboard(bot.telegram_link)
      toast.success('Tautan bot disalin.')
    } catch {
      toast.error('Gagal menyalin tautan.')
    }
  }

  if (loading && !bot) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !bot) {
    return (
      <>
        <PageHeader title="Bot tidak ditemukan" backTo="/" />
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {error ?? 'Bot ini mungkin sudah dihapus atau bukan milik akun Anda.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refresh()}>
              <RefreshCw aria-hidden="true" />
              Coba Lagi
            </Button>
            <Button asChild>
              <Link to="/">Kembali ke Beranda</Link>
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-primary/10 bg-background p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="hero-gradient flex size-13 shrink-0 items-center justify-center rounded-2xl text-white">
            <Bot className="size-6.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{bot.name}</h1>
              <StatusBadge status={bot.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Dibuat {formatDate(bot.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
            <span className="max-w-44 truncate text-xs text-muted-foreground" title={bot.telegram_link}>
              {bot.telegram_link}
            </span>
            <Button variant="ghost" size="icon-xs" onClick={copyLink} aria-label="Salin tautan bot">
              <Copy aria-hidden="true" />
            </Button>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={bot.telegram_link} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              Buka
            </a>
          </Button>
        </div>
      </div>

      <nav
        className="mb-6 flex gap-1 overflow-x-auto border-b border-border"
        aria-label="Navigasi bot"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              isActive
                ? 'border-b-2 border-primary px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap text-primary'
                : 'border-b-2 border-transparent px-3.5 py-2.5 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground'
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ bot, refreshBot: refresh }} />
    </>
  )
}
