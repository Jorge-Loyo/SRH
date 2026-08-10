/**
 * API Client — wrapper de fetch con manejo automático de JWT
 *
 * Flujo de tokens:
 * - accessToken: guardado en memoria (esta variable). Se pierde al recargar.
 * - refreshToken: guardado en cookie httpOnly por el servidor (AUTH_COOKIES=true).
 *   Al recargar la página, AuthContext llama a tryRefresh() para restaurarlo.
 *
 * En cada request:
 *   1. Agrega Authorization: Bearer <token>
 *   2. Si recibe 401, intenta refresh automático y reintenta la request original
 *   3. Si el refresh también falla, llama a _onUnauthenticated (limpia el estado de auth)
 */

let _accessToken = null

// Callback que AuthContext registra para limpiar el estado cuando la sesión expira
let _onUnauthenticated = null

export function setAccessToken(token) {
  _accessToken = token
}

export function getAccessToken() {
  return _accessToken
}

export function setUnauthenticatedCallback(fn) {
  _onUnauthenticated = fn
}

// -----------------------------------------------------------
// Internos
// -----------------------------------------------------------

let _isRefreshing = false
let _refreshQueue = []  // Requests en espera mientras se refresca

function processRefreshQueue(success) {
  _refreshQueue.forEach((resolve) => resolve(success))
  _refreshQueue = []
}

async function tryRefresh() {
  if (_isRefreshing) {
    // Si ya hay un refresh en curso, esperar a que termine
    return new Promise((resolve) => {
      _refreshQueue.push(resolve)
    })
  }

  _isRefreshing = true
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    if (!res.ok) {
      processRefreshQueue(false)
      return false
    }

    const data = await res.json()
    if (data.accessToken) {
      setAccessToken(data.accessToken)
      processRefreshQueue(true)
      return true
    }

    processRefreshQueue(false)
    return false
  } catch {
    processRefreshQueue(false)
    return false
  } finally {
    _isRefreshing = false
  }
}

// -----------------------------------------------------------
// Función base de fetch
// -----------------------------------------------------------

export async function apiFetch(path, options = {}) {
  // FormData necesita que el browser fije el Content-Type (con boundary) solo
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
    ...(options.headers ?? {}),
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  })

  // Si 401 y no es una ruta de auth (evitar loop infinito), intentar refresh
  if (res.status === 401 && !path.includes('/api/auth/')) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiFetch(path, options)  // Reintentar con el nuevo token
    }
    // Refresh fallido: sesión expirada
    _onUnauthenticated?.()
    return res
  }

  return res
}

// -----------------------------------------------------------
// Métodos semánticos
// -----------------------------------------------------------

export async function apiGet(path, params = {}) {
  const url = new URL(path, window.location.origin)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v))
    }
  })

  const res = await apiFetch(url.pathname + url.search)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(res.status, body.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiPost(path, body = {}) {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = err.issues?.map(i => i.message).join(', ')
    throw new ApiError(res.status, detail || err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiPut(path, body = {}) {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const detail = err.issues?.map(i => i.message).join(', ')
    throw new ApiError(res.status, detail || err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiUpload(path, formData) {
  const res = await apiFetch(path, { method: 'POST', body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiDelete(path) {
  const res = await apiFetch(path, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.error || `Error ${res.status}`)
  }
  return res.json()
}

export async function apiPatch(path, body) {
  const res = await apiFetch(path, {
    method: 'PATCH',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new ApiError(res.status, err.error || `Error ${res.status}`)
  }
  return res.json()
}

// -----------------------------------------------------------
// Error tipado para facilitar manejo en componentes
// -----------------------------------------------------------

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
