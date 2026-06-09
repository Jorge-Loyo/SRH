import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { setAccessToken, setUnauthenticatedCallback } from '../api/client.js'

const AuthContext = createContext(null)

/**
 * Mecanismo de idle:
 *
 * AUTH_IDLE_MINUTES (default 30) controla tanto el access token (backend)
 * como el idle timeout del cliente. El flujo es:
 *
 *   1. El usuario hace algo (mouse, teclado, click, touch) → se actualiza lastActivity.
 *   2. Un timer revisa cada minuto si pasaron IDLE_MS sin actividad → logout.
 *   3. Cuando el access token está por vencer (quedan < TOKEN_REFRESH_THRESHOLD_MS)
 *      y hubo actividad reciente → se llama a /api/auth/refresh, que actualiza
 *      last_used en el backend. Si no hubo actividad, no se refresca y el token expira.
 *   4. El backend independientemente verifica idle en cada refresh (last_used > IDLE_MS).
 *
 * Resultado: si el usuario no toca nada por 30 min, la sesión se cierra en el cliente
 * sin esperar ningún request adicional.
 */

// Leer AUTH_IDLE_MINUTES desde variable de entorno de Vite (definida en el .env del frontend).
// Debe coincidir con AUTH_IDLE_MINUTES del servidor. Fallback: 30 minutos.
function getIdleMs() {
  const minutes = Number(import.meta.env.VITE_AUTH_IDLE_MINUTES || 30)
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 30) * 60 * 1000
}

// Con cuánta anticipación refrescar el token antes de que expire (2 minutos)
const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000

/**
 * Proveedor de autenticación.
 *
 * Al montar, intenta restaurar la sesión via refresh token (cookie httpOnly).
 * Esto funciona si AUTH_COOKIES=true en el servidor.
 *
 * Estado disponible via useAuth():
 *   user    → { id, username, email, role, hospital_code } | null
 *   loading → true mientras se inicializa
 *   login(username, password) → Promise<user>
 *   logout() → Promise<void>
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const mountedRef    = useRef(true)
  const lastActivityRef = useRef(Date.now())   // timestamp de última actividad del usuario
  const tokenExpiresRef = useRef(null)          // timestamp de expiración del access token
  const idleTimerRef  = useRef(null)
  const isLoggedInRef = useRef(false)

  // ── Actividad del usuario ─────────────────────────────────────────────────
  function handleActivity() {
    lastActivityRef.current = Date.now()
  }

  // ── Gestión de timers ─────────────────────────────────────────────────────
  function startIdleWatcher() {
    stopIdleWatcher()
    const IDLE_MS = getIdleMs()
    // Revisar cada minuto
    idleTimerRef.current = setInterval(async () => {
      if (!isLoggedInRef.current) return
      const now = Date.now()
      const idleSince = now - lastActivityRef.current

      if (idleSince >= IDLE_MS) {
        // El usuario estuvo inactivo más del tiempo permitido → cerrar sesión
        doLogout()
        return
      }

      // Si el token está por vencer y el usuario estuvo activo en los últimos IDLE_MS → refrescar
      if (
        tokenExpiresRef.current &&
        tokenExpiresRef.current - now < TOKEN_REFRESH_THRESHOLD_MS
      ) {
        await doRefresh()
      }
    }, 60 * 1000)
  }

  function stopIdleWatcher() {
    if (idleTimerRef.current) {
      clearInterval(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }

  // ── Refresh del token ─────────────────────────────────────────────────────
  async function doRefresh() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.accessToken) {
          setAccessToken(data.accessToken)
          setTokenExpiry(data.accessToken)
        }
      } else {
        // Backend rechazó el refresh (idle superado o token revocado)
        doLogout()
      }
    } catch {
      // Error de red transitorio: no cerrar sesión, reintentará en el próximo ciclo
    }
  }

  // Extraer la expiración del JWT (sin verificar firma — solo para scheduling)
  function setTokenExpiry(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp) tokenExpiresRef.current = payload.exp * 1000
    } catch {
      // Si falla el parse, asumir que vence en AUTH_IDLE_MINUTES desde ahora
      tokenExpiresRef.current = Date.now() + getIdleMs()
    }
  }

  // ── Logout centralizado ───────────────────────────────────────────────────
  function doLogout() {
    isLoggedInRef.current = false
    stopIdleWatcher()
    setAccessToken(null)
    if (mountedRef.current) setUser(null)
    // Intentar revocar en el servidor (fire-and-forget)
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {})
  }

  // ── Efectos ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setUnauthenticatedCallback(() => {
      isLoggedInRef.current = false
      stopIdleWatcher()
      setAccessToken(null)
      if (mountedRef.current) setUser(null)
    })

    restoreSession()

    // Escuchar eventos de actividad del usuario
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll']
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))

    return () => {
      mountedRef.current = false
      stopIdleWatcher()
      events.forEach(e => window.removeEventListener(e, handleActivity))
    }
  }, [])

  function onSessionEstablished(accessToken, userData) {
    isLoggedInRef.current = true
    lastActivityRef.current = Date.now()
    setAccessToken(accessToken)
    setTokenExpiry(accessToken)
    if (mountedRef.current) setUser(userData ?? null)
    startIdleWatcher()
  }

  async function restoreSession() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.accessToken && mountedRef.current) {
          onSessionEstablished(data.accessToken, data.user)
        }
      }
    } catch {
      // Sin sesión previa o servidor no disponible → usuario irá al login
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Credenciales incorrectas')
    }

    const data = await res.json()
    onSessionEstablished(data.accessToken, data.user)
    return data.user ?? null
  }, [])

  const logout = useCallback(async () => {
    isLoggedInRef.current = false
    stopIdleWatcher()
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch {
      // Ignorar errores de red al hacer logout
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook para acceder al contexto de autenticación.
 * Debe usarse dentro de <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
