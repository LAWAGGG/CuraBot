import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth'
import { applySettings, getSettings } from '@/lib/settings'
import './index.css'
import App from './App.jsx'

applySettings()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-center" richColors theme={getSettings().theme === 'dark' ? 'dark' : 'light'} />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
