import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import AppShell from '@/components/AppShell'
import { RequireAuth } from '@/lib/auth'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Register from '@/pages/Register'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const BotWizard = lazy(() => import('@/pages/BotWizard'))
const BotLayout = lazy(() => import('@/pages/BotLayout'))
const BotOverview = lazy(() => import('@/pages/BotOverview'))
const BotChats = lazy(() => import('@/pages/BotChats'))
const BotOrders = lazy(() => import('@/pages/BotOrders'))
const BotFiles = lazy(() => import('@/pages/BotFiles'))
const BotAnalytics = lazy(() => import('@/pages/BotAnalytics'))
const BotSettings = lazy(() => import('@/pages/BotSettings'))

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-primary" aria-label="Memuat halaman" />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/bots/new"
          element={
            <RequireAuth>
              <BotWizard />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/bots/:id" element={<BotLayout />}>
            <Route index element={<BotOverview />} />
            <Route path="percakapan" element={<BotChats />} />
            <Route path="pesanan" element={<BotOrders />} />
            <Route path="berkas" element={<BotFiles />} />
            <Route path="analitik" element={<BotAnalytics />} />
            <Route path="pengaturan" element={<BotSettings />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
