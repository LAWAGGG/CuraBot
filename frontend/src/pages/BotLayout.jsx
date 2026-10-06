import { Suspense, useContext, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { RefreshCw, Share2 } from 'lucide-react'

import BannerWord from '@/components/BannerWord'
import PageHeader from '@/components/PageHeader'
import ShareDialog from '@/components/ShareDialog'
import StatusBadge from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiFetch } from '@/lib/api'
import { useApi } from '@/hooks/useApi'
import { formatDate } from '@/lib/utils'
import { ChatNavContext } from '@/components/AppShell'

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

  const [shareOpen, setShareOpen] = useState(false)
  const { selectedChat, setSelectedChat } = useContext(ChatNavContext)
  const location = useLocation()
  const mascotRef = useRef(null)
  const sunglassesRef = useRef(null)

  useEffect(() => {
    setSelectedChat(null)
  }, [id, location.pathname])

  useEffect(() => {
    const target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    let raf = 0

    const onMove = (event) => {
      const box = mascotRef.current?.getBoundingClientRect()
      if (!box) return
      const dx = event.clientX - (box.left + box.width / 2)
      const dy = event.clientY - (box.top + box.height * 0.35)
      const max = 10
      target.x = Math.max(-max, Math.min(max, dx / 28))
      target.y = Math.max(-max, Math.min(max, dy / 28))
    }

    const tick = () => {
      current.x += (target.x - current.x) * 0.12
      current.y += (target.y - current.y) * 0.12
      if (sunglassesRef.current) {
        sunglassesRef.current.style.transform = `translate(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px)`
      }
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  if (loading && !bot) {
    return (
      <>
        <Skeleton className="mb-6 h-24 rounded-2xl" />
        <nav
          className="mb-6 flex gap-1 overflow-x-auto border-b border-border lg:hidden"
          aria-label="Navigasi bot"
        >
          {TABS.map((tab) => (
            <span key={tab.label} className="border-b-2 border-transparent px-3.5 py-2.5 text-sm text-muted-foreground">
              {tab.label}
            </span>
          ))}
        </nav>
        <Skeleton className="h-64 rounded-xl" />
      </>
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
      <motion.div
        initial={false}
        animate={{
          height: selectedChat ? 0 : 'auto',
          marginBottom: selectedChat ? 0 : 24,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="overflow-hidden"
      >
        <motion.div
          initial={false}
          animate={{
            y: selectedChat ? '-100%' : 0,
            opacity: selectedChat ? 0 : 1,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/80 shadow-sm">
            <div className="relative h-24 overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(14,159,138,0.25),transparent_55%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_50%),radial-gradient(circle_at_70%_90%,rgba(163,230,53,0.18),transparent_55%)]">
              <BannerWord word={bot.name} />
              <div className="absolute top-3 right-3">
                <StatusBadge status={bot.status} />
              </div>
            </div>
            <div className="relative flex flex-col gap-3 bg-background px-5 pt-4 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <img
                ref={mascotRef}
                src="/mascot-body.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -top-33 -right-2 hidden h-70 w-auto opacity-95 md:block md:drop-shadow-xl"
              />
              <img
                ref={sunglassesRef}
                src="/mascot-glass.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -top-31 right-0 hidden h-65 w-auto opacity-95 transition-transform duration-75 md:block"
              />

              <div className="relative z-10 min-w-0">
                <h1 className="text-xl font-bold tracking-tight break-words sm:text-2xl">{bot.name}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Dibuat {formatDate(bot.created_at)}
                </p>
              </div>
              <Button size="sm" onClick={() => setShareOpen(true)} className="relative z-10 shrink-0">
                <Share2 aria-hidden="true" />
                Bagikan
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        name={bot.name}
        link={bot.telegram_link}
      />

      <nav
        className="mb-6 flex gap-1 overflow-x-auto border-b border-border lg:hidden"
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

      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <Outlet context={{ bot, refreshBot: refresh, selectedChat, setSelectedChat }} />
      </Suspense>
    </>
  )
}
