import { Route, Routes } from 'react-router-dom'

import AppShell from '@/components/AppShell'
import { RequireAuth } from '@/lib/auth'
import BotLayout from '@/pages/BotLayout'
import BotFiles from '@/pages/BotFiles'
import BotOverview from '@/pages/BotOverview'
import BotWizard from '@/pages/BotWizard'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'
import Placeholder from '@/pages/Placeholder'
import Register from '@/pages/Register'

export default function App() {
  return (
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
          <Route path="percakapan" element={<Placeholder title="Percakapan" />} />
          <Route path="pesanan" element={<Placeholder title="Pesanan" />} />
          <Route path="berkas" element={<BotFiles />} />
          <Route path="analitik" element={<Placeholder title="Analitik" />} />
          <Route path="pengaturan" element={<Placeholder title="Pengaturan" />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
