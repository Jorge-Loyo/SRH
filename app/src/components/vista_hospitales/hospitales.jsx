import React, { useEffect, useState } from 'react'
import { Box, H3, Text } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import HospitalSelector from '../reutilizables/HospitalSelector'
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { hospitals } from '../datos-comunes/hospitals-data'

// Cache en memoria con TTL (5 minutos = 300000ms)
// Estructura: hospitalId -> { recommended, ts }
const periodosCache = new Map()
const PERIODO_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Obtiene período recomendado del cache si es válido (no expirado)
 * @param {string} hospitalId
 * @returns {string|null} Período recomendado o null si cache inválido/expirado
 */
function getCachedPeriodo(hospitalId) {
  const cached = periodosCache.get(hospitalId)
  if (cached && Date.now() - cached.ts < PERIODO_CACHE_TTL) {
    return cached.rec
  }
  // Cache expirado o no existe
  if (cached) periodosCache.delete(hospitalId)
  return null
}

const Hospitales = () => {
  const [recommended, setRecommended] = useState({})
  const [loaded, setLoaded] = useState(false)
  const { error, handleError, clearError } = useErrorHandler()

  useEffect(() => {
    let canceled = false
    async function loadAll(){
      try {
        // Pre-cargar desde cache si existe (validando TTL)
        const cachedMap = {}
        hospitals.forEach(h => {
          const cached = getCachedPeriodo(h.id)
          if (cached) cachedMap[h.id] = cached
        })
        if (!canceled && Object.keys(cachedMap).length) {
          setRecommended(cachedMap)
          setLoaded(true)
        }

        // Traer todos igualmente (refresco) y actualizar cache/estado
        const results = await Promise.all(
          hospitals.map(h => fetch(`/api/periodos?hospital=${encodeURIComponent(h.id)}`)
            .then(r => r.ok ? r.json() : null)
            .then(j => ({ id: h.id, rec: j?.recommended || '' }))
            .catch(() => ({ id: h.id, rec: '' }))
          )
        )
        if (canceled) return
        const map = { ...cachedMap }
        results.forEach(r => {
          if (r.rec) {
            map[r.id] = r.rec
            periodosCache.set(r.id, { rec: r.rec, ts: Date.now() })
          }
        })
        setRecommended(map)
        setLoaded(true)
      } catch (e) {
        if (!canceled) {
          handleError(e, 'Hospitales.loadAll')
          setLoaded(true)
        }
      }
      clearError()
    }
    loadAll()
    return () => {
      canceled = true
      // Limpiar cache al desmontar para evitar memory leaks
      periodosCache.clear()
    }
  }, [])

  if (error) {
    return <ErrorFallback error={error} onRetry={() => window.location.reload()} componentName="Hospitales" />
  }

  const handleSelectHospital = (hospital) => {
    const rec = recommended[hospital.id]
    const url = `/admin/pages/OrganizacionTabla?hospital=${encodeURIComponent(hospital.id)}${rec ? `&periodo=${encodeURIComponent(rec)}` : ''}`
    window.location.href = url
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
        <HospitalSelector
          hospitals={hospitals}
          onSelect={handleSelectHospital}
          title="Hospitales"
          subtitle="Seleccione un hospital para ver su organización"
          groupBy="category"
        />
      </Box>
      <UserInfo />
    </Box>
  )
}

export default Hospitales
