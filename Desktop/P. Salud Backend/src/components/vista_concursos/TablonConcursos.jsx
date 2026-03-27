import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Box, H2, H3, H4, Text, Button } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ConcursosDetailModal from './ConcursosDetailModal'
import { normalizarEstado, getColorEstado } from '../../utils/concursosHelpers'
import { validateConcursos } from '../../utils/concursoValidators'
import { handleHttpResponse } from '../../utils/httpErrorHandler'
import logger from '../../utils/logger-frontend'

const TablonConcursos = () => {
  // Obtener hospitalId del URL query parameter (memoizado para evitar recálculos)
  const getParam = useCallback((name) => {
    try {
      const usp = new URLSearchParams(window.location.search)
      return usp.get(name) || ''
    } catch {
      return ''
    }
  }, [])

  const hospitalId = getParam('hospital') || 'HGACA'
  const hospitalName = getParam('name') || hospitalId

  const [concursos, setConcursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [modoFiltro, setModoFiltro] = useState('BAJA') // BAJA o ALTA
  const [sub_estadosSeleccionados, setSub_estadosSeleccionados] = useState(new Set())
  const [estadosSeleccionados, setEstadosSeleccionados] = useState(new Set())
  const [puestosSeleccionados, setPuestosSeleccionados] = useState(new Set())
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState(new Set())
  const [escalafonesSeleccionados, setEscalafonesSeleccionados] = useState(new Set())
  const [recorridasSeleccionadas, setRecorridasSeleccionadas] = useState(new Set())
  const [openDropdown, setOpenDropdown] = useState(null)
  const [searchEstado, setSearchEstado] = useState('')
  const [searchSubEstado, setSearchSubEstado] = useState('')
  const [searchPuesto, setSearchPuesto] = useState('')
  const [searchEspecialidad, setSearchEspecialidad] = useState('')
  const [searchEscalafon, setSearchEscalafon] = useState('')
  const [searchRecorridas, setSearchRecorridas] = useState('')
  const [cuilBusqueda, setCuilBusqueda] = useState('')

  // ✅ Debounce para búsqueda CUIL sin dependencia externa
  const debounceTimerRef = useRef(null)
  const debouncedSetCuil = useCallback((value) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setCuilBusqueda(value)
    }, 300)
  }, [])

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      // Si el clic fue fuera de cualquier dropdown, cerrar
      if (openDropdown && !event.target.closest('.dropdown-container')) {
        setOpenDropdown(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  useEffect(() => {
    const abortController = new AbortController()
    
    async function cargar() {
      try {
        setLoading(true)
        setError(null)
        // Cargar todos los concursos del hospital con paginación
        let allConcursos = []
        let offset = 0
        const limit = 500
        let hasMore = true
        let iterations = 0
        const maxIterations = 20 // Límite de seguridad (20 * 500 = 10,000 registros)
        
        while (hasMore && !abortController.signal.aborted && iterations < maxIterations) {
          const response = await fetch(`/api/concursos?sigla=${encodeURIComponent(hospitalId)}&limit=${limit}&offset=${offset}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal
          })
          
          // Manejo de errores HTTP mejorado
          try {
            await handleHttpResponse(response, 'Concursos')
          } catch (httpError) {
            throw httpError
          }
          
          const data = await response.json()
          const batch = data.data || []
          
          // Validar datos frontend para evitar datos malformados
          const validatedBatch = validateConcursos(batch)
          if (validatedBatch.length < batch.length) {
            logger.warn('[TablonConcursos] Some concursos were filtered out during validation', {
              total: batch.length,
              valid: validatedBatch.length,
              invalid: batch.length - validatedBatch.length
            })
          }
          
          allConcursos = [...allConcursos, ...validatedBatch]
          
          // Si trajo menos de limit, ya no hay más
          hasMore = validatedBatch.length === limit
          offset += limit
          iterations++
        }
        
        if (!abortController.signal.aborted) {
          setConcursos(allConcursos)
          logger.info('[TablonConcursos] Loaded concursos successfully', {
            hospital: hospitalId,
            total: allConcursos.length
          })
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(e.message)
          logger.error('[TablonConcursos] Error loading concursos', {
            error: e.message,
            hospital: hospitalId
          })
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false)
      }
    }
    cargar()
    return () => { abortController.abort() }
  }, [hospitalId])

  // Memoizar CUIL búsqueda normalizado para evitar cálculos repetidos
  const cuilBusquedaNormalizado = useMemo(() => cuilBusqueda.trim().toLowerCase(), [cuilBusqueda])

  // Agrupar por sub_estado para estadísticas - MEMOIZADO
  const estadisticas = useMemo(() => {
    return concursos.reduce((acc, c) => {
      const estado = normalizarEstado(c.sub_estado || 'SIN ESTADO')
      if (!acc[estado]) {
        acc[estado] = 0
      }
      acc[estado] += 1
      return acc
    }, {})
  }, [concursos])

  const datosEstados = useMemo(
    () => Object.entries(estadisticas).map(([name, value]) => ({ name, value })),
    [estadisticas]
  )

  // Helper: Filtrar con todos los filtros EXCEPTO uno específico - MEMOIZADO
  const filtrarSinFiltro = useCallback((excluirFiltro) => {
    return concursos.filter(c => {
      const sub_estadoNormalizado = normalizarEstado(c.sub_estado)
      
      if (excluirFiltro !== 'estado') {
        if (estadosSeleccionados.size > 0 && !estadosSeleccionados.has(c.estado)) return false
      }
      if (excluirFiltro !== 'sub_estado') {
        if (sub_estadosSeleccionados.size > 0 && !sub_estadosSeleccionados.has(sub_estadoNormalizado)) return false
      }
      if (excluirFiltro !== 'puesto') {
        const puesto = modoFiltro === 'BAJA' ? c.puesto_baja : c.puesto_alta
        if (puestosSeleccionados.size > 0 && !puestosSeleccionados.has(puesto)) return false
      }
      if (excluirFiltro !== 'especialidad') {
        const especialidad = modoFiltro === 'BAJA' ? c.especialidad_baja : c.especialidad_solicitada_de_alta
        if (especialidadesSeleccionadas.size > 0 && !especialidadesSeleccionadas.has(especialidad)) return false
      }
      if (excluirFiltro !== 'escalafon') {
        const escalafon = modoFiltro === 'BAJA' ? c.escalafon_baja : c.escalafon_concurso
        if (escalafonesSeleccionados.size > 0 && !escalafonesSeleccionados.has(escalafon)) return false
      }
      if (excluirFiltro !== 'cuil') {
        if (cuilBusquedaNormalizado) {
          if (!(c.cuil_baja && c.cuil_baja.toLowerCase().includes(cuilBusquedaNormalizado)) &&
              !(c.cuil_designacion && c.cuil_designacion.toLowerCase().includes(cuilBusquedaNormalizado))) {
            return false
          }
        }
      }
      return true
    })
  }, [concursos, estadosSeleccionados, sub_estadosSeleccionados, puestosSeleccionados, especialidadesSeleccionadas, escalafonesSeleccionados, modoFiltro, cuilBusquedaNormalizado])

  // Obtener valores únicos considerando otros filtros aplicados - MEMOIZADO
  const estadosUnicos = useMemo(() => 
    Array.from(new Set(filtrarSinFiltro('estado').map(c => c.estado).filter(Boolean))).sort(),
    [filtrarSinFiltro]
  )

  const subEstadosFiltrados = useMemo(() => 
    Array.from(new Set(filtrarSinFiltro('sub_estado').map(c => normalizarEstado(c.sub_estado || 'SIN')).filter(Boolean))).sort(),
    [filtrarSinFiltro]
  )

  const puestosUnicos = useMemo(() => 
    Array.from(new Set(
      filtrarSinFiltro('puesto').map(c => modoFiltro === 'BAJA' ? c.puesto_baja : c.puesto_alta).filter(Boolean)
    )).sort(),
    [filtrarSinFiltro, modoFiltro]
  )

  const especialidadesUnicas = useMemo(() => 
    Array.from(new Set(
      filtrarSinFiltro('especialidad').map(c => modoFiltro === 'BAJA' ? c.especialidad_baja : c.especialidad_solicitada_de_alta).filter(Boolean)
    )).sort(),
    [filtrarSinFiltro, modoFiltro]
  )

  const escalafonesUnicos = useMemo(() => 
    Array.from(new Set(
      filtrarSinFiltro('escalafon').map(c => modoFiltro === 'BAJA' ? c.escalafon_baja : c.escalafon_concurso).filter(Boolean)
    )).sort(),
    [filtrarSinFiltro, modoFiltro]
  )

  const recorridasUnicas = useMemo(() => 
    Array.from(new Set(
      filtrarSinFiltro('recorridas').map(c => c.recorridas).filter(Boolean)
    )).sort(),
    [filtrarSinFiltro]
  )

  // Filtrar por sub_estado, estado, puesto, especialidad, escalafon y CUIL - MEMOIZADO
  const concursosFiltrados = useMemo(() => {
    return concursos.filter(c => {
      const sub_estadoNormalizado = normalizarEstado(c.sub_estado)
      const matchSubEstado = sub_estadosSeleccionados.size === 0 || sub_estadosSeleccionados.has(sub_estadoNormalizado)
      const matchEstado = estadosSeleccionados.size === 0 || estadosSeleccionados.has(c.estado)
      
      // Filtrar por puesto según el modo
      const matchPuesto = puestosSeleccionados.size === 0 || 
        puestosSeleccionados.has(modoFiltro === 'BAJA' ? c.puesto_baja : c.puesto_alta)
      
      // Filtrar por especialidad según el modo
      const matchEspecialidad = especialidadesSeleccionadas.size === 0 || 
        especialidadesSeleccionadas.has(modoFiltro === 'BAJA' ? c.especialidad_baja : c.especialidad_solicitada_de_alta)
      
      // Filtrar por escalafón según el modo
      const matchEscalafon = escalafonesSeleccionados.size === 0 || 
        escalafonesSeleccionados.has(modoFiltro === 'BAJA' ? c.escalafon_baja : c.escalafon_concurso)
      
      // Filtrar por recorridas
      const matchRecorridas = recorridasSeleccionadas.size === 0 || 
        recorridasSeleccionadas.has(c.recorridas)
      
      // Búsqueda de CUIL en ambas columnas
      const matchCuil = !cuilBusquedaNormalizado || 
        (c.cuil_baja && c.cuil_baja.toLowerCase().includes(cuilBusquedaNormalizado)) ||
        (c.cuil_designacion && c.cuil_designacion.toLowerCase().includes(cuilBusquedaNormalizado))
      
      return matchSubEstado && matchEstado && matchPuesto && matchEspecialidad && matchEscalafon && matchRecorridas && matchCuil
    })
  }, [concursos, sub_estadosSeleccionados, estadosSeleccionados, puestosSeleccionados, especialidadesSeleccionadas, escalafonesSeleccionados, recorridasSeleccionadas, modoFiltro, cuilBusquedaNormalizado])

  // Handlers para checkboxes - memoizados para evitar recreación en cada render
  const toggleSubEstado = useCallback((estado) => {
    setSub_estadosSeleccionados(prev => {
      const newSet = new Set(prev)
      if (newSet.has(estado)) {
        newSet.delete(estado)
      } else {
        newSet.add(estado)
      }
      return newSet
    })
  }, [])

  const toggleEstado = useCallback((estado) => {
    setEstadosSeleccionados(prev => {
      const newSet = new Set(prev)
      if (newSet.has(estado)) {
        newSet.delete(estado)
      } else {
        newSet.add(estado)
      }
      return newSet
    })
  }, [])

  const togglePuesto = useCallback((puesto) => {
    setPuestosSeleccionados(prev => {
      const newSet = new Set(prev)
      if (newSet.has(puesto)) {
        newSet.delete(puesto)
      } else {
        newSet.add(puesto)
      }
      return newSet
    })
  }, [])

  const toggleEspecialidad = useCallback((esp) => {
    setEspecialidadesSeleccionadas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(esp)) {
        newSet.delete(esp)
      } else {
        newSet.add(esp)
      }
      return newSet
    })
  }, [])

  const toggleEscalafon = useCallback((escalafon) => {
    setEscalafonesSeleccionados(prev => {
      const newSet = new Set(prev)
      if (newSet.has(escalafon)) {
        newSet.delete(escalafon)
      } else {
        newSet.add(escalafon)
      }
      return newSet
    })
  }, [])

  const toggleRecorridas = useCallback((recorrida) => {
    setRecorridasSeleccionadas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recorrida)) {
        newSet.delete(recorrida)
      } else {
        newSet.add(recorrida)
      }
      return newSet
    })
  }, [])

  // Agrupar por sub_estado, puesto_baja, especialidad_baja - MEMOIZADO
  const grupos = useMemo(() => {
    const tablasAgrupadas = concursosFiltrados.reduce((acc, c) => {
      const estadoNormalizado = normalizarEstado(c.sub_estado || 'SIN')
      const key = `${estadoNormalizado}|${c.puesto_baja || 'SIN'}|${c.especialidad_baja || 'SIN'}`
      if (!acc[key]) {
        acc[key] = {
          sub_estado: estadoNormalizado,
          puesto_baja: c.puesto_baja || 'SIN',
          especialidad_baja: c.especialidad_baja || 'SIN',
          registros: [],
        }
      }
      acc[key].registros.push(c)
      return acc
    }, {})

    // Ordenar registros dentro de cada grupo alfabéticamente por nombre_baja
    Object.values(tablasAgrupadas).forEach(grupo => {
      grupo.registros.sort((a, b) => {
        const nameA = (a.nombre_baja || '').toUpperCase()
        const nameB = (b.nombre_baja || '').toUpperCase()
        return nameA.localeCompare(nameB)
      })
    })

    // Ordenar grupos alfabéticamente por estado, puesto y especialidad
    return Object.values(tablasAgrupadas).sort((a, b) => {
      const keyA = `${a.sub_estado}|${a.puesto_baja}|${a.especialidad_baja}`.toUpperCase()
      const keyB = `${b.sub_estado}|${b.puesto_baja}|${b.especialidad_baja}`.toUpperCase()
      return keyA.localeCompare(keyB)
    })
  }, [concursosFiltrados])

  // Logging de filtros aplicados - para debugging y analytics
  useEffect(() => {
    if (concursosFiltrados.length !== concursos.length || 
        estadosSeleccionados.size > 0 || 
        sub_estadosSeleccionados.size > 0 || 
        puestosSeleccionados.size > 0 || 
        especialidadesSeleccionadas.size > 0 || 
        escalafonesSeleccionados.size > 0 ||
        cuilBusqueda.trim()) {
      logger.info('[TablonConcursos] Filtros aplicados', {
        total: concursos.length,
        filtered: concursosFiltrados.length,
        estados: Array.from(estadosSeleccionados),
        subEstados: Array.from(sub_estadosSeleccionados),
        puestos: Array.from(puestosSeleccionados),
        especialidades: Array.from(especialidadesSeleccionadas),
        escalafones: Array.from(escalafonesSeleccionados),
        cuilBusqueda: cuilBusqueda.trim() ? '***' : 'none', // Ocultar CUIL por privacidad
        modoFiltro
      })
    }
  }, [concursosFiltrados, concursos, estadosSeleccionados, sub_estadosSeleccionados, puestosSeleccionados, especialidadesSeleccionadas, escalafonesSeleccionados, cuilBusqueda, modoFiltro])

  if (loading) {
    return (
      <Box p="lg">
        <BackButton />
        <Text>Cargando datos...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box p="lg">
        <BackButton />
        <Box p="lg" style={{ background: '#fee', borderRadius: 8, border: '1px solid #fcc', color: '#c33' }}>
          <H3 style={{ margin: '0 0 8px 0' }}>Error</H3>
          <Text>{error}</Text>
        </Box>
      </Box>
    )
  }

  const totalConcursos = concursos.length

  return (
    <Box p="lg">
      <BackButton />

      <Box mb="lg">
        <H2>{hospitalName} - Gestión de Concursos</H2>
      </Box>

      {totalConcursos === 0 ? (
        <Box
          p="lg"
          style={{
            border: '1px dashed #ddd',
            borderRadius: 8,
            textAlign: 'center',
            background: '#f9f9f9',
          }}
        >
          <Text style={{ fontSize: 14, opacity: 0.6 }}>No hay concursos registrados para este hospital</Text>
        </Box>
      ) : (
        <Box>
          {/* ESTADÍSTICAS POR ESTADO */}
          <Box mb="lg" style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            <H3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Estadísticas por Estado</H3>
            <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {datosEstados.map((est) => {
                const colorEstado = getColorEstado(est.name)
                return (
                  <Box
                    key={est.name}
                    style={{
                      padding: 16,
                      background: colorEstado.bg,
                      border: `2px solid ${colorEstado.border}`,
                      borderRadius: 8,
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      transform: 'scale(1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    <Text style={{ fontSize: 28, fontWeight: 700, color: colorEstado.text, margin: 0 }}>
                      {est.value}
                    </Text>
                    <Text style={{ fontSize: 11, color: colorEstado.text, margin: '8px 0 0 0', fontWeight: 600, textTransform: 'uppercase' }}>
                      {est.name}
                    </Text>
                  </Box>
                )
              })}
            </Box>
          </Box>

          {/* FILTROS CON DROPDOWNS */}
          <Box
            style={{
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            {/* ENCABEZADO CON TÍTULO Y BOTÓN LIMPIAR FILTROS */}
            <Box
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <H4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Filtros</H4>
              <button
                onClick={() => {
                  setSub_estadosSeleccionados(new Set())
                  setEstadosSeleccionados(new Set())
                  setPuestosSeleccionados(new Set())
                  setEspecialidadesSeleccionadas(new Set())
                  setEscalafonesSeleccionados(new Set())
                  setRecorridasSeleccionadas(new Set())
                }}
                disabled={(sub_estadosSeleccionados.size === 0 && estadosSeleccionados.size === 0 && puestosSeleccionados.size === 0 && especialidadesSeleccionadas.size === 0 && escalafonesSeleccionados.size === 0 && recorridasSeleccionadas.size === 0)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #ff6b6b',
                  background: (sub_estadosSeleccionados.size > 0 || estadosSeleccionados.size > 0 || puestosSeleccionados.size > 0 || especialidadesSeleccionadas.size > 0 || escalafonesSeleccionados.size > 0 || recorridasSeleccionadas.size > 0) ? '#fff' : '#f5f5f5',
                  color: (sub_estadosSeleccionados.size > 0 || estadosSeleccionados.size > 0 || puestosSeleccionados.size > 0 || especialidadesSeleccionadas.size > 0 || escalafonesSeleccionados.size > 0 || recorridasSeleccionadas.size > 0) ? '#ff6b6b' : '#ccc',
                  cursor: (sub_estadosSeleccionados.size > 0 || estadosSeleccionados.size > 0 || puestosSeleccionados.size > 0 || especialidadesSeleccionadas.size > 0 || escalafonesSeleccionados.size > 0 || recorridasSeleccionadas.size > 0) ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                  fontSize: 12,
                  opacity: (sub_estadosSeleccionados.size > 0 || estadosSeleccionados.size > 0 || puestosSeleccionados.size > 0 || especialidadesSeleccionadas.size > 0) ? 1 : 0.5,
                  transition: 'all 200ms',
                  whiteSpace: 'nowrap',
                }}
              >
                Limpiar filtros
              </button>
            </Box>

            {/* TOGGLE MODO BAJA/ALTA */}
            <Box style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => {
                  setModoFiltro('BAJA')
                  setPuestosSeleccionados(new Set())
                  setEspecialidadesSeleccionadas(new Set())
                  setEscalafonesSeleccionados(new Set())
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: modoFiltro === 'BAJA' ? '#1976d2' : '#f5f5f5',
                  color: modoFiltro === 'BAJA' ? '#fff' : '#666',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  textTransform: 'uppercase',
                }}
              >
                📋 BAJA
              </button>
              <button
                onClick={() => {
                  setModoFiltro('ALTA')
                  setPuestosSeleccionados(new Set())
                  setEspecialidadesSeleccionadas(new Set())
                  setEscalafonesSeleccionados(new Set())
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: modoFiltro === 'ALTA' ? '#388e3c' : '#f5f5f5',
                  color: modoFiltro === 'ALTA' ? '#fff' : '#666',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  textTransform: 'uppercase',
                }}
              >
                🏆 ALTA
              </button>
            </Box>

            <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              {/* DROPDOWN ESTADO (GENERAL) */}
              {estadosUnicos.length > 0 && (
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'estado' ? null : 'estado')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>ESTADO</span>
                    <span style={{ transform: openDropdown === 'estado' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>
                      ▼
                    </span>
                  </button>
                  {openDropdown === 'estado' && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        zIndex: 10,
                        maxHeight: '300px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchEstado}
                        onChange={(e) => setSearchEstado(e.target.value.toLowerCase())}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          borderBottom: '1px solid #eee',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                      <Box style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {estadosUnicos.filter(e => e.toLowerCase().includes(searchEstado)).map((estado) => (
                          <label
                            key={estado}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={estadosSeleccionados.has(estado)}
                              onChange={() => toggleEstado(estado)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <span>{estado}</span>
                          </label>
                        ))}
                      </Box>
                    </Box>
                  )}
                </div>
              )}

              {/* DROPDOWN SUB ESTADO */}
              <div className="dropdown-container" style={{ position: 'relative' }}>
                <button
                  onClick={() => setOpenDropdown(openDropdown === 'sub_estado' ? null : 'sub_estado')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 13,
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>SUB ESTADO</span>
                  <span style={{ transform: openDropdown === 'sub_estado' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>
                    ▼
                  </span>
                </button>
                {openDropdown === 'sub_estado' && (
                  <Box
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderTop: 'none',
                      borderRadius: '0 0 6px 6px',
                      zIndex: 10,
                      maxHeight: '300px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchSubEstado}
                      onChange={(e) => setSearchSubEstado(e.target.value.toLowerCase())}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid #eee',
                        fontSize: 13,
                        boxSizing: 'border-box',
                      }}
                    />
                    <Box style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {datosEstados.filter(e => subEstadosFiltrados.includes(e.name) && e.name.toLowerCase().includes(searchSubEstado)).map((est) => (
                        <label
                          key={est.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            fontSize: 13,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={sub_estadosSeleccionados.has(est.name)}
                            onChange={() => toggleSubEstado(est.name)}
                            style={{ marginRight: 8, cursor: 'pointer' }}
                          />
                          <span>{est.name}</span>
                        </label>
                      ))}
                    </Box>
                  </Box>
                )}
              </div>

              {/* DROPDOWN PUESTO */}
              {puestosUnicos.length > 0 && (
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'puesto' ? null : 'puesto')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>PUESTO {modoFiltro === 'BAJA' ? 'DE BAJA' : 'SOLICITADO'}</span>
                    <span style={{ transform: openDropdown === 'puesto' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>
                      ▼
                    </span>
                  </button>
                  {openDropdown === 'puesto' && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        zIndex: 10,
                        maxHeight: '300px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchPuesto}
                        onChange={(e) => setSearchPuesto(e.target.value.toLowerCase())}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          borderBottom: '1px solid #eee',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                      <Box style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {puestosUnicos.filter(p => p.toLowerCase().includes(searchPuesto)).map((puesto) => (
                          <label
                            key={puesto}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={puestosSeleccionados.has(puesto)}
                              onChange={() => togglePuesto(puesto)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <span>{puesto}</span>
                          </label>
                        ))}
                      </Box>
                    </Box>
                  )}
                </div>
              )}

              {/* DROPDOWN ESPECIALIDAD */}
              {especialidadesUnicas.length > 0 && (
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'especialidad' ? null : 'especialidad')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>ESPECIALIDAD {modoFiltro === 'BAJA' ? 'DE BAJA' : 'SOLICITADA'}</span>
                    <span style={{ transform: openDropdown === 'especialidad' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>
                      ▼
                    </span>
                  </button>
                  {openDropdown === 'especialidad' && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        zIndex: 10,
                        maxHeight: '300px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchEspecialidad}
                        onChange={(e) => setSearchEspecialidad(e.target.value.toLowerCase())}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          borderBottom: '1px solid #eee',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                      <Box style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {especialidadesUnicas.filter(e => e.toLowerCase().includes(searchEspecialidad)).map((esp) => (
                          <label
                            key={esp}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={especialidadesSeleccionadas.has(esp)}
                              onChange={() => toggleEspecialidad(esp)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <span>{esp}</span>
                          </label>
                        ))}
                      </Box>
                    </Box>
                  )}
                </div>
              )}

              {/* DROPDOWN ESCALAFON */}
              {escalafonesUnicos.length > 0 && (
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'escalafon' ? null : 'escalafon')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>ESCALAFON {modoFiltro === 'BAJA' ? 'DE BAJA' : 'DE CONCURSO'}</span>
                    <span style={{ transform: openDropdown === 'escalafon' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>
                      ▼
                    </span>
                  </button>
                  {openDropdown === 'escalafon' && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        zIndex: 10,
                        maxHeight: '300px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchEscalafon}
                        onChange={(e) => setSearchEscalafon(e.target.value.toLowerCase())}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          borderBottom: '1px solid #eee',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                      <Box style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {escalafonesUnicos.filter(e => e.toLowerCase().includes(searchEscalafon)).map((escalafon) => (
                          <label
                            key={escalafon}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={escalafonesSeleccionados.has(escalafon)}
                              onChange={() => toggleEscalafon(escalafon)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <span>{escalafon}</span>
                          </label>
                        ))}
                      </Box>
                    </Box>
                  )}
                </div>
              )}

              {/* DROPDOWN RECORRIDAS */}
              {recorridasUnicas.length > 0 && (
                <div className="dropdown-container" style={{ position: 'relative' }}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'recorridas' ? null : 'recorridas')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: 6,
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>RECORRIDAS</span>
                    <span style={{ transform: openDropdown === 'recorridas' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }}>
                      ▼
                    </span>
                  </button>
                  {openDropdown === 'recorridas' && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderTop: 'none',
                        borderRadius: '0 0 6px 6px',
                        zIndex: 10,
                        maxHeight: '300px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchRecorridas}
                        onChange={(e) => setSearchRecorridas(e.target.value.toLowerCase())}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          borderBottom: '1px solid #eee',
                          fontSize: 13,
                          boxSizing: 'border-box',
                        }}
                      />
                      <Box style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {recorridasUnicas.filter(r => r.toLowerCase().includes(searchRecorridas)).map((recorrida) => (
                          <label
                            key={recorrida}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              fontSize: 13,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={recorridasSeleccionadas.has(recorrida)}
                              onChange={() => toggleRecorridas(recorrida)}
                              style={{ marginRight: 8, cursor: 'pointer' }}
                            />
                            <span>{recorrida}</span>
                          </label>
                        ))}
                      </Box>
                    </Box>
                  )}
                </div>
              )}

              {/* INPUT DE BÚSQUEDA CUIL */}
              <div className="dropdown-container" style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Buscar por CUIL..."
                  defaultValue=""
                  onChange={(e) => debouncedSetCuil(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    background: '#fff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </Box>

            {/* RESUMEN DE DATOS */}
            <Box
              style={{
                background: '#f5f5f5',
                padding: 16,
                borderRadius: 6,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <Box>
                <Text style={{ fontSize: 12, color: '#666', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>
                  Total Concursos
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 700, color: '#1976d2', margin: '4px 0 0 0' }}>
                  {totalConcursos}
                </Text>
              </Box>
              {(sub_estadosSeleccionados.size > 0 || estadosSeleccionados.size > 0 || puestosSeleccionados.size > 0 || especialidadesSeleccionadas.size > 0) && (
                <>
                  <Box>
                    <Text style={{ fontSize: 13, color: '#666', margin: '0 16px' }}>→</Text>
                  </Box>
                  <Box style={{ textAlign: 'right' }}>
                    <Text style={{ fontSize: 12, color: '#666', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>
                      Con Filtros Aplicados
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: 700, color: '#388e3c', margin: '4px 0 0 0' }}>
                      {concursosFiltrados.length}
                    </Text>
                  </Box>
                </>
              )}
            </Box>

            {/* RESUMEN DE FILTROS APLICADOS */}
          </Box>

          {/* GRUPOS DE CONCURSOS */}
          <Box style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {grupos.length === 0 ? (
              <Box p="lg" style={{ background: '#f9f9f9', border: '1px dashed #ddd', borderRadius: 8, textAlign: 'center' }}>
                <Text style={{ opacity: 0.6 }}>No hay concursos con este estado</Text>
              </Box>
            ) : (
              grupos.map((grupo, idx) => {
                const colorEstado = getColorEstado(grupo.sub_estado)
                return (
                  <Box
                    key={idx}
                    style={{
                      background: '#fff',
                      border: `2px solid ${colorEstado.border}`,
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Encabezado del grupo - MEJORADO */}
                    <Box
                      style={{
                        background: colorEstado.bg,
                        borderBottom: `2px solid ${colorEstado.border}`,
                        padding: '16px 20px',
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr auto',
                        gap: 24,
                        alignItems: 'center',
                      }}
                    >
                      {/* BADGE DE ESTADO GRANDE */}
                      <Box
                        style={{
                          padding: '8px 16px',
                          borderRadius: 6,
                          background: '#fff',
                          border: `2px solid ${colorEstado.border}`,
                          textAlign: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
                          Estado
                        </Text>
                        <Text style={{ fontSize: 14, fontWeight: 700, color: colorEstado.text, margin: '4px 0 0 0' }}>
                          {colorEstado.label}
                        </Text>
                      </Box>

                      {/* INFORMACIÓN CENTRAL */}
                      <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
                        <Box>
                          <Text style={{ fontSize: 10, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
                            Puesto de Baja
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: '4px 0 0 0' }}>
                            {grupo.puesto_baja}
                          </Text>
                        </Box>
                        <Box>
                          <Text style={{ fontSize: 10, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
                            Especialidad de Baja
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: '4px 0 0 0' }}>
                            {grupo.especialidad_baja}
                          </Text>
                        </Box>
                        <Box>
                          <Text style={{ fontSize: 10, color: '#999', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>
                            Especialidad de Alta
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: '4px 0 0 0' }}>
                            {grupo.registros[0]?.especialidad_solicitada_de_alta || '-'}
                          </Text>
                        </Box>
                      </Box>

                      {/* CONTADOR */}
                      <Box style={{ textAlign: 'right' }}>
                        <Box
                          style={{
                            padding: '6px 12px',
                            borderRadius: 4,
                            background: colorEstado.text,
                            color: '#fff',
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                            {grupo.registros.length} {grupo.registros.length === 1 ? 'registro' : 'registros'}
                          </Text>
                        </Box>
                      </Box>
                    </Box>

                    {/* Listado de registros - MEJORADO */}
                    <Box style={{ overflowX: 'auto' }}>
                      <table
                        style={{
                          width: '100%',
                          borderCollapse: 'collapse',
                          fontSize: 13,
                        }}
                      >
                        <thead>
                          <tr style={{ background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11 }}>
                              ACCIÓN
                            </th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11 }}>
                              NOMBRE DE BAJA
                            </th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11 }}>
                              EXPEDIENTE DE CONCURSO
                            </th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11 }}>
                              ESTADO
                            </th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11 }}>
                              SORTEO
                            </th>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#666', fontSize: 11 }}>
                              AUTORIZACIÓN
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {grupo.registros.map((rec, ridx) => (
                            <tr
                              key={ridx}
                              onClick={() => setSelectedRecord(rec)}
                              style={{
                                borderBottom: '1px solid #f0f0f0',
                                cursor: 'pointer',
                                background: '#fff',
                                transition: 'all 200ms',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = colorEstado.bg
                                e.currentTarget.style.borderLeft = `4px solid ${colorEstado.border}`
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#fff'
                                e.currentTarget.style.borderLeft = '4px solid transparent'
                              }}
                            >
                              <td style={{ padding: '12px 16px' }}>
                                <button
                                  style={{
                                    padding: '5px 14px',
                                    borderRadius: 4,
                                    background: colorEstado.text,
                                    color: '#fff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    transition: 'opacity 200ms',
                                  }}
                                  onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                                  onMouseLeave={(e) => (e.target.style.opacity = '1')}
                                >
                                  Ver
                                </button>
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                                {rec.nombre_baja || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#666' }}>
                                {rec.ee_concurso || '-'}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1565c0' }}>
                                {rec.estado || '-'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: 4,
                                    background: rec.sorteo_de_jurado ? '#E8F5E9' : '#F5F5F5',
                                    color: rec.sorteo_de_jurado ? '#2e7d32' : '#666',
                                    fontSize: 12,
                                    fontWeight: 600,
                                  }}
                                >
                                  {rec.sorteo_de_jurado ? 'Sí' : 'No'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', color: '#666' }}>
                                {rec.fecha_autorizacion || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </Box>
                  </Box>
                )
              })
            )}
          </Box>
        </Box>
      )}

      {/* MODAL DE DETALLE */}
      {selectedRecord && (
        <ConcursosDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}

      <UserInfo />
    </Box>
  )
}

export default TablonConcursos
