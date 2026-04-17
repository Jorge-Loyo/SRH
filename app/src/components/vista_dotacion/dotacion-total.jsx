import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import BackButton from '../reutilizables/BackButton'
import ErrorFallback from '../reutilizables/ErrorFallback'
import Pagination from '../reutilizables/Pagination'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { ApiClient, useCurrentAdmin } from 'adminjs'
import { Box, H3, H2, Text, Table, TableHead, TableRow, TableCell, TableBody, Button, Icon, Input, Label } from '@adminjs/design-system'
import MultiSelectDropdown from '../reutilizables/multi-select-dropdown'
import UserInfo from '../reutilizables/UserInfo'
import PeriodoSelector from '../reutilizables/periodo-selector'
import TablaAmpliada from '../vista_hospitales/tabla-ampliada'

// CSS para eliminar las flechas de los inputs numéricos
const styleSheet = document.createElement('style')
styleSheet.textContent = `
  input[type="number"].no-spinner::-webkit-outer-spin-button,
  input[type="number"].no-spinner::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"].no-spinner {
    -moz-appearance: textfield;
  }
`
document.head.appendChild(styleSheet)

const DotacionTotal = () => {
  const periodoInicial = (() => {
    try {
      return new URLSearchParams(window.location.search).get('periodo') || ''
    } catch { return '' }
  })()
  
  // Obtener rol del usuario actual
  const [currentAdmin] = useCurrentAdmin()
  const userRole = currentAdmin?.role

  // Estado local para periodo (dinámico, sin reload)
  const [periodo, setPeriodo] = useState(periodoInicial)

  const [state, setState] = useState({ 
    loading: true, 
    columns: [], 
    rows: [], 
    error: null, 
    page: 1, 
    perPage: 50, 
    total: 0, 
    sortBy: undefined, 
    sortDir: undefined,
    kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 }
  })

  // Filtros principales (multi-select)
  const [filters, setFilters] = useState({
    unificador_puesto: [],
    especialidad: [],
    agrupador: [],
    literal_puesto: [],
    literal_codigo_registro: [],
    escalafon: [],
    sexo: []
  })

  // Búsquedas rápidas
  const [quickSearch, setQuickSearch] = useState({
    codigo_cargo: '',
    nombre_apellido: '',
    cuil: '',
    codigo_rol: '',
    ex_baja: '',
    ex_concurso: ''
  })

  // Rango de edad
  const [rangoEdad, setRangoEdad] = useState({ min: '', max: '' })

  // Rango de antigüedad (en años)
  const [rangoAntiguedad, setRangoAntiguedad] = useState({ min: '', max: '' })

  // Checkbox de procesos concursales
  const [procesosConcursales, setProcesosConcursales] = useState(false)

  // Constante derivada
  const isNormalMode = !procesosConcursales

  // Filtro de estado (para KPIs clickeables)
  const [estadoFilter, setEstadoFilter] = useState('')

  // Valores DISTINCT para los filtros (se cargan del backend)
  const [distinctValues, setDistinctValues] = useState({
    unificador_puesto: [],
    especialidad: [],
    agrupador: [],
    literal_puesto: [],
    literal_codigo_registro: [],
    escalafon: [],
    sexo: []
  })

  // Estado para controlar modal de tabla ampliada
  const [modalOpen, setModalOpen] = useState(false)

  // ============= REFS =============
  
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])
  
  const periodoRef = useRef(periodo)
  useEffect(() => {
    periodoRef.current = periodo
  }, [periodo])
  
  const filtersRef = useRef(filters)
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])
  
  const quickSearchRef = useRef(quickSearch)
  useEffect(() => {
    quickSearchRef.current = quickSearch
  }, [quickSearch])
  
  const rangoEdadRef = useRef(rangoEdad)
  useEffect(() => {
    rangoEdadRef.current = rangoEdad
  }, [rangoEdad])
  
  const rangoAntiguedadRef = useRef(rangoAntiguedad)
  useEffect(() => {
    rangoAntiguedadRef.current = rangoAntiguedad
  }, [rangoAntiguedad])
  
  const procesosConcursalesRef = useRef(procesosConcursales)
  useEffect(() => {
    procesosConcursalesRef.current = procesosConcursales
  }, [procesosConcursales])
  
  const estadoFilterRef = useRef(estadoFilter)
  useEffect(() => {
    estadoFilterRef.current = estadoFilter
  }, [estadoFilter])
  
  const api = useMemo(() => new ApiClient(), [])

  const tableRef = useRef(null)

  const { error, handleError, clearError } = useErrorHandler()

  // Limpiar filtro de estado cuando se activa Procesos Concursales
  useEffect(() => {
    if (procesosConcursales && estadoFilter) {
      setEstadoFilter('')
    }
  }, [procesosConcursales])

  // Helper: call AdminJS page
  async function callPage(pageName, params){
    if (typeof api.getPage === 'function') {
      const res = await api.getPage({ pageName, params })
      return res.data || res
    }
    const res = await api.request({ method: 'GET', url: `pages/${pageName}`, params })
    return res.data || res
  }

  // Función auxiliar para construir filtros activos
  const buildActiveFiltersFromRefs = () => {
    const active = {}
    
    Object.entries(filtersRef.current).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        active[key] = values.join(',')
      }
    })
    
    Object.entries(quickSearchRef.current).forEach(([key, value]) => {
      if (value && value.trim()) {
        active[key] = value.trim()
      }
    })
    
    if (rangoEdadRef.current.min) active.edad_min = rangoEdadRef.current.min
    if (rangoEdadRef.current.max) active.edad_max = rangoEdadRef.current.max
    
    if (rangoAntiguedadRef.current.min) active.antiguedad_min = rangoAntiguedadRef.current.min
    if (rangoAntiguedadRef.current.max) active.antiguedad_max = rangoAntiguedadRef.current.max
    
    if (procesosConcursalesRef.current) active.procesos_concursales = 'true'
    
    if (estadoFilterRef.current) active.estado = estadoFilterRef.current
    
    return active
  }

  function buildActiveFilters(){
    return buildActiveFiltersFromRefs()
  }

  const fetchData = useCallback(async (paramsOverride={}) => {
    const currentState = stateRef.current
    const page = paramsOverride.page ?? currentState.page
    const perPage = paramsOverride.perPage ?? currentState.perPage
    const sortBy = paramsOverride.sortBy ?? currentState.sortBy
    const sortDir = paramsOverride.sortDir ?? currentState.sortDir
    
    const isPageChange = paramsOverride.page !== undefined && Object.keys(paramsOverride).length === 1
    const shouldShowLoading = !isPageChange
    
    if (shouldShowLoading) {
      setState(s => ({ ...s, loading: true, error: null }))
    }
    
    try {
      // Sin hospital - dotación total
      const query = { periodo: periodoRef.current, page, perPage }
      if (sortBy) query.sortBy = sortBy
      if (sortDir) query.sortDir = sortDir
      
      const active = buildActiveFiltersFromRefs()
      Object.assign(query, active)
      
      const data = await callPage('DotacionTotal', query)
      setState(s => ({ 
        ...s, 
        loading: false, 
        columns: data.columns || [], 
        rows: data.rows || [], 
        total: data.total || 0, 
        kpis: data.kpis || s.kpis,
        error: data.error || null, 
        page, 
        perPage, 
        sortBy, 
        sortDir 
      }))
      clearError()
      
      if (data.distinctValues) {
        setDistinctValues(data.distinctValues)
      }
    } catch (e) {
      setState(s => ({ ...s, loading: false }))
      handleError(e, 'DotacionTotal.fetchData')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar datos iniciales
  useEffect(() => { 
    fetchData({ page: 1 })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo])

  // Recargar al cambiar filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData({ page: 1 })
    }, 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, quickSearch, rangoEdad, rangoAntiguedad, procesosConcursales, estadoFilter])

  const toggleSort = useCallback((col) => {
    const currentState = stateRef.current
    const nextDir = currentState.sortBy === col && currentState.sortDir === 'ASC' ? 'DESC' : 'ASC'
    fetchData({ page: 1, sortBy: col, sortDir: nextDir })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      unificador_puesto: [],
      especialidad: [],
      agrupador: [],
      literal_puesto: [],
      literal_codigo_registro: [],
      escalafon: [],
      sexo: []
    })
    setQuickSearch({ codigo_cargo: '', nombre_apellido: '', cuil: '', codigo_rol: '', ex_baja: '', ex_concurso: '' })
    setRangoEdad({ min: '', max: '' })
    setRangoAntiguedad({ min: '', max: '' })
    setProcesosConcursales(false)
    setEstadoFilter('')
  }, [])

  const handlePageChange = useCallback((newPage) => {
    fetchData({ page: newPage })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePerPageChange = useCallback((e) => {
    fetchData({ page: 1, perPage: Number(e.target.value) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const downloadFile = (href, filename) => {
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const exportCsvPage = useCallback(async () => {
    try {
      const query = { periodo, page: state.page, perPage: state.perPage, export: 'xlsx' }
      if (state.sortBy) query.sortBy = state.sortBy
      if (state.sortDir) query.sortDir = state.sortDir
      
      const activeFilters = buildActiveFilters()
      Object.assign(query, activeFilters)
      
      const data = await callPage('DotacionTotal', query)
      if (!data.xlsxBase64) throw new Error('Exportación no disponible en handler')
      
      const filename = data.filename || `dotacion_total_${Date.now()}.xlsx`
      downloadFile('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + data.xlsxBase64, filename)
      clearError()
    } catch(e){ 
      handleError(e, 'exportCsvPage')
    }
  }, [state.page, state.perPage, state.sortBy, state.sortDir, procesosConcursales, periodo])

  const memoizedColumns = useMemo(() => state.columns, [state.columns])
  const memoizedRows = useMemo(() => state.rows, [state.rows])
  const memoizedKpis = useMemo(() => state.kpis, [state.kpis])
  const totalPages = useMemo(() => Math.max(1, Math.ceil(state.total / state.perPage)), [state.total, state.perPage])

  const handleKpiClick = useCallback((estado) => {
    setEstadoFilter(current => current === estado ? '' : estado)
  }, [])

  const handleKpiActivo = useCallback(() => handleKpiClick('activo'), [handleKpiClick])
  const handleKpiComision = useCallback(() => handleKpiClick('comision'), [handleKpiClick])
  const handleKpiRetencion = useCallback(() => handleKpiClick('retencion de cargo'), [handleKpiClick])
  const handleKpiBloqueado = useCallback(() => handleKpiClick('bloqueado'), [handleKpiClick])

  const handleOpenTablaAmpliada = useCallback(() => setModalOpen(true), [])

  // Componente memoizado para la tabla
  const TableComponent = React.memo(({ columns, rows, sortBy, sortDir, toggleSort, tableRef }) => (
    <Box ref={tableRef} style={{ 
      height: 'calc(100vh - 380px)',
      minHeight: '300px',
      overflowY: 'auto',
      overflowX: 'auto', 
      border: '1px solid #dee2e6', 
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <Table>
        <TableHead style={{ 
          background: '#f8f9fa',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <TableRow>
            {columns.map(col => (
              <TableCell 
                key={col} 
                style={{ 
                  cursor: 'pointer', 
                  userSelect: 'none', 
                  fontWeight: 600, 
                  padding: '12px 16px', 
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                  color: '#495057',
                  textAlign: 'center'
                }} 
                onClick={() => toggleSort(col)}
              >
                <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  {col}
                  {sortBy === col && (
                    <Icon 
                      icon={sortDir === 'ASC' ? 'ChevronUp' : 'ChevronDown'} 
                      style={{ fontSize: 14 }} 
                    />
                  )}
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow 
              key={idx} 
              style={{ 
                background: row.nombre_apellido === 'TOTAL DE REGISTROS' 
                  ? '#fff3cd' 
                  : idx % 2 === 0 
                    ? '#fff' 
                    : '#f8f9fa'
              }}
            >
              {columns.map(col => (
                <TableCell 
                  key={col} 
                  style={{ 
                    padding: '10px 16px', 
                    whiteSpace: 'nowrap', 
                    fontSize: 13,
                    color: '#212529'
                  }}
                >
                  {row[col] != null ? String(row[col]) : ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  ))
  TableComponent.displayName = 'TableComponent'

  // Estilos reutilizables para KPIs
  const kpiStyles = useMemo(() => ({
    activo: {
      background: '#8DE2D6',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
    },
    comision: {
      background: '#FFCC00',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
    },
    retencion: {
      background: '#153244',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
    },
    bloqueado: {
      background: '#3C3C3B',
      shadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
    }
  }), [])

  const KpiBox = React.memo(({ estado, label, valor, onClick, isActive }) => {
    const style = kpiStyles[estado] || {}
    return (
      <Box 
        onClick={onClick}
        style={{ 
          flex: 1, 
          padding: '8px 12px', 
          borderRadius: 6, 
          background: style.background,
          color: '#fff',
          boxShadow: isActive ? style.shadow : '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transform: isActive ? 'scale(1.05)' : 'scale(1)',
          transition: 'all 0.2s ease',
          border: isActive ? '3px solid #fff' : 'none'
        }}>
        <Text style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>
          {label} {isActive && '✓'}
        </Text>
        <H2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
          {valor}
        </H2>
      </Box>
    )
  })

  if (error) {
    return <ErrorFallback error={error} onRetry={() => fetchData()} componentName="DotacionTotal" />
  }

  return (
    <Box style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <UserInfo />
      {/* PANEL LATERAL DE FILTROS */}
      <Box style={{
        width: 300,
        borderRight: '2px solid #e0e0e0',
        padding: '16px',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#f8f9fa'
      }}>
        <Box style={{ marginBottom: 24 }}>
          <BackButton />
        </Box>

        <H3 style={{ fontSize: 18, marginBottom: 16, color: '#1a3a52' }}>Filtros</H3>

        {/* Periodo - sin hospital (global) */}
        <Box style={{ marginBottom: 20 }}>
          <PeriodoSelector 
            periodo={periodo}
            onPeriodoChange={(newPeriodo) => {
              const usp = new URLSearchParams(window.location.search)
              usp.set('periodo', newPeriodo)
              window.history.replaceState({}, '', window.location.pathname + '?' + usp.toString())
              setPeriodo(newPeriodo)
            }}
          />
        </Box>

        {/* Unificador de Puesto */}
        <Box style={{ marginBottom: 20 }}>
          <div style={{ maxWidth: '240px' }}>
            <MultiSelectDropdown
              label={procesosConcursales ? "Unificador de Puestos" : "Puestos"}
              options={distinctValues.unificador_puesto}
              value={filters.unificador_puesto}
              onChange={(v) => setFilters({...filters, unificador_puesto: v})}
              placeholder={procesosConcursales ? "Unificador de Puestos" : "Unificador de Puestos"}
            />
          </div>
        </Box>

        {/* Especialidad */}
        <Box style={{ marginBottom: 20 }}>
          <div style={{ maxWidth: '240px' }}>
            <MultiSelectDropdown
              label={procesosConcursales ? "Especialidad (Baja)" : "Especialidad"}
              options={distinctValues.especialidad}
              value={filters.especialidad}
              onChange={(v) => setFilters({...filters, especialidad: v})}
              placeholder={procesosConcursales ? "Especialidad de Baja" : "Especialidades"}
            />
          </div>
        </Box>

        {/* Agrupamiento - Solo para dotación normal */}
        {isNormalMode && (
          <Box style={{ marginBottom: 20 }}>
            <div style={{ maxWidth: '240px' }}>
              <MultiSelectDropdown
                label="Agrupamiento"
                options={distinctValues.agrupador}
                value={filters.agrupador}
                onChange={(v) => setFilters({...filters, agrupador: v})}
                placeholder="Agrupamiento"
              />
            </div>
          </Box>
        )}

        {/* Rango de Edad - Solo para dotación normal */}
        {isNormalMode && (
          <Box style={{ marginBottom: 20 }}>
            <Label style={{ fontWeight: 600, marginBottom: 8, display: 'block', fontSize: 13 }}>Edad</Label>
            <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input 
                type="number" 
                placeholder="Min"
                value={rangoEdad.min}
                onChange={(e) => setRangoEdad({...rangoEdad, min: e.target.value})}
                style={{ width: '100%' }}
                className="no-spinner"
              />
              <Text>-</Text>
              <Input 
                type="number" 
                placeholder="Max"
                value={rangoEdad.max}
                onChange={(e) => setRangoEdad({...rangoEdad, max: e.target.value})}
                style={{ width: '100%' }}
                className="no-spinner"
              />
            </Box>
          </Box>
        )}

        {/* Puesto / Puesto Baja */}
        <Box style={{ marginBottom: 20 }}>
          <div style={{ maxWidth: '240px' }}>
            <MultiSelectDropdown
              label={procesosConcursales ? "Puesto (Baja)" : "Puesto"}
              options={distinctValues.literal_puesto}
              value={filters.literal_puesto}
              onChange={(v) => setFilters({...filters, literal_puesto: v})}
              placeholder={procesosConcursales ? "Puesto de Baja" : "Puesto"}
            />
          </div>
        </Box>

        {/* Literal Código de Registro / Motivo Baja */}
        <Box style={{ marginBottom: 20 }}>
          <div style={{ maxWidth: '240px' }}>
            <MultiSelectDropdown
              label={procesosConcursales ? "Motivo de Baja" : "Código de Registro"}
              options={distinctValues.literal_codigo_registro}
              value={filters.literal_codigo_registro}
              onChange={(v) => setFilters({...filters, literal_codigo_registro: v})}
              placeholder={procesosConcursales ? "Motivo de Baja" : "Código de Registro"}
            />
          </div>
        </Box>

        {/* Escalafón - Solo para dotación normal */}
        {isNormalMode && (
          <Box style={{ marginBottom: 20 }}>
            <div style={{ maxWidth: '240px' }}>
              <MultiSelectDropdown
                label="Escalafón"
                options={distinctValues.escalafon}
                value={filters.escalafon}
                onChange={(v) => setFilters({...filters, escalafon: v})}
                placeholder="Escalafón"
              />
            </div>
          </Box>
        )}

        {/* Sexo - Solo para dotación normal */}
        {isNormalMode && (
          <Box style={{ marginBottom: 20 }}>
            <div style={{ maxWidth: '240px' }}>
              <MultiSelectDropdown
                label="Sexo"
                options={distinctValues.sexo}
                value={filters.sexo}
                onChange={(v) => setFilters({...filters, sexo: v})}
                placeholder="Sexo"
              />
            </div>
          </Box>
        )}

        {/* Rango de Antigüedad - Solo para dotación normal */}
        {isNormalMode && (
          <Box style={{ marginBottom: 20 }}>
            <Label style={{ fontWeight: 600, marginBottom: 8, display: 'block', fontSize: 13 }}>Antiguedad</Label>
            <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input 
                type="number" 
                placeholder="Min"
                value={rangoAntiguedad.min}
                onChange={(e) => setRangoAntiguedad({...rangoAntiguedad, min: e.target.value})}
                style={{ width: '100%' }}
                className="no-spinner"
              />
              <Text>-</Text>
              <Input 
                type="number" 
                placeholder="Max"
                value={rangoAntiguedad.max}
                onChange={(e) => setRangoAntiguedad({...rangoAntiguedad, max: e.target.value})}
                style={{ width: '100%' }}
                className="no-spinner"
              />
            </Box>
          </Box>
        )}

        {/* Procesos Concursales */}
        <Box style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input 
              type="checkbox"
              checked={procesosConcursales}
              onChange={(e) => setProcesosConcursales(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span style={{ fontWeight: 500 }}>Procesos Concursales</span>
          </label>
        </Box>

        {/* Botón Limpiar Filtros */}
        <Button 
          variant="danger" 
          size="sm" 
          onClick={clearFilters}
          style={{ width: '100%', marginTop: 8 }}
        >
          <Icon icon="Refresh" style={{ marginRight: 4 }} />
          Limpiar Filtros
        </Button>
      </Box>

      {/* PANEL PRINCIPAL */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* HEADER */}
        <Box style={{
          padding: '12px 20px',
          background: 'linear-gradient(90deg, #1a3a52 0%, #2c5f7f 100%)',
          color: '#fff',
          borderBottom: '3px solid #0d2d44',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <H2 style={{ margin: 0, color: '#fff', fontSize: 20, lineHeight: 1.2 }}>
              {procesosConcursales ? 'Bajas y Concursos - Todos los Hospitales' : 'Dotación de Personal - Todos los Hospitales'}
            </H2>
            {procesosConcursales && (
              <Box style={{ 
                background: '#ffc107', 
                color: '#000', 
                padding: '2px 10px', 
                borderRadius: 4, 
                fontSize: 11,
                fontWeight: 600,
                alignSelf: 'flex-start'
              }}>
                📋 Procesos Concursales Activo
              </Box>
            )}
          </Box>
          <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button 
              size="sm"
              onClick={handleOpenTablaAmpliada}
              style={{ 
                background: 'rgba(59, 130, 246, 0.9)', 
                border: '1px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: 12
              }}
            >
              Vista ampliada
            </Button>
          </Box>
        </Box>

        {/* BÚSQUEDAS RÁPIDAS Y KPIs */}
        <Box style={{ padding: '12px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0' }}>
          {/* Búsquedas rápidas */}
          <Box style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <Box style={{ flex: 1 }}>
              <Label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: '#666' }}>
                Código Cargo
              </Label>
              <Input 
                placeholder="Ej: CPH-001"
                value={quickSearch.codigo_cargo}
                onChange={(e) => setQuickSearch({...quickSearch, codigo_cargo: e.target.value})}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: '#666' }}>
                Nombre y Apellido
              </Label>
              <Input 
                placeholder="Ej: García"
                value={quickSearch.nombre_apellido}
                onChange={(e) => setQuickSearch({...quickSearch, nombre_apellido: e.target.value})}
              />
            </Box>
            {/* CUIL - Solo para dotación normal */}
            {isNormalMode && (
              <Box style={{ flex: 1 }}>
                <Label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: '#666' }}>
                  CUIL
                </Label>
                <Input 
                  placeholder="Ej: 20345678"
                  value={quickSearch.cuil}
                  onChange={(e) => setQuickSearch({...quickSearch, cuil: e.target.value})}
                />
              </Box>
            )}
            {/* Código Rol - Solo para dotación normal */}
            {isNormalMode && (
              <Box style={{ flex: 1 }}>
                <Label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: '#666' }}>
                  Código SIAL
                </Label>
                <Input 
                  placeholder="Ej: 000000000-0"
                  value={quickSearch.codigo_rol}
                  onChange={(e) => setQuickSearch({...quickSearch, codigo_rol: e.target.value})}
                />
              </Box>
            )}
            {/* Ex. Baja - Solo para bajas/concursos */}
            {!isNormalMode && (
              <Box style={{ flex: 1 }}>
                <Label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: '#666' }}>
                  Ex. Baja
                </Label>
                <Input 
                  placeholder="Ej: 2025-44646788"
                  value={quickSearch.ex_baja}
                  onChange={(e) => setQuickSearch({...quickSearch, ex_baja: e.target.value})}
                />
              </Box>
            )}
            {/* Ex. Concurso - Solo para bajas/concursos */}
            {!isNormalMode && (
              <Box style={{ flex: 1 }}>
                <Label style={{ fontSize: 12, marginBottom: 4, display: 'block', color: '#666' }}>
                  Ex. Concurso
                </Label>
                <Input 
                  placeholder="Ej: 2025-45128251"
                  value={quickSearch.ex_concurso}
                  onChange={(e) => setQuickSearch({...quickSearch, ex_concurso: e.target.value})}
                />
              </Box>
            )}
          </Box>

          {/* KPIs - Solo si NO está activo Procesos Concursales */}
          {isNormalMode && (
            <Box style={{ display: 'flex', gap: 12 }}>
              <KpiBox 
                estado="activo"
                label="Activo"
                valor={memoizedKpis.activos?.toLocaleString?.() || '0'}
                onClick={handleKpiActivo}
                isActive={estadoFilter === 'activo'}
              />
              <KpiBox 
                estado="comision"
                label="Comisión"
                valor={memoizedKpis.comision?.toLocaleString?.() || '0'}
                onClick={handleKpiComision}
                isActive={estadoFilter === 'comision'}
              />
              <KpiBox 
                estado="retencion"
                label="Retención de Cargo"
                valor={memoizedKpis.retencion?.toLocaleString?.() || '0'}
                onClick={handleKpiRetencion}
                isActive={estadoFilter === 'retencion de cargo'}
              />
              <KpiBox 
                estado="bloqueado"
                label="Bloqueo de Haberes"
                valor={memoizedKpis.bloqueados?.toLocaleString?.() || '0'}
                onClick={handleKpiBloqueado}
                isActive={estadoFilter === 'bloqueado'}
              />
            </Box>
          )}
        </Box>

        {/* ÁREA DE TABLA */}
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 24px', overflow: 'hidden' }}>
          {state.error && (
            <Box style={{ 
              padding: 16, 
              background: '#fee', 
              border: '1px solid #fcc', 
              borderRadius: 4, 
              marginBottom: 16 
            }}>
              <Text color="error">{state.error}</Text>
            </Box>
          )}

          {state.loading && (
            <Box style={{ textAlign: 'center', padding: 40 }}>
              <Text color="subtle">Cargando datos...</Text>
            </Box>
          )}

          {!state.loading && !state.error && (
            <>
              {/* Acciones y contador */}
              <Box style={{ 
                marginBottom: 16, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <Box style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" onClick={exportCsvPage}>
                    <Icon icon="Download" style={{ marginRight: 4 }} />
                    Exportar Página (Excel)
                  </Button>
                </Box>
                <Text style={{ fontSize: 14, color: '#666' }}>
                  Mostrando {memoizedRows.length} de {state.total.toLocaleString()} registros
                </Text>
              </Box>

              {/* Tabla */}
              <TableComponent 
                columns={memoizedColumns}
                rows={memoizedRows}
                sortBy={state.sortBy}
                sortDir={state.sortDir}
                toggleSort={toggleSort}
                tableRef={tableRef}
              />

              {/* Paginación y selector */}
              <Box style={{ 
                marginTop: 16, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16
              }}>
                <Pagination
                  currentPage={state.page}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  loading={false}
                  tableRef={tableRef}
                />
                
                <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#666' }}>Registros por página:</Text>
                  <select
                    value={state.perPage}
                    onChange={handlePerPageChange}
                    style={{ 
                      padding: '6px 10px', 
                      borderRadius: 4, 
                      border: '1px solid #d4d4d8', 
                      fontSize: 13,
                      cursor: 'pointer',
                      background: '#fff'
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Box>

      {/* MODAL DE TABLA AMPLIADA */}
      <TablaAmpliada
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        columns={memoizedColumns}
        rows={memoizedRows}
        state={state}
        toggleSort={toggleSort}
        totalPages={totalPages}
        fetchData={fetchData}
      />
    </Box>
  )
}

export default DotacionTotal
