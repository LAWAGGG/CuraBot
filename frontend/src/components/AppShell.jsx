import { Suspense, createContext, useContext, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, ChevronDown, LayoutGrid, LogOut, Menu, Moon, PlusCircle, Settings, Sun } from 'lucide-react'
import CuraBotLogo from '@/components/CuraBotLogo'
import { apiFetch } from '@/lib/api'
import { useApi } from '@/hooks/useApi'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useAuth } from '@/lib/auth'
import { getSettings, saveSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'

const BOT_TABS = [
  { suffix: '', label: 'Ringkasan', end: true },
  { suffix: 'percakapan', label: 'Percakapan' },
  { suffix: 'pesanan', label: 'Pesanan' },
  { suffix: 'berkas', label: 'Berkas' },
  { suffix: 'analitik', label: 'Analitik' },
  { suffix: 'pengaturan', label: 'Pengaturan' },
]

export const ChatNavContext = createContext({ selectedChat: null, setSelectedChat: () => {} })

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5">
      <CuraBotLogo className="size-15" />
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
          'relative flex items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
          indent ? 'min-h-9 rounded-lg text-muted-foreground' : 'min-h-11',
          isActive && 'text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <motion.span
              layoutId={pillId}
              className="absolute inset-0 rounded-xl bg-card shadow-sm ring-1 ring-border"
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

function ConversationList({ botId }) {
  const { selectedChat, setSelectedChat } = useContext(ChatNavContext)
  const key = `conversations:${botId}:`
  const { data, loading } = useApi(key, () =>
    apiFetch(key, { url: `/api/bots/${botId}/conversations`, params: { q: '' } }),
  )
  const items = data?.conversations ?? []
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4">
      <button
        type="button"
        onClick={() => setSelectedChat(null)}
        className="mb-2 flex items-center gap-2 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Semua percakapan
      </button>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {loading && items.length === 0
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                  <Skeleton className="h-3 w-full rounded-md" />
                </div>
              </div>
            ))
          : items.map((item) => {
          const name = item.customer_name || `User ${String(item.user_id).slice(-6)}`
          const active = selectedChat?.user_id === item.user_id
          return (
            <button
              key={item.user_id}
              type="button"
              onClick={() => setSelectedChat(item)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted',
                active && 'bg-card shadow-sm ring-1 ring-border',
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {(String(name).trim().charAt(0) || 'U').toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.last_text}</span>
              </span>
              {item.unread_count > 0 ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {item.unread_count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SidebarNav({ onNavigate, pillId = 'side' }) {
  const { pathname } = useLocation()
  const botMatch = pathname.match(/^\/bots\/([^/]+)/)
  const botId = botMatch && botMatch[1] !== 'new' ? botMatch[1] : null
  const { selectedChat } = useContext(ChatNavContext)

  // ponytail: saat chat detail terbuka, sidebar jadi daftar user biar gampang pindah chat
  if (botId && selectedChat) {
    return <ConversationList botId={botId} />
  }

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
          <div className="flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-foreground">
            <Bot className="size-5" aria-hidden="true" />
            Bot
          </div>
          <div className="ml-[26px] space-y-0.5 border-l border-border pl-3">
            {BOT_TABS.map(({ suffix, label, end }) => (
              <div key={label} className="relative">
                <span className="absolute -left-3 top-1/2 h-px w-3 bg-border" aria-hidden="true" />
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
      <SideLink to="/pengaturan" pillId={`${pillId}-main`} onNavigate={onNavigate} icon={Settings} label="Pengaturan" />
    </nav>
  )
}

function ThemeToggle({ className }) {
  const [theme, setTheme] = useState(() => getSettings().theme)
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
      className={cn('text-muted-foreground hover:text-foreground', className)}
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark'
        saveSettings({ theme: next })
        setTheme(next)
      }}
    >
      {theme === 'dark' ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
    </Button>
  )
}

function ThemeSwitch() {
  const [theme, setTheme] = useState(() => getSettings().theme)
  const dark = theme === 'dark'
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 p-3">
      <span className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        {dark ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
        Mode {dark ? 'gelap' : 'terang'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Alihkan mode gelap"
        onClick={() => {
          const next = dark ? 'light' : 'dark'
          saveSettings({ theme: next })
          setTheme(next)
        }}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          dark ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform',
            dark ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

function AccountFooter({ email, onLogout }) {
  return (
    <div className="p-4 pt-1">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/70 p-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background uppercase">
          {(email ?? 'P').charAt(0)}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={email ?? ''}>
          {email ?? 'Pengguna'}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onLogout}
          aria-label="Keluar"
          className="text-muted-foreground hover:text-foreground"
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
  const [selectedChat, setSelectedChat] = useState(null)
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <ChatNavContext.Provider value={{ selectedChat, setSelectedChat }}>
    <div className="min-h-svh bg-muted lg:flex">
      <aside className="sticky top-0 hidden h-svh w-[280px] shrink-0 flex-col lg:flex">
        <Brand />
        <SidebarNav />
        <div className="mt-auto px-4 pb-2">
          <ThemeSwitch />
        </div>
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
          <div className="flex items-center gap-1">
            <CuraBotLogo className="size-10" />
            <span className="font-bold tracking-tight">CuraBot</span>
          </div>
          <ThemeToggle className="ml-auto" />
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
    </ChatNavContext.Provider>
  )
}
