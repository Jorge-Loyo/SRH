import { useState, useEffect, useCallback, useRef } from 'react'
import { apiGet, ApiError } from '../api/client.js'

/**
 * Hook genérico para fetch de datos.
 * @param {string|null} path - Ruta de la API. Si es null no hace fetch.
 * @param {object} params - Query params
 * @param {Array} deps - Dependencias adicionales para re-fetch
 */
export function useApi(path, params = {}, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(!!path)
  const [error, setError]     = useState(null)
  const mountedRef            = useRef(true)

  const fetch = useCallback(async (overrideParams) => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiGet(path, overrideParams ?? params)
      if (mountedRef.current) setData(result)
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof ApiError ? `Error ${e.status}: ${e.message}` : e.message)
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  useEffect(() => {
    mountedRef.current = true
    fetch()
    return () => { mountedRef.current = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
