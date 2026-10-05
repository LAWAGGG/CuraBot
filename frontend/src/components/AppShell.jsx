import { Suspense, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ChevronDown, LayoutGrid, LogOut, Menu, PlusCircle } from 'lucide-react'
import CuraBotLogo from '@/components/CuraBotLogo'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const BOT_TABS = [
  { suffix: '', label: 'Ringkasan', end: true },
  { suffix: 'percakapan', label: 'Percakapan' },
  { suffix: 'pesanan', label: 'Pesanan' },
  { suffix: 'berkas', label: 'Berkas' },
  { suffix: 'analitik', label: 'Analitik' },
  { suffix: 'pengaturan', label: 'Pengaturan' },
]

function Brand() {
  return (
    <div className="flex items-center gap-1 px-5 py-5">
      <CuraBotLogo className="size-20" />
      <span className="text-2xl font-bold tracking-tight">CuraBot</span>
    </div>
  )
}

function SideLink({ to, end, pillId, onNavigate, icon: Icon, label, indent }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium text-neutral-500 transition-colors hover:bg-white/60 hover:text-neutral-800',
          indent ? 'min-h-9 rounded-lg text-neutral-500' : 'min-h-11',
          isActive && 'text-neutral-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId={pillId}
              className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04]"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          ) : null}
          {Icon ? <Icon className="relative size-5" aria-hidden="true" /> : null}
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  )
}

function SidebarNav({ onNavigate, pillId = 'side' }) {
  const { pathname } = useLocation()
  const botMatch = pathname.match(/^\/bots\/([^/]+)/)
  const botId = botMatch && botMatch[1] !== 'new' ? botMatch[1] : null

  return (
    <nav className="flex flex-col gap-1 px-4" aria-label="Navigasi utama">
      <SideLink to="/" end pillId={`${pillId}-main`} onNavigate={onNavigate} icon={LayoutGrid} label="Beranda" />

      <AnimatePresence initial={false}>
        {botId ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="mt-1 overflow-hidden"
        >
          <div className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-neutral-900">
            <Bot className="size-5" aria-hidden="true" />
            Bot
            <ChevronDown className="ml-auto size-4 text-neutral-400" aria-hidden="true" />
          </div>
          <div className="ml-[26px] space-y-0.5 border-l border-neutral-300/80 pl-3">
            {BOT_TABS.map(({ suffix, label, end }) => (
              <div key={label} className="relative">
                <span className="absolute -left-3 top-1/2 h-px w-3 bg-neutral-300" aria-hidden="true" />
                <SideLink
                  to={suffix ? `/bots/${botId}/${suffix}` : `/bots/${botId}`}
                  end={end}
                  pillId={`${pillId}-tab`}
                  onNavigate={onNavigate}
                  label={label}
                  indent
                />
              </div>
            ))}
          </div>
        </motion.div>
        ) : null}
      </AnimatePresence>

      <SideLink to="/bots/new" pillId={`${pillId}-main`} onNavigate={onNavigate} icon={PlusCircle} label="Buat Bot" />
    </nav>
  )
}

function AccountFooter({ email, onLogout }) {
  return (
    <div className="mt-auto p-4">
      <div className="flex items-center gap-3 rounded-2xl border border-black/[0.05] bg-white/70 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white uppercase">
          {(email ?? 'P').charAt(0)}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-700" title={email ?? ''}>
          {email ?? 'Pengguna'}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onLogout}
          aria-label="Keluar"
          className="text-neutral-400 hover:text-neutral-900"
        >
          <LogOut className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export default function AppShell() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-[#F4F4F1] lg:flex">
      <aside className="sticky top-0 hidden h-svh w-[280px] shrink-0 flex-col lg:flex">
        <Brand />
        <SidebarNav />
        <AccountFooter email={email} onLogout={handleLogout} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur lg:hidden">
          <Drawer direction="left" open={menuOpen} onOpenChange={setMenuOpen}>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Buka menu">
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="w-72 bg-sidebar">
              <DrawerTitle className="sr-only">Menu navigasi</DrawerTitle>
              <Brand />
              <SidebarNav pillId="drawer" onNavigate={() => setMenuOpen(false)} />
              <AccountFooter email={email} onLogout={handleLogout} />
            </DrawerContent>
          </Drawer>
          <div className="flex items-center gap-2">
            <CuraBotLogo className="size-10" />
            <span className="font-bold tracking-tight">CuraBot</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <Suspense
              fallback={
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-56 rounded-lg" />
                    <Skeleton className="h-4 w-80 max-w-full rounded-md" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-44 rounded-xl" />
                    ))}
                  </div>
                  <Skeleton className="h-64 rounded-xl" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
