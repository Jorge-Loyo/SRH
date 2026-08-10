import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { setAccessToken, setUnauthenticatedCallback, apiGet } from '../api/client.js'

const AuthContext = createContext(null)

function getIdleMs() {
  const minutes = Number(import.meta.env.VITE_AUTH_IDLE_MINUTES || 30)
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 30) * 60 * 1000
}

const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [allowedModules, setAllowedModules] = useState(null)
  const mountedRef      = useRef(true)
  const lastActivityRef = useRef(Date.now())
  const tokenExpiresRef = useRef(null)
  const idleTimerRef    = useRef(null)
  const isLoggedInRef   = useRef(false)

  function handleActivity() {
    lastActivityRef.current = Date.now()
  }

  function startIdleWatcher() {
    stopIdleWatcher()
    const IDLE_MS = getIdleMs()
    idleTimerRef.current = setInterval(async () => {
      if (!isLoggedInRef.current) return
      const now = Date.now()
      if (now - lastActivityRef.current >= IDLE_MS) { doLogout(); return }
      if (tokenExpiresRef.current && tokenExpiresRef.current - now < TOKEN_REFRESH_THRESHOLD_MS) {
        await doRefresh()
      }
    }, 60 * 1000)
  }

  function stopIdleWatcher() {
    if (idleTimerRef.current) { clearInterval(idleTimerRef.current); idleTimerRef.current = null }
  }

  async function doRefresh() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.accessToken) { setAccessToken(data.accessToken); setTokenExpiry(data.accessToken) }
      } else {
        doLogout()
      }
    } catch { /* error de red transitorio */ }
  }

  function setTokenExpiry(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp) tokenExpiresRef.current = payload.exp * 1000
    } catch {
      tokenExpiresRef.current = Date.now() + getIdleMs()
    }
  }

  function doLogout() {
    isLoggedInRef.current = false
    stopIdleWatcher()
    setAccessToken(null)
    if (mountedRef.current) { setUser(null); setAllowedModules(null) }
    fetch('/api/auth/logout', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})
  }

  useEffect(() => {
    setUnauthenticatedCallback(() => {
      isLoggedInRef.current = false
      stopIdleWatcher()
      setAccessToken(null)
      if (mountedRef.current) { setUser(null); setAllowedModules(null) }
    })

    restoreSession()

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    return () => {
      mountedRef.current = false
      stopIdleWatcher()
      events.forEach(e => window.removeEventListener(e, handleActivity))
    }
  }, [])

  function loadModules(role) {
    apiGet('/api/seguridad/permisos/modulos')
      .then(data => {
        if (mountedRef.current)
          setAllowedModules(data.permisos?.[role] ?? [])
      })
      .catch(() => { if (mountedRef.current) setAllowedModules([]) })
  }

  function onSessionEstablished(accessToken, userData, modules) {
    isLoggedInRef.current = true
    lastActivityRef.current = Date.now()
    setAccessToken(accessToken)
    setTokenExpiry(accessToken)
    if (mountedRef.current) setUser(userData ?? null)
    startIdleWatcher()
    if (mountedRef.current) {
      // admin: null = sin restricciones; otros: array de moduleKeys permitidos
      setAllowedModules(modules !== undefined ? modules : null)
    }
  }

  async function restoreSession() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.accessToken && mountedRef.current) onSessionEstablished(data.accessToken, data.user, data.allowedModules)
      }
    } catch { /* sin sesión previa */ } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Credenciales incorrectas')
    }
    const data = await res.json()
    onSessionEstablished(data.accessToken, data.user, data.allowedModules)
    return data.user ?? null
  }, [])

  const logout = useCallback(async () => {
    isLoggedInRef.current = false
    stopIdleWatcher()
    try {
      await fetch('/api/auth/logout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch { /* ignorar */ }
    setAccessToken(null)
    setUser(null)
    setAllowedModules(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, allowedModules }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
