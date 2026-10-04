import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bot, LayoutGrid, LogOut, Menu, PlusCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', icon: LayoutGrid, end: true },
  { to: '/bots/new', label: 'Buat Bot', icon: PlusCircle, end: false },
]

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Bot className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-bold tracking-tight">CuraBot</span>
    </div>
  )
}

function SidebarNav({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Navigasi utama">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
            )
          }
        >
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function AccountFooter({ email, onLogout }) {
  return (
    <div className="mt-auto border-t border-sidebar-border p-4">
      <p className="truncate text-xs text-muted-foreground" title={email ?? ''}>
        {email ?? 'Pengguna'}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onLogout}
        className="mt-2 w-full justify-start gap-2 text-muted-foreground"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Keluar
      </Button>
    </div>
  )
}

export default function AppShell() {
  const { email, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh bg-background lg:flex">
      <aside className="sticky top-0 hidden h-svh w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
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
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
              <AccountFooter email={email} onLogout={handleLogout} />
            </DrawerContent>
          </Drawer>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="size-4" aria-hidden="true" />
            </span>
            <span className="font-bold tracking-tight">CuraBot</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
