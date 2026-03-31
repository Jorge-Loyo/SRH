import React, { useEffect, useMemo, useState, useCallback, useRef, memo } from 'react'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import Pagination from '../reutilizables/Pagination'
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { useTableFilters } from '../hooks/tablas_full/useTableFilters'
import { useTableStyles } from '../hooks/tablas_full/useTableStyles'
import { ApiClient } from 'adminjs'
import { Box, H3, Text, Table, TableHead, TableRow, TableCell, TableBody, Button, Icon } from '@adminjs/design-system'
import MultiSelectDropdown from '../reutilizables/multi-select-dropdown'
import ScrollTrap from '../reutilizables/ScrollTrap'
import { getTableConfig, generateInitialForm, getDistinctFields, FILTER_TYPES } from './tables-config'

// ============================================================================
// COMPONENTE DE TABLA MEMOIZADO
// ============================================================================
const TableMemoized = memo(React.forwardRef(({ columns, rows, onSort, sortBy, sortDir }, ref) => (
  <Box ref={ref} style={{ border: '1px solid #E5E7EB', borderRadius: 8, background: '#FAFBFC', maxHeight: '450px', overflow: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <ScrollTrap>
      <Table>
        <TableHead>
          <TableRow style={{ position: 'sticky', top: 0, background: '#F3F4F6', zIndex: 1, borderBottom: '1px solid #E5E7EB' }}>
            {columns.map((col) => {
              const active = sortBy === col
              const arrow = active ? (sortDir === 'DESC' ? ' ▼' : ' ▲') : ''
              return (
                <TableCell key={col} onClick={() => onSort(col)} style={{ cursor: 'pointer', color: '#1F2937', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap', userSelect: 'none', padding: '12px 16px' }}>
                  {col}{arrow}
                </TableCell>
              )
            })}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx} style={{ background: idx % 2 ? '#FFFFFF' : '#FAFBFC', borderBottom: '1px solid #E5E7EB', transition: 'background-color 0.15s ease' }}>
              {columns.map((col) => (
                <TableCell key={col} style={{ whiteSpace: 'nowrap', color: '#374151', fontSize: '14px', padding: '12px 16px' }}>
                  {row[col] == null ? '' : String(row[col])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollTrap>
  </Box>
)))

// ============================================================================
// COMPONENTE PRINCIPAL GENÉRICO
// ============================================================================
const GenericTableFull = ({ tableKey }) => {
  // Validar configuración
  const config = useMemo(() => getTableConfig(tableKey), [tableKey])
  
  if (!config) {
    return (
      <Box p="xl">
        <H3 style={{ color: '#DC2626' }}>Error: Tabla no configurada</H3>
        <Text>La tabla "{tableKey}" no existe en la configuración.</Text>
      </Box>
    )
  }

  // Estado y hooks
  const [state, setState] = useState({ loading: true, page: 1, perPage: 50, total: 0, sortBy: '', sortDir: 'ASC', columns: [], rows: [], options: {} })
  const api = useMemo(() => new ApiClient(), [])
  const { error, handleError, clearError } = useErrorHandler()
  const { buildActiveFilters } = useTableFilters()

  // Drawer de filtros
  const [drawerOpen, setDrawerOpen] = useState(false)
  const initialForm = useMemo(() => generateInitialForm(tableKey), [tableKey])
  const [form, setForm] = useState(initialForm)

  // Ref para almacenar el estado actual sin causar re-renders
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Ref para la tabla (usada en paginación para scroll suave)
  const tableRef = useRef(null)

  // Función load MEMOIZADA con useCallback - SIN dependencias de state para evitar re-renders
  const load = useCallback(async (params = {}) => {
    // Capturar los valores actuales del estado
    const currentState = stateRef.current
    const finalPage = params.page !== undefined ? params.page : currentState.page
    const finalPerPage = params.perPage !== undefined ? params.perPage : currentState.perPage
    const finalSortBy = params.sortBy !== undefined ? params.sortBy : currentState.sortBy
    const finalSortDir = params.sortDir !== undefined ? params.sortDir : currentState.sortDir
    
    // Solo marcar como loading si no hay datos aún (carga inicial)
    if (currentState.rows.length === 0) {
      setState(s => ({ ...s, loading: true }))
    }
    
    let isMounted = true
    
    try {
      // Extraer solo los filtros (todo excepto page, perPage, sortBy, sortDir)
      const { page: _p, perPage: _pp, sortBy: _sb, sortDir: _sd, ...formData } = params
      const activeFilters = buildActiveFilters(formData)
      
      // Hacer la petición
      let res
      if (typeof api.getPage === 'function') {
        res = await api.getPage({ pageName: config.pageName, params: { page: finalPage, perPage: finalPerPage, sortBy: finalSortBy, sortDir: finalSortDir, ...activeFilters } })
      } else {
        res = await api.request({ method: 'GET', url: `pages/${config.pageName}`, params: { page: finalPage, perPage: finalPerPage, sortBy: finalSortBy, sortDir: finalSortDir, ...activeFilters } })
      }
      
      if (!isMounted) return
      
      const data = res.data || res
      setState(s => ({ ...s, ...data, page: finalPage, perPage: finalPerPage, sortBy: finalSortBy, sortDir: finalSortDir, loading: false }))
      clearError()
    } catch (e) {
      if (!isMounted) return
      setState(s => ({ ...s, loading: false }))
      handleError(e, `${config.label}.load`)
    }
  }, [buildActiveFilters, api, clearError, handleError, config.pageName, config.label])

  useEffect(() => {
    load({ page: 1 })
    
    // Cleanup: limpiar cuando el componente se desmonta
    return () => {
      fetchingRef.current = {}
      const distinctFields = getDistinctFields(tableKey)
      distinctFields.forEach(field => {
        distinctCacheRef.current[field] = null
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Solo ejecutar al montar, load es estable por useCallback
  }, [])

  const totalPages = Math.max(1, Math.ceil((state.total || 0) / (state.perPage || 10)))

  // Cache para valores DISTINCT de columnas (desde backend, con filtros encadenados)
  const distinctFields = useMemo(() => getDistinctFields(tableKey), [tableKey])
  
  const [distinct, setDistinct] = useState(() => {
    const initial = {}
    distinctFields.forEach(field => {
      initial[field] = null
    })
    return initial
  })
  
  const fetchingRef = useRef({})
  const distinctCacheRef = useRef((() => {
    const cache = {}
    distinctFields.forEach(field => {
      cache[field] = null
    })
    return cache
  })())
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
  
  // Fetch DISTINCT con caché - MEMOIZADO
  const fetchDistinct = useCallback(async (col, currentFilters = {}) => {
    // Verificar caché simple (sin stringify)
    const cached = distinctCacheRef.current[col]
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setDistinct((d) => ({ ...d, [col]: cached.values }))
      return
    }
    
    // Evitar múltiples fetches simultáneos
    const fetchKey = col
    if (fetchingRef.current[fetchKey]) return
    fetchingRef.current[fetchKey] = true
    
    let isMounted = true
    
    try {
      const activeFilters = buildActiveFilters(currentFilters)
      // SIN LÍMITE - traer TODOS los valores distintos
      const params = { distinct: col, ...activeFilters }
      
      console.log(`[fetchDistinct] Fetching ${col} with params:`, params)
      
      let res
      // Usar directamente fetch API en lugar de AdminJS ApiClient
      const queryString = new URLSearchParams(params).toString()
      const url = `/admin/api/pages/${config.pageName}?${queryString}`
      
      console.log(`[fetchDistinct] URL: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      res = await response.json()
      
      console.log(`[fetchDistinct] ✅ RESPONSE RECEIVED for ${col}:`, JSON.stringify(res, null, 2))
      
      if (!isMounted) return
      
      const data = res.data || res
      const error = data?.distinct?.error
      if (error) {
        console.error(`[fetchDistinct] ❌ ERROR from server for ${col}:`, error)
        // Si hay error, seguir adelante con array vacío pero loguear en lugar de fallar silenciosamente
        handleError(new Error(`No se pudieron cargar opciones para ${col}: ${error}`), `fetchDistinct.${col}`)
      }
      const vals = data?.distinct?.values || []
      const processedVals = vals.map(v => v === 'null' ? '' : v)
      
      console.log(`[fetchDistinct] ✅ SETTING STATE for ${col} with ${processedVals.length} values:`, processedVals)
      
      // Guardar en caché
      distinctCacheRef.current[col] = {
        values: processedVals,
        timestamp: Date.now()
      }
      
      setDistinct((d) => {
        const updated = { ...d, [col]: processedVals }
        console.log(`[fetchDistinct] ✅ STATE UPDATED for ${col}. distinct[${col}] now has ${updated[col].length} items`)
        return updated
      })
      
      // Guardar en caché
      distinctCacheRef.current[col] = {
        values: processedVals,
        timestamp: Date.now()
      }
      
      setDistinct((d) => ({ ...d, [col]: processedVals }))
    } catch (e) {
      console.error(`[fetchDistinct] Error fetching ${col}:`, e)
    } finally {
      fetchingRef.current[fetchKey] = false
      isMounted = false
    }
  }, [buildActiveFilters, api, config.pageName])

  // Cargar opciones una sola vez cuando se abre el drawer (sin filtros encadenados)
  const optionsLoadedRef = useRef(false)
  
  useEffect(() => {
    if (!drawerOpen) {
      optionsLoadedRef.current = false  // Reset cuando se cierra drawer
      return
    }
    
    // Solo cargar opciones UNA SOLA VEZ per drawer open session
    if (optionsLoadedRef.current) return
    
    optionsLoadedRef.current = true  // Marcar como cargado
    
    const loadOptions = async () => {
      const distinctFields = getDistinctFields(tableKey)
      const emptyForm = generateInitialForm(tableKey)
      await Promise.all(distinctFields.map(field => fetchDistinct(field, emptyForm)))
    }
    
    loadOptions()
  }, [drawerOpen, tableKey, fetchDistinct])

  // Opciones derivadas SOLO del backend (sin fallback a rows de página actual)
  // Esto asegura que obtenemos TODOS los valores distintos, no solo de esta página
  const multiSelectOptions = useMemo(() => {
    const options = {}
    const distinctFields = getDistinctFields(tableKey)
    
    distinctFields.forEach(field => {
      // Usar SOLO los valores del backend, nunca fallback a rows (que son de una sola página)
      const distinctValues = distinct[field] || []
      options[field] = distinctValues
      console.log(`[multiSelectOptions] ${field}: ${distinctValues.length} opciones disponibles`)
    })
    
    console.log(`[multiSelectOptions] ✅ RECALCULATED. Total fields: ${distinctFields.length}`)
    return options
  }, [distinct, tableKey])

  // Cerrar con tecla ESC cuando el drawer esté abierto
  useEffect(() => {
    if (!drawerOpen) return
    const onKeyDown = (e) => { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen])

  // Estilos desde hook compartido
  const styles = useTableStyles()
  const { labelStyle, sectionTitleStyle, cellLeft, cellRight } = styles

  // Handlers
  const exportCsvPage = useCallback(async () => {
    try {
      const activeFilters = buildActiveFilters(form)
      const params = { page: state.page, perPage: state.perPage, sortBy: state.sortBy, sortDir: state.sortDir, export: 'xlsx', ...activeFilters }
      let res
      if (typeof api.getPage === 'function') {
        res = await api.getPage({ pageName: config.pageName, params })
      } else {
        res = await api.request({ method: 'GET', url: `pages/${config.pageName}`, params })
      }
      const data = res.data || res
      if (!data.xlsxBase64) throw new Error('Exportación no disponible')
      const a = document.createElement('a')
      a.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + data.xlsxBase64
      a.download = data.filename || `${config.key}_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch(e) { 
      alert('No se pudo exportar Excel: ' + (e?.message || e)) 
    }
  }, [form, state.page, state.perPage, state.sortBy, state.sortDir, buildActiveFilters, api, config])

  const exportCsvAll = useCallback(() => {
    try {
      const activeFilters = buildActiveFilters(form)
      const params = new URLSearchParams({})
      if (state.sortBy) params.append('sortBy', state.sortBy)
      if (state.sortDir) params.append('sortDir', state.sortDir)
      Object.entries(activeFilters).forEach(([k,v]) => params.append(k, v))
      
      const url = `${config.exportRoute}?${params.toString()}`
      const a = document.createElement('a')
      a.href = url
      a.download = `${config.key}_completo_${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch(e) { 
      alert('No se pudo iniciar exportación: ' + (e?.message || e)) 
    }
  }, [form, state.sortBy, state.sortDir, buildActiveFilters, config])

  const toggleSort = useCallback((col) => {
    const nextDir = state.sortBy === col && state.sortDir === 'ASC' ? 'DESC' : 'ASC'
    const activeFilters = buildActiveFilters(form)
    load({ page: 1, sortBy: col, sortDir: nextDir, ...activeFilters })
  }, [state.sortBy, state.sortDir, form, buildActiveFilters, load])

  const handleFilterSubmit = useCallback(() => {
    const activeFilters = buildActiveFilters(form)
    load({ page: 1, ...activeFilters })
    setDrawerOpen(false)
  }, [form, buildActiveFilters, load])

  const handleFilterReset = useCallback(() => {
    setForm(initialForm)
    distinctCacheRef.current = {}
    load({ page: 1, ...initialForm })
  }, [initialForm, load])

  if (error) {
    return <ErrorFallback error={error} onRetry={() => load({ page: 1 })} componentName={config.label} />
  }

  return (
    <Box style={{ paddingLeft: 12, paddingRight: 12, paddingTop: 16, paddingBottom: 24 }}>
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      
      <BackButton />
      
      {/* Header */}
      <Box p="xl" mb="lg" style={{ 
        border: '1px solid #E5E7EB', 
        borderRadius: 8, 
        background: '#FAFBFC', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)' 
      }}>
        <H3 style={{ margin: 0, color: '#1F2937', fontSize: 22, fontWeight: 700 }}>
          {config.label} · Vista completa
        </H3>
        <Text color="subtle" style={{ color: '#6B7280', marginTop: 4 }}>
          {config.description}
        </Text>
        <Box mt="md" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Box style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button onClick={() => setDrawerOpen(true)}>
              <Icon icon="Filter" />&nbsp;Filtrar ({Object.values(form).filter(v => Array.isArray(v) ? v.length > 0 : v !== '').length})
            </Button>
            <Button variant="secondary" onClick={exportCsvPage}>
              <Icon icon="Download" />&nbsp;Excel página
            </Button>
            <Button variant="secondary" onClick={exportCsvAll}>
              <Icon icon="Download" />&nbsp;Excel completo
            </Button>
            <select
              value={state.perPage}
              onChange={(e) => { const activeFilters = buildActiveFilters(form); load({ page: 1, perPage: parseInt(e.target.value, 10), ...activeFilters }); }}
              style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: '14px', color: '#374151', background: '#FFFFFF' }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </Box>
          
          {/* Contador de registros - extremo derecho */}
          {state.rows.length > 0 && (
            <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {((state.page - 1) * state.perPage + 1).toLocaleString('es-AR')}–{Math.min(state.page * state.perPage, state.total).toLocaleString('es-AR')} de {state.total.toLocaleString('es-AR')}
            </div>
          )}
        </Box>
      </Box>

      {/* Tabla */}
      {state.loading ? (
        <Box p="xl" style={{ textAlign: 'center' }}>
          <Text>Cargando datos...</Text>
        </Box>
      ) : state.rows.length === 0 ? (
        <Box p="xl" style={{ 
          textAlign: 'center', 
          border: '2px dashed #D1D5DB', 
          borderRadius: 8, 
          padding: 32,
          background: '#F9FAFB'
        }}>
          <Icon icon="Search" style={{ fontSize: 48, color: '#9CA3AF', marginBottom: 16 }} />
          <H3 style={{ color: '#6B7280' }}>No se encontraron resultados</H3>
          <Text color="subtle">Intenta ajustar los filtros o resetearlos.</Text>
          <Button onClick={handleFilterReset} style={{ marginTop: 16 }}>
            Resetear filtros
          </Button>
        </Box>
      ) : (
        <TableMemoized
          ref={tableRef}
          columns={state.columns}
          rows={state.rows}
          onSort={toggleSort}
          sortBy={state.sortBy}
          sortDir={state.sortDir}
        />
      )}
      
      {/* Paginación */}
      <Pagination
        currentPage={state.page}
        totalPages={totalPages}
        totalRecords={state.total}
        tableRef={tableRef}
        onPageChange={(newPage) => {
          const activeFilters = buildActiveFilters(form)
          load({ page: newPage, ...activeFilters })
        }}
        loading={state.loading}
      />

      <UserInfo />

      {/* Drawer de filtros */}
      {drawerOpen && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
            }}
          />
          
          {/* Drawer */}
          <Box
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 420,
              height: '100%',
              background: '#1E293B',
              color: '#cbd5ff',
              zIndex: 1000,
              boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflowX: 'hidden'
            }}
          >
            {/* Header */}
            <Box p="lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <H3 style={{ color: '#cbd5ff', margin: 0, fontSize: 18, fontWeight: 600 }}>Filtros</H3>
              <Button
                variant="text"
                title="Cerrar"
                aria-label="Cerrar"
                onClick={() => setDrawerOpen(false)}
                style={{ color: '#cbd5ff', background: 'transparent', border: 'none', fontSize: '20px', lineHeight: 1, padding: '4px 8px', cursor: 'pointer' }}
              >
                ✕
              </Button>
            </Box>

            {/* Contenido - Renderizar por secciones usando cellLeft/cellRight */}
            <Box p="lg" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 16 }}>
              {(() => {
                const filtersBySection = {}
                
                // Agrupar filtros por sección
                config.filters.forEach(filter => {
                  const section = filter.section || 'General'
                  if (!filtersBySection[section]) {
                    filtersBySection[section] = []
                  }
                  filtersBySection[section].push(filter)
                })
                
                // Mantener orden de secciones: General primero
                const sectionOrder = ['General', ...Object.keys(filtersBySection).filter(s => s !== 'General').sort()]
                
                return sectionOrder.map((section) => {
                  const filtersInSection = filtersBySection[section]
                  if (!filtersInSection) return null
                  
                  return (
                    <React.Fragment key={section}>
                      {/* Ocultar títulos de sección - comentado */}
                      {/* {section !== 'General' && (
                        <div style={sectionTitleStyle}>
                          {section}
                        </div>
                      )} */}
                      
                      {/* Renderizar filtros en pares usando cellLeft/cellRight, o full-width si corresponde */}
                      {(() => {
                        const items = []
                        let i = 0
                        while (i < filtersInSection.length) {
                          const current = filtersInSection[i]
                          
                          // Si el filtro tiene fullWidth, renderizarlo solo
                          if (current.fullWidth) {
                            items.push(
                              <div key={`full-${section}-${i}`} style={{ marginBottom: 8 }}>
                                <div style={{ ...cellLeft, gridColumn: '1 / -1' }}>
                                  <label style={labelStyle}>{current.label}</label>
                                  {renderFilter(current)}
                                </div>
                              </div>
                            )
                            i++
                          } else {
                            // Renderizar en par (si hay siguiente y no es fullWidth)
                            const next = filtersInSection[i + 1]
                            items.push(
                              <div key={`pair-${section}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 8 }}>
                                <div style={cellLeft}>
                                  <label style={labelStyle}>{current.label}</label>
                                  {renderFilter(current)}
                                </div>
                                {next && !next.fullWidth && (
                                  <div style={cellRight}>
                                    <label style={labelStyle}>{next.label}</label>
                                    {renderFilter(next)}
                                  </div>
                                )}
                              </div>
                            )
                            i += (next && !next.fullWidth) ? 2 : 1
                          }
                        }
                        return items
                      })()}
                    </React.Fragment>
                  )
                })
              })()}
            </Box>

            {/* Footer */}
            <Box p="lg" style={{ marginTop: 'auto', display: 'flex', gap: 12, justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <Button
                variant="secondary"
                onClick={handleFilterReset}
                style={{ flex: 1, minWidth: 150 }}
              >
                Resetear
              </Button>
              <Button
                onClick={handleFilterSubmit}
                style={{ flex: 1, minWidth: 150 }}
              >
                <Icon icon="Filter" />&nbsp;Aplicar Filtros
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Box>
  )

  // ============================================================================
  // RENDER DE FILTROS
  // ============================================================================
  function renderFilter(filter) {
    const inputStyle = { width: '100%', border: '1px solid #111', borderRadius: 8, padding: '8px 10px', fontSize: 14, background: '#FFFFFF', color: '#1F2937' }
    const selectStyle = { width: '100%', border: '1px solid #111', borderRadius: 8, padding: '8px 10px', fontSize: 14, background: '#FFFFFF', color: '#1F2937', cursor: 'pointer' }
    
    switch (filter.type) {
      case FILTER_TYPES.TEXT:
      case FILTER_TYPES.LIKE:
        return (
          <input
            type="text"
            value={form[filter.field] || ''}
            onChange={(e) => setForm({ ...form, [filter.field]: e.target.value })}
            placeholder={filter.placeholder || 'contiene...'}
            style={inputStyle}
          />
        )

      case FILTER_TYPES.NUMBER:
        return (
          <input
            type="number"
            value={form[filter.field] || ''}
            onChange={(e) => setForm({ ...form, [filter.field]: e.target.value })}
            placeholder={filter.placeholder || filter.label}
            style={inputStyle}
          />
        )

      case FILTER_TYPES.NUMBER_RANGE:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              type="number"
              value={form[`${filter.field}Min`] || ''}
              onChange={(e) => setForm({ ...form, [`${filter.field}Min`]: e.target.value })}
              placeholder=">="
              style={inputStyle}
            />
            <input
              type="number"
              value={form[`${filter.field}Max`] || ''}
              onChange={(e) => setForm({ ...form, [`${filter.field}Max`]: e.target.value })}
              placeholder="<="
              style={inputStyle}
            />
          </div>
        )

      case FILTER_TYPES.DATE:
        return (
          <input
            type="date"
            value={form[filter.field] || ''}
            onChange={(e) => setForm({ ...form, [filter.field]: e.target.value })}
            style={inputStyle}
          />
        )

      case FILTER_TYPES.DATE_RANGE:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              type="date"
              value={form[`${filter.field}Desde`] || ''}
              onChange={(e) => setForm({ ...form, [`${filter.field}Desde`]: e.target.value })}
              style={inputStyle}
            />
            <input
              type="date"
              value={form[`${filter.field}Hasta`] || ''}
              onChange={(e) => setForm({ ...form, [`${filter.field}Hasta`]: e.target.value })}
              style={inputStyle}
            />
          </div>
        )

      case FILTER_TYPES.MULTI_SELECT:
        const options = multiSelectOptions[filter.field] || []
        return (
          <MultiSelectDropdown
            label={filter.label}
            value={form[filter.field] || []}
            options={options}
            onChange={(selected) => setForm({ ...form, [filter.field]: selected })}
            placeholder="Todos"
          />
        )

      case FILTER_TYPES.BOOLEAN:
        return (
          <select
            value={form[filter.field] || ''}
            onChange={(e) => setForm({ ...form, [filter.field]: e.target.value })}
            style={selectStyle}
          >
            <option value="">Todos</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        )

      default:
        return null
    }
  }
}

export default GenericTableFull
