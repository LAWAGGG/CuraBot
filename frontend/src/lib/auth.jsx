import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import {
  apiFetch,
  getStoredEmail,
  getToken,
  setStoredEmail,
  setToken,
} from '@/lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [email, setEmailState] = useState(() => getStoredEmail())

  const clear = useCallback(() => {
    setToken(null)
    setStoredEmail(null)
    setTokenState(null)
    setEmailState(null)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => clear()
    window.addEventListener('curabot:unauthorized', onUnauthorized)
    return () => window.removeEventListener('curabot:unauthorized', onUnauthorized)
  }, [clear])

  const login = useCallback(async (inputEmail, password) => {
    const result = await apiFetch(null, {
      method: 'post',
      url: '/api/auth/login',
      data: { email: inputEmail, password },
    })
    setToken(result.access_token)
    setStoredEmail(inputEmail)
    setTokenState(result.access_token)
    setEmailState(inputEmail)
    return result
  }, [])

  const register = useCallback(
    async (inputEmail, password) => {
      await apiFetch(null, {
        method: 'post',
        url: '/api/auth/register',
        data: { email: inputEmail, password },
      })
      return login(inputEmail, password)
    },
    [login],
  )

  const logout = useCallback(async () => {
    try {
      await apiFetch(null, { method: 'post', url: '/api/auth/logout' })
    } catch {
      // Token may already be invalid; local cleanup is what matters.
    }
    clear()
  }, [clear])

  const value = useMemo(
    () => ({ token, email, login, register, logout }),
    [token, email, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function RequireAuth({ children }) {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}
