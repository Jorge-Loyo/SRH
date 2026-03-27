import { useState, useCallback } from 'react'

/**
 * Hook para manejar errores de forma centralizada en componentes
 * Tipos de errores soportados:
 * - CONNECTION_ERROR: Falla de conexión al servidor
 * - FETCH_ERROR: Error al traer datos
 * - VALIDATION_ERROR: Error de validación
 * - PARSE_ERROR: Error al parsear JSON
 * - TIMEOUT_ERROR: Request timeouteó
 * - UNKNOWN_ERROR: Error desconocido
 */
export function useErrorHandler() {
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const categorizeError = useCallback((err) => {
    if (!err) return { type: 'UNKNOWN_ERROR', message: 'Error desconocido' }

    // Error de conexión/red
    if (err.message === 'Failed to fetch' || err.message.includes('ERR_INTERNET_DISCONNECTED')) {
      return { 
        type: 'CONNECTION_ERROR', 
        message: 'No hay conexión con el servidor. Verifica tu internet e intenta de nuevo.',
        isRecoverable: true 
      }
    }

    // Error de timeout
    if (err.message.includes('timeout') || err.code === 'ECONNABORTED') {
      return { 
        type: 'TIMEOUT_ERROR', 
        message: 'La solicitud tardó demasiado. Intenta de nuevo.',
        isRecoverable: true 
      }
    }

    // Error de parseo JSON (BD o servidor no responde bien)
    if (err instanceof SyntaxError) {
      return { 
        type: 'PARSE_ERROR', 
        message: 'El servidor devolvió una respuesta inválida. Contacta a soporte.',
        isRecoverable: false 
      }
    }

    // Error HTTP (status code)
    if (err.status) {
      if (err.status === 401) {
        return { 
          type: 'AUTH_ERROR', 
          message: 'Tu sesión expiró. Por favor, inicia sesión de nuevo.',
          isRecoverable: false 
        }
      }
      if (err.status === 403) {
        return { 
          type: 'PERMISSION_ERROR', 
          message: 'No tienes permisos para acceder a esto.',
          isRecoverable: false 
        }
      }
      if (err.status === 404) {
        return { 
          type: 'NOT_FOUND', 
          message: 'El recurso no existe.',
          isRecoverable: false 
        }
      }
      if (err.status >= 500) {
        return { 
          type: 'SERVER_ERROR', 
          message: 'Error en el servidor. Intenta más tarde.',
          isRecoverable: true 
        }
      }
      if (err.status >= 400) {
        return { 
          type: 'VALIDATION_ERROR', 
          message: err.message || 'Datos inválidos. Verifica e intenta de nuevo.',
          isRecoverable: true 
        }
      }
    }

    // Error genérico
    return { 
      type: 'UNKNOWN_ERROR', 
      message: err.message || 'Error desconocido',
      isRecoverable: true 
    }
  }, [])

  const handleError = useCallback((err, context = '') => {
    const categorized = categorizeError(err)
    // Log solo en consola del navegador (no usar require() en frontend)
    console.error(`[${context}]`, { 
      error: err?.message, 
      type: categorized.type,
      stack: err?.stack 
    })
    setError(categorized)
    return categorized
  }, [categorizeError])

  const clearError = useCallback(() => setError(null), [])

  return {
    error,
    isLoading,
    setIsLoading,
    handleError,
    clearError,
    categorizeError
  }
}

/**
 * Wrapper para API calls con manejo de errores automático
 */
export async function fetchWithErrorHandling(url, options = {}) {
  const timeout = options.timeout || 30000 // 30s default

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const err = new Error(response.statusText)
      err.status = response.status
      try {
        err.data = await response.json()
      } catch {}
      throw err
    }

    return await response.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('Request timeout')
      timeoutErr.code = 'ECONNABORTED'
      throw timeoutErr
    }
    throw err
  }
}
