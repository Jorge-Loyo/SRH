import React, { useEffect, useState } from 'react'
import { Box } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import HospitalSelector from '../reutilizables/HospitalSelector'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { hospitals } from '../datos-comunes/hospitals-data'

// Cache simple en memoria por sesión
const periodosCache = new Map() // key: hospitalId -> { recommended, ts }

const RecorridasHospitales = () => {
  const [recommended, setRecommended] = useState({})
  const [loaded, setLoaded] = useState(false)
  const { error, handleError, clearError } = useErrorHandler()

  useEffect(() => {
    let canceled = false
    async function loadAll(){
      try {
        // Pre-cargar desde cache si existe
        const cachedMap = {}
        hospitals.forEach(h => {
          const c = periodosCache.get(h.id)
          if (c && c.rec) cachedMap[h.id] = c.rec
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
        clearError()
      } catch (e) {
        if (!canceled) {
          handleError(e, 'RecorridasHospitales.loadAll')
          setLoaded(true)
        }
      }
    }
    loadAll()
    return () => { canceled = true }
  }, [])

  if (error) {
    return <ErrorFallback error={error} onRetry={() => window.location.reload()} componentName="RecorridasHospitales" />
  }

  const handleSelectHospital = (hospital) => {
    const rec = recommended[hospital.id]
    const url = `/admin/pages/RecorridasDetalle?hospital=${encodeURIComponent(hospital.id)}${rec ? `&periodo=${encodeURIComponent(rec)}` : ''}`
    window.location.href = url
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
        <HospitalSelector
          hospitals={hospitals}
          onSelect={handleSelectHospital}
          title="Recorridas"
          subtitle="Seleccione un hospital para ver o crear recorridas"
          groupBy="category"
        />
      </Box>
      <UserInfo />
    </Box>
  )
}

export default RecorridasHospitales
