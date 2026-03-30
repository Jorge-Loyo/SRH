/**
 * PeriodoSelector - Componente reutilizable para selección de periodos
 * 
 * Funcionalidades:
 * - Fetch automático de periodos disponibles desde /api/periodos
 * - Autoselección del último periodo con datos (recommended)
 * - Indicadores visuales (✓ con datos, ⚠️ sin datos)
 * - Sincronización con URL query params
 * 
 * @param {string} hospital - Código del hospital para filtrar periodos
 * @param {string} periodo - Periodo seleccionado actual (controlled)
 * @param {function} onPeriodoChange - Callback cuando cambia el periodo
 */

import React, { useEffect, useState } from 'react'
import { Box, Text, Label } from '@adminjs/design-system'

// === UTILIDADES URL ===
function getSearchParams() {
  try { return new URLSearchParams(window.location.search) } catch { return new URLSearchParams() }
}

function updateUrlParams(params) {
  const usp = getSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') usp.delete(key)
    else usp.set(key, value)
  })
  const newUrl = window.location.pathname + (usp.toString() ? '?' + usp.toString() : '')
  window.history.replaceState({}, '', newUrl)
}

// === FETCH PERIODOS ===
async function fetchPeriodos(hospital) {
  const url = '/api/periodos' + (hospital ? '?hospital=' + encodeURIComponent(hospital) : '')
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error cargando periodos')
  return res.json()
}

// === COMPONENTE ===
const PeriodoSelector = ({ hospital, periodo: periodoProp, onPeriodoChange }) => {
  const [data, setData] = useState({ 
    loading: true, 
    items: [], 
    periodsMetadata: [],
    error: null, 
    currentPeriod: null, 
    hasCurrent: false, 
    recommended: null 
  })
  const [autoApplied, setAutoApplied] = useState(false)

  // Fetch de periodos al montar o cambiar hospital
  useEffect(() => {
    let mounted = true
    setData(d => ({ ...d, loading: true, error: null }))
    
    fetchPeriodos(hospital)
      .then(json => {
        if (!mounted) return
        
        // Asegurar que currentPeriod esté en items aunque no tenga datos
        let items = json.items || []
        const periodsMetadata = json.periodsMetadata || []
        const currentPeriod = json.currentPeriod || null
        
        if (currentPeriod && !items.includes(currentPeriod)) {
          items = [currentPeriod, ...items]
          periodsMetadata.unshift({ periodo: currentPeriod, hasData: false, isCurrent: true })
        }
        
        setData({ 
          loading: false, 
          items, 
          periodsMetadata,
          error: null, 
          currentPeriod, 
          hasCurrent: !!json.hasCurrent, 
          recommended: json.recommended || null 
        })
      })
      .catch(e => {
        if (!mounted) return
        setData(d => ({ ...d, loading: false, error: e.message || 'Error cargando periodos' }))
      })
    
    return () => { mounted = false }
  }, [hospital])

  // Auto-aplicar recommended SOLO en primera carga si NO hay periodoProp
  useEffect(() => {
    if (data.loading || !data.recommended || autoApplied) return
    if (periodoProp) return  // Si el padre ya especificó un periodo, no autoseleccionar
    
    // Solo autoseleccionar en primera carga
    updateUrlParams({ periodo: data.recommended })
    if (typeof onPeriodoChange === 'function') {
      onPeriodoChange(data.recommended)
    }
    setAutoApplied(true)
  }, [data.loading, data.recommended, autoApplied, periodoProp])

  // Handler de cambio manual del usuario
  function onChange(e) {
    const value = e.target.value
    updateUrlParams({ periodo: value })
    if (typeof onPeriodoChange === 'function') onPeriodoChange(value)
  }

  // Obtener metadata de un periodo (para iconos)
  const getPeriodMetadata = (periodo) => {
    return data.periodsMetadata.find(pm => pm.periodo === periodo) || { hasData: true, isCurrent: false }
  }

  // === RENDER ===
  return (
    <Box>
      <Label style={{ fontWeight: 600, marginBottom: 8, display: 'block', fontSize: 13 }}>
        Período
      </Label>
      
      {data.loading ? (
        <Text color="subtle" style={{ fontSize: 13 }}>Cargando periodos…</Text>
      ) : data.error ? (
        <Text color="danger" style={{ fontSize: 13 }}>{String(data.error)}</Text>
      ) : !data.items.length ? (
        <Text color="subtle" style={{ fontSize: 13 }}>Sin periodos disponibles</Text>
      ) : (
        <select
          value={periodoProp || ''}
          onChange={onChange}
          style={{ 
            width: '100%', 
            border: '1px solid #ced4da', 
            borderRadius: 4, 
            padding: '8px 10px', 
            background: '#fff', 
            color: '#333', 
            fontSize: 13,
            fontWeight: 400,
            cursor: 'pointer'
          }}
        >
          {data.items.map(p => {
            const meta = getPeriodMetadata(p)
            const icon = meta.hasData ? '✓' : '⚠️'
            const label = `${icon} ${p}`
            return <option key={p} value={p}>{label}</option>
          })}
        </select>
      )}
    </Box>
  )
}

export default PeriodoSelector
