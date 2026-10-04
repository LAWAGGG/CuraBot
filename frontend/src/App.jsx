import { Route, Routes } from 'react-router-dom'

import AppShell from '@/components/AppShell'
import { RequireAuth } from '@/lib/auth'
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
            <Placeholder title="Buat Bot" description="Wizard pembuatan bot akan hadir di sini." />
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
        <Route
          path="/"
          element={<Placeholder title="Bot Saya" description="Daftar bot Anda akan tampil di sini." />}
        />
        <Route path="/bots/:id" element={<Placeholder title="Detail Bot" />}>
          <Route index element={<Placeholder title="Ringkasan" />} />
          <Route path="percakapan" element={<Placeholder title="Percakapan" />} />
          <Route path="pesanan" element={<Placeholder title="Pesanan" />} />
          <Route path="berkas" element={<Placeholder title="Berkas" />} />
          <Route path="analitik" element={<Placeholder title="Analitik" />} />
          <Route path="pengaturan" element={<Placeholder title="Pengaturan" />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
