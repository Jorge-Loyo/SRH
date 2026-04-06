import React, { useState, useEffect, useRef } from 'react'
import { Box, H3, Text, Button, Icon } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import Pagination from '../reutilizables/Pagination'
import ErrorFallback from '../reutilizables/ErrorFallback'
import ScrollTrap from '../reutilizables/ScrollTrap'
import RecorridaModal from './RecorridaModal'
import MinutaModal from './MinutaModal'
import { useCurrentAdmin } from 'adminjs'

// Inyectar estilos CSS globales para previsualización de recorridas (solo una vez)
if (typeof document !== 'undefined' && !document.getElementById('recorrida-preview-styles')) {
  const style = document.createElement('style')
  style.id = 'recorrida-preview-styles'
  style.textContent = `
    .recorrida-content strong {
      font-weight: bold;
    }
    .recorrida-content em {
      font-style: italic;
    }
    .recorrida-content u {
      text-decoration: underline;
    }
    .recorrida-content s {
      text-decoration: line-through;
    }
    .recorrida-content ol {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }
    .recorrida-content ul {
      padding-left: 1.5em;
      margin: 0.5em 0;
    }
    .recorrida-content li {
      margin-bottom: 4px;
    }
    .recorrida-content blockquote {
      border-left: 4px solid #ccc;
      margin: 5px 0;
      padding-left: 16px;
      color: #666;
    }
    .recorrida-content code {
      background-color: #f0f0f0;
      border-radius: 3px;
      padding: 2px 4px;
      font-size: 0.95em;
      font-family: monospace;
    }
    .recorrida-content pre {
      background-color: #f0f0f0;
      border-radius: 3px;
      padding: 10px;
      overflow: auto;
      font-size: 13px;
      font-family: monospace;
      margin: 5px 0;
    }
    .recorrida-content a {
      text-decoration: underline;
      color: #0066cc;
    }
    .recorrida-content h1 {
      font-size: 2em;
      margin: 0.67em 0;
      font-weight: bold;
    }
    .recorrida-content h2 {
      font-size: 1.5em;
      margin: 0.83em 0;
      font-weight: bold;
    }
    .recorrida-content h3 {
      font-size: 1.17em;
      margin: 1em 0;
      font-weight: bold;
    }
    .recorrida-content h4, .recorrida-content h5, .recorrida-content h6 {
      margin: 0.75em 0;
      font-weight: bold;
    }
    .recorrida-content p {
      margin: 0.5em 0;
    }
  `
  document.head.appendChild(style)
}

/**
 * Página de detalle de recorridas para un hospital específico
 * Muestra listado de recorridas y permite crear nuevas
 * Exclusivo para admin, editor, viewer (NO director)
 * 
 * IMPORTANTE - Excepción de permisos:
 * - Rol "viewer" es una EXCEPCIÓN: puede crear y editar recorridas, pero NO eliminarlas
 * - Esta excepción está hardcodeada porque NO está reflejada en la tabla permissions de BD
 * - Todos los demás permisos se obtienen directamente de la BD (tabla permissions)
 * - Si en el futuro se necesita cambiar permisos, actualizar la tabla permissions y remover la excepción
 */
const RecorridasDetalle = () => {
  const [currentAdmin] = useCurrentAdmin()
  const userRole = currentAdmin?.role
  const permissions = currentAdmin?.permissions
  
  // Permisos basados en BD para todos los roles
  // viewer: solo lectura (can_create=0, can_update=0, can_delete=0 en BD)
  // gerencia: CRUD completo en recorridas/minutas (can_create=1, can_update=1, can_delete=1 en BD)
  // Otros roles (admin, editor): usan permisos de BD
  const canCreate = permissions?.can_create ?? false
  const canEdit = permissions?.can_update ?? false
  const canDelete = permissions?.can_delete ?? false

  // Obtener hospital_code de la URL
  const getParam = (name) => {
    try {
      const usp = new URLSearchParams(window.location.search)
      return usp.get(name) || ''
    } catch {
      return ''
    }
  }

  const hospitalCode = getParam('hospital') || 'HGACA'

  // Estado para tabs
  const [activeTab, setActiveTab] = useState('recorridas') // 'recorridas' o 'minutas'

  // Refs para scroll management
  const recorridasContainerRef = useRef(null)
  const minutasContainerRef = useRef(null)

  // Estados para Recorridas
  const [recorridas, setRecorridas] = useState([])
  const [recorridasLoading, setRecorridasLoading] = useState(true)
  const [recorridasError, setRecorridasError] = useState(null)
  const [recorridaModalOpen, setRecorridaModalOpen] = useState(false)
  const [expandedRecorridaIds, setExpandedRecorridaIds] = useState(new Set())
  const [deleteRecorridaConfirm, setDeleteRecorridaConfirm] = useState({ open: false, id: null })
  const [editingRecorrida, setEditingRecorrida] = useState(null)
  const [recorridasCurrentPage, setRecorridasCurrentPage] = useState(1)

  // Estados para Minutas
  const [minutas, setMinutas] = useState([])
  const [minutasLoading, setMinutasLoading] = useState(true)
  const [minutasError, setMinutasError] = useState(null)
  const [minutaModalOpen, setMinutaModalOpen] = useState(false)
  const [expandedMinutaIds, setExpandedMinutaIds] = useState(new Set())
  const [deleteMinutaConfirm, setDeleteMinutaConfirm] = useState({ open: false, id: null })
  const [editingMinuta, setEditingMinuta] = useState(null)
  const [minutasCurrentPage, setMinutasCurrentPage] = useState(1)
  const [fullscreenMinuta, setFullscreenMinuta] = useState(null) // minuta completa para overlay fullscreen
  
  // Estados para totales desde servidor
  const [recorridasTotal, setRecorridasTotal] = useState(0)
  const [minutasTotal, setMinutasTotal] = useState(0)
  
  // Paginación: 5 por página
  const ITEMS_PER_PAGE = 5
  const recorridasTotalPages = Math.ceil(recorridas.length / ITEMS_PER_PAGE)
  const minutasTotalPages = Math.ceil(minutas.length / ITEMS_PER_PAGE)
  const paginatedRecorridas = recorridas.slice((recorridasCurrentPage - 1) * ITEMS_PER_PAGE, recorridasCurrentPage * ITEMS_PER_PAGE)
  const paginatedMinutas = minutas.slice((minutasCurrentPage - 1) * ITEMS_PER_PAGE, minutasCurrentPage * ITEMS_PER_PAGE)

  // Fetch recorridas
  const fetchRecorridas = async () => {
    setRecorridasLoading(true)
    setRecorridasError(null)
    try {
      const response = await fetch(
        `/api/recorridas?hospital_code=${hospitalCode}&limit=500`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const rows = data.rows || []
      const savedOrderR = (() => { try { const s = localStorage.getItem(`recorridas_order_${hospitalCode}`); return s ? JSON.parse(s) : null } catch { return null } })()
      if (savedOrderR) {
        const ordered = savedOrderR.map(id => rows.find(r => r.id === id)).filter(Boolean)
        const rest = rows.filter(r => !savedOrderR.includes(r.id))
        setRecorridas([...ordered, ...rest])
      } else {
        setRecorridas(rows)
      }
      setRecorridasTotal(data.total || 0)
    } catch (err) {
      setRecorridasError(err.message)
    } finally {
      setRecorridasLoading(false)
    }
  }

  // Fetch minutas
  const fetchMinutas = async () => {
    setMinutasLoading(true)
    setMinutasError(null)
    try {
      const response = await fetch(
        `/api/minutas?hospital_code=${hospitalCode}&limit=500`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const rows = data.rows || []
      const savedOrderM = (() => { try { const s = localStorage.getItem(`minutas_order_${hospitalCode}`); return s ? JSON.parse(s) : null } catch { return null } })()
      if (savedOrderM) {
        const ordered = savedOrderM.map(id => rows.find(r => r.id === id)).filter(Boolean)
        const rest = rows.filter(r => !savedOrderM.includes(r.id))
        setMinutas([...ordered, ...rest])
      } else {
        setMinutas(rows)
      }
      setMinutasTotal(data.total || 0)
    } catch (err) {
      setMinutasError(err.message)
    } finally {
      setMinutasLoading(false)
    }
  }

  useEffect(() => {
    fetchRecorridas()
  }, [hospitalCode])

  useEffect(() => {
    fetchMinutas()
  }, [hospitalCode])

  // Mover recorrida arriba/abajo (orden local persistido en localStorage)
  const moveRecorrida = (globalIdx, dir) => {
    setRecorridas(prev => {
      const arr = [...prev]
      const target = globalIdx + dir
      if (target < 0 || target >= arr.length) return prev
      ;[arr[globalIdx], arr[target]] = [arr[target], arr[globalIdx]]
      try { localStorage.setItem(`recorridas_order_${hospitalCode}`, JSON.stringify(arr.map(r => r.id))) } catch {}
      return arr
    })
  }

  // Mover minuta arriba/abajo (orden local persistido en localStorage)
  const moveMinuta = (globalIdx, dir) => {
    setMinutas(prev => {
      const arr = [...prev]
      const target = globalIdx + dir
      if (target < 0 || target >= arr.length) return prev
      ;[arr[globalIdx], arr[target]] = [arr[target], arr[globalIdx]]
      try { localStorage.setItem(`minutas_order_${hospitalCode}`, JSON.stringify(arr.map(m => m.id))) } catch {}
      return arr
    })
  }

  // Handlers para Recorridas
  const openEditRecorridaModal = (recorrida) => {
    setEditingRecorrida(recorrida)
    setRecorridaModalOpen(true)
  }

  const closeRecorridaModal = () => {
    setRecorridaModalOpen(false)
    setEditingRecorrida(null)
  }

  const openDeleteRecorridaConfirm = (id) => {
    setDeleteRecorridaConfirm({ open: true, id })
  }

  const closeDeleteRecorridaConfirm = () => {
    setDeleteRecorridaConfirm({ open: false, id: null })
  }

  const handleDeleteRecorrida = async () => {
    const { id } = deleteRecorridaConfirm
    closeDeleteRecorridaConfirm()

    try {
      const response = await fetch(`/api/recorridas/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }

      fetchRecorridas()
    } catch (err) {
      console.error('Error deleting recorrida:', err)
      alert('Error al eliminar la recorrida')
    }
  }

  const toggleExpandRecorrida = (id) => {
    const newSet = new Set(expandedRecorridaIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedRecorridaIds(newSet)
  }

  // Handlers para Minutas
  const openEditMinutaModal = (minuta) => {
    setEditingMinuta(minuta)
    setMinutaModalOpen(true)
  }

  const closeMinutaModal = () => {
    setMinutaModalOpen(false)
    setEditingMinuta(null)
  }

  const openDeleteMinutaConfirm = (id) => {
    setDeleteMinutaConfirm({ open: true, id })
  }

  const closeDeleteMinutaConfirm = () => {
    setDeleteMinutaConfirm({ open: false, id: null })
  }

  const handleDeleteMinuta = async () => {
    const { id } = deleteMinutaConfirm
    closeDeleteMinutaConfirm()

    try {
      const response = await fetch(`/api/minutas/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Error ${response.status}`)
      }

      fetchMinutas()
    } catch (err) {
      console.error('Error deleting minuta:', err)
      alert('Error al eliminar la minuta')
    }
  }

  const toggleExpandMinuta = (id) => {
    const newSet = new Set(expandedMinutaIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setExpandedMinutaIds(newSet)
  }

  // Verificación de permisos (director NO puede acceder)
  if (userRole === 'director') {
    return (
      <Box style={{ padding: 24 }}>
        <BackButton />
        <Box
          p="xl"
          style={{
            border: '2px solid #ef4444',
            borderRadius: 10,
            background: '#fee',
            color: '#991b1b',
            marginTop: 16
          }}
        >
          <H3 style={{ color: '#991b1b', margin: 0, marginBottom: 8 }}>Acceso Denegado</H3>
          <Text style={{ color: '#991b1b' }}>
            No tiene permisos para acceder a la funcionalidad de Recorridas/Seguimiento.
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box style={{ padding: 24 }}>
      <BackButton />
      
      {/* Header */}
      <Box
        style={{
          marginTop: 16,
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box>
          <H3 style={{ margin: 0, fontSize: 22 }}>Recorridas y Minutas - {hospitalCode}</H3>
          <Text style={{ margin: 0, opacity: 0.7, fontSize: 14 }}>
            Historial de seguimientos del hospital
          </Text>
        </Box>
        {canCreate && (
          <Box style={{ display: 'flex', gap: 12 }}>
            <Button
              onClick={() => setRecorridaModalOpen(true)}
              style={{
                backgroundColor: '#fff',
                color: '#111',
                padding: '10px 20px',
                fontSize: 14,
                border: '1px solid #111',
                borderRadius: 6
              }}
            >
              Nueva Recorrida
            </Button>
            <Button
              onClick={() => setMinutaModalOpen(true)}
              style={{
                backgroundColor: '#111',
                color: '#fff',
                padding: '10px 20px',
                fontSize: 14,
                border: '1px solid #111',
                borderRadius: 6
              }}
            >
              Nueva Minuta
            </Button>
          </Box>
        )}
      </Box>

      {/* Tabs */}
      <Box style={{ marginBottom: 24, borderBottom: '2px solid #e5e7eb' }}>
        <Box style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setActiveTab('recorridas')}
            style={{
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'recorridas' ? '2px solid #111' : '2px solid transparent',
              color: activeTab === 'recorridas' ? '#111' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: -2
            }}
          >
            Recorridas ({recorridas.length})
          </button>
          <button
            onClick={() => setActiveTab('minutas')}
            style={{
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'minutas' ? '2px solid #111' : '2px solid transparent',
              color: activeTab === 'minutas' ? '#111' : '#666',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: -2
            }}
          >
            Minutas ({minutas.length})
          </button>
        </Box>
      </Box>

      {/* Contenido de Recorridas */}
      {activeTab === 'recorridas' && (
        <>
          {/* Loading */}
          {recorridasLoading && (
            <Box style={{ textAlign: 'center', padding: 40 }}>
              <Text color="subtle">Cargando recorridas...</Text>
            </Box>
          )}

          {/* Error */}
          {recorridasError && (
            <ErrorFallback
              error={recorridasError}
              onRetry={() => loadRecorridas()}
              componentName="RecorridasDetalle - Recorridas"
            />
          )}

          {/* Lista de recorridas */}
          {!recorridasLoading && !recorridasError && (
            recorridas.length === 0 ? (
              <Box
                p="xl"
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: 10,
                  textAlign: 'center',
                  color: '#666'
                }}
              >
                <Icon icon="FileText" style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                <H3 style={{ color: '#666' }}>No hay recorridas registradas</H3>
                <Text style={{ color: '#888' }}>
                  Haga clic en "Nueva Recorrida" para crear la primera
                </Text>
              </Box>
            ) : (
              <Box ref={recorridasContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {paginatedRecorridas.map((recorrida, idx) => {
                const globalIdx = (recorridasCurrentPage - 1) * ITEMS_PER_PAGE + idx
                const isExpanded = expandedRecorridaIds.has(recorrida.id)
                const createdAt = new Date(recorrida.created_at).toLocaleString('es-AR')
                const updatedAt = new Date(recorrida.updated_at).toLocaleString('es-AR')

                return (
                  <Box
                    key={recorrida.id}
                    p="lg"
                    style={{
                      border: '1px solid #dee2e6',
                      borderRadius: 10,
                      background: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Header de la recorrida */}
                    <Box
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 12
                      }}
                    >
                      <Box style={{ flex: 1 }}>
                        <H3 style={{ margin: 0, marginBottom: 8 }}>
                          {recorrida.titulo}
                        </H3>
                        <Box style={{ display: 'flex', gap: 16, fontSize: 13, color: '#666' }}>
                          <Text style={{ fontSize: 13, color: '#666' }}>
                            <Icon icon="User" style={{ marginRight: 4 }} />
                            {recorrida.user?.username || 'Usuario desconocido'}
                          </Text>
                          <Text style={{ fontSize: 13, color: '#666' }}>
                            <Icon icon="Calendar" style={{ marginRight: 4 }} />
                            {createdAt}
                          </Text>
                          {recorrida.created_at !== recorrida.updated_at && (
                            <Text style={{ fontSize: 13, color: '#666' }}>
                              <Icon icon="Edit" style={{ marginRight: 4 }} />
                              Editado: {updatedAt}
                            </Text>
                          )}
                        </Box>
                      </Box>

                      {/* Botones de acción */}
                      <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {/* Botones de orden */}
                        <Box style={{ display: 'flex', flexDirection: 'column', gap: 0, marginRight: 4 }}>
                          <button
                            onClick={() => moveRecorrida(globalIdx, -1)}
                            disabled={globalIdx === 0}
                            title="Mover arriba"
                            style={{ background: 'none', border: 'none', cursor: globalIdx === 0 ? 'default' : 'pointer', fontSize: 11, color: globalIdx === 0 ? '#d1d5db' : '#6b7280', padding: '1px 4px', lineHeight: 1 }}
                          >&#9650;</button>
                          <button
                            onClick={() => moveRecorrida(globalIdx, 1)}
                            disabled={globalIdx === recorridas.length - 1}
                            title="Mover abajo"
                            style={{ background: 'none', border: 'none', cursor: globalIdx === recorridas.length - 1 ? 'default' : 'pointer', fontSize: 11, color: globalIdx === recorridas.length - 1 ? '#d1d5db' : '#6b7280', padding: '1px 4px', lineHeight: 1 }}
                          >&#9660;</button>
                        </Box>
                        <Button
                          size="sm"
                          variant="text"
                          onClick={() => toggleExpandRecorrida(recorrida.id)}
                        >
                          <Icon icon={isExpanded ? 'ChevronUp' : 'ChevronDown'} />
                          {isExpanded ? 'Ocultar' : 'Ver más'}
                        </Button>
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="text"
                            onClick={() => openEditRecorridaModal(recorrida)}
                            style={{ color: '#2563eb' }}
                          >
                            <Icon icon="Edit" />
                            Editar
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="text"
                            onClick={() => openDeleteRecorridaConfirm(recorrida.id)}
                            style={{ color: '#ef4444' }}
                          >
                            <Icon icon="Trash" />
                            Eliminar
                          </Button>
                        )}
                      </Box>
                    </Box>

                    {/* Contenido expandible */}
                    {isExpanded && (
                      <Box
                        className="recorrida-content"
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: '1px solid #e5e7eb',
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: '#374151'
                        }}
                      >
                        <Box
                          dangerouslySetInnerHTML={{ __html: recorrida.contenido_html }}
                        />
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
            )
          )}
          
          {/* Controles de paginación */}
          {recorridas.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={recorridasCurrentPage}
              totalPages={recorridasTotalPages}
              totalRecords={recorridas.length}
              onPageChange={setRecorridasCurrentPage}
              loading={recorridasLoading}
              tableRef={recorridasContainerRef}
            />
          )}
        </>
      )}

      {/* Contenido de Minutas */}
      {activeTab === 'minutas' && (
        <>
          {/* Loading */}
          {minutasLoading && (
            <Box style={{ textAlign: 'center', padding: 40 }}>
              <Text color="subtle">Cargando minutas...</Text>
            </Box>
          )}

          {/* Error */}
          {minutasError && (
            <ErrorFallback
              error={minutasError}
              onRetry={() => loadMinutas()}
              componentName="RecorridasDetalle - Minutas"
            />
          )}

          {/* Lista de minutas */}
          {!minutasLoading && !minutasError && (
            <>
              {minutas.length === 0 ? (
                <Box
                  p="xl"
                  style={{
                    border: '2px dashed #ccc',
                    borderRadius: 10,
                    textAlign: 'center',
                    color: '#666'
                  }}
                >
                  <Icon icon="Grid" style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
                  <H3 style={{ color: '#666' }}>No hay minutas registradas</H3>
                  <Text style={{ color: '#888' }}>
                    Haga clic en "Nueva Minuta" para crear la primera
                  </Text>
                </Box>
              ) : (
                <ScrollTrap style={{ maxHeight: '600px', overflow: 'auto', borderRadius: 10 }}>
                  <Box ref={minutasContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {paginatedMinutas.map((minuta, idx) => {
                    const globalIdx = (minutasCurrentPage - 1) * ITEMS_PER_PAGE + idx
                    const isExpanded = expandedMinutaIds.has(minuta.id)
                    const createdAt = new Date(minuta.created_at).toLocaleString('es-AR')

                    return (
                      <Box
                        key={minuta.id}
                        p="lg"
                        style={{
                          border: '1px solid #dee2e6',
                          borderRadius: 10,
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}
                      >
                        {/* Header de la minuta */}
                        <Box
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: 12
                          }}
                        >
                          <Box style={{ flex: 1 }}>
                            <H3 style={{ margin: 0, marginBottom: 8 }}>
                              {minuta.titulo}
                            </H3>
                            <Box style={{ display: 'flex', gap: 16, fontSize: 13, color: '#666' }}>
                              <Text style={{ fontSize: 13, color: '#666' }}>
                                <Icon icon="User" style={{ marginRight: 4 }} />
                                {minuta.user?.username || 'Usuario desconocido'}
                              </Text>
                              <Text style={{ fontSize: 13, color: '#666' }}>
                                <Icon icon="Calendar" style={{ marginRight: 4 }} />
                                {createdAt}
                              </Text>
                              <Text style={{ fontSize: 13, color: '#666' }}>
                                <Icon icon="Grid" style={{ marginRight: 4 }} />
                                {minuta.datos_tabla?.rows?.length || 0} filas × {minuta.datos_tabla?.columns?.length || 0} columnas
                              </Text>
                            </Box>
                          </Box>

                          {/* Botones de acción */}
                          <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {/* Botones de orden */}
                            <Box style={{ display: 'flex', flexDirection: 'column', gap: 0, marginRight: 4 }}>
                              <button
                                onClick={() => moveMinuta(globalIdx, -1)}
                                disabled={globalIdx === 0}
                                title="Mover arriba"
                                style={{ background: 'none', border: 'none', cursor: globalIdx === 0 ? 'default' : 'pointer', fontSize: 11, color: globalIdx === 0 ? '#d1d5db' : '#6b7280', padding: '1px 4px', lineHeight: 1 }}
                              >&#9650;</button>
                              <button
                                onClick={() => moveMinuta(globalIdx, 1)}
                                disabled={globalIdx === minutas.length - 1}
                                title="Mover abajo"
                                style={{ background: 'none', border: 'none', cursor: globalIdx === minutas.length - 1 ? 'default' : 'pointer', fontSize: 11, color: globalIdx === minutas.length - 1 ? '#d1d5db' : '#6b7280', padding: '1px 4px', lineHeight: 1 }}
                              >&#9660;</button>
                            </Box>
                            <Button
                              size="sm"
                              variant="text"
                              onClick={() => toggleExpandMinuta(minuta.id)}
                            >
                              <Icon icon={isExpanded ? 'ChevronUp' : 'ChevronDown'} />
                              {isExpanded ? 'Ocultar' : 'Ver más'}
                            </Button>
                            <Button
                              size="sm"
                              variant="text"
                              onClick={() => setFullscreenMinuta(minuta)}
                              style={{ color: '#6b7280' }}
                              title="Ver en pantalla completa"
                            >
                              <Icon icon="Maximize" />
                              Expandir
                            </Button>
                            {canEdit && (
                              <Button
                                size="sm"
                                variant="text"
                                onClick={() => openEditMinutaModal(minuta)}
                                style={{ color: '#2563eb' }}
                              >
                                <Icon icon="Edit" />
                                Editar
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="text"
                                onClick={() => openDeleteMinutaConfirm(minuta.id)}
                                style={{ color: '#ef4444' }}
                              >
                                <Icon icon="Trash" />
                                Eliminar
                              </Button>
                            )}
                          </Box>
                        </Box>

                        {/* Contenido expandible - Tabla */}
                        {isExpanded && minuta.datos_tabla && (
                          <Box
                            style={{
                              marginTop: 16,
                              paddingTop: 16,
                              borderTop: '1px solid #e5e7eb',
                              overflowX: 'auto',
                              overflowY: 'auto',
                              maxHeight: 400
                            }}
                          >
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 'max-content' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f5f5f5' }}>
                                  {minuta.datos_tabla.columns?.map((col) => (
                                    <th key={col.id} style={{ padding: 8, textAlign: 'left', borderBottom: '2px solid #ddd', whiteSpace: 'pre-wrap', minWidth: 160, verticalAlign: 'top' }}>
                                      {col.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {minuta.datos_tabla.rows?.map((row, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                                    {minuta.datos_tabla.columns?.map((col) => (
                                      <td key={col.id} style={{ padding: 8, whiteSpace: 'pre-wrap', verticalAlign: 'top', minWidth: 160 }}>
                                        {row[col.id] || '-'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </Box>
                        )}
                      </Box>
                    )
                  })}
                </Box>                </ScrollTrap>              )}
            </>
          )}

          {minutas.length > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={minutasCurrentPage}
              totalPages={minutasTotalPages}
              totalRecords={minutas.length}
              onPageChange={setMinutasCurrentPage}
              loading={minutasLoading}
              tableRef={minutasContainerRef}
            />
          )}
        </>
      )}

      {/* Overlay fullscreen de minuta */}
      {fullscreenMinuta && (
        <Box style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
          padding: '40px 48px'
        }}>
          <Box style={{
            display: 'flex', flexDirection: 'column',
            width: '100%', height: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)'
          }}>
          {/* Header */}
          <Box style={{
            background: '#1a2e44', color: '#fff',
            padding: '14px 24px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexShrink: 0
          }}>
            <Box>
              <Text style={{ fontWeight: 700, fontSize: 16, color: '#fff', margin: 0 }}>{fullscreenMinuta.titulo}</Text>
              <Text style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
                {fullscreenMinuta.datos_tabla?.rows?.length || 0} filas × {fullscreenMinuta.datos_tabla?.columns?.length || 0} columnas
              </Text>
            </Box>
            <Button
              variant="text"
              onClick={() => setFullscreenMinuta(null)}
              style={{ color: '#fff', fontSize: 20, padding: '4px 10px', lineHeight: 1 }}
            >
              ✕
            </Button>
          </Box>
          {/* Tabla scrolleable */}
          <Box style={{ flex: 1, overflow: 'auto', background: '#fff', padding: 16 }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 14, minWidth: 'max-content', width: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                  {fullscreenMinuta.datos_tabla?.columns?.map((col) => (
                    <th key={col.id} style={{
                      padding: '10px 14px', textAlign: 'left',
                      borderBottom: '2px solid #cbd5e1', borderRight: '1px solid #e2e8f0',
                      whiteSpace: 'pre-wrap', minWidth: 200, maxWidth: 400,
                      verticalAlign: 'top', fontWeight: 600, color: '#1e3a5f'
                    }}>
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fullscreenMinuta.datos_tabla?.rows?.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 ? '#f8fafc' : '#fff' }}>
                    {fullscreenMinuta.datos_tabla.columns?.map((col) => (
                      <td key={col.id} style={{
                        padding: '10px 14px', verticalAlign: 'top',
                        borderRight: '1px solid #e2e8f0',
                        whiteSpace: 'pre-wrap', minWidth: 200, maxWidth: 400,
                        lineHeight: '1.5'
                      }}>
                        {row[col.id] || <span style={{ color: '#9ca3af' }}>-</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          </Box>
        </Box>
      )}

      {/* Modal para crear/editar recorrida */}
      <RecorridaModal
        isOpen={recorridaModalOpen}
        onClose={closeRecorridaModal}
        hospitalCode={hospitalCode}
        editData={editingRecorrida}
        onSuccess={() => {
          fetchRecorridas()
          closeRecorridaModal()
        }}
      />

      {/* Modal para crear/editar minuta */}
      <MinutaModal
        isOpen={minutaModalOpen}
        onClose={closeMinutaModal}
        hospitalCode={hospitalCode}
        editData={editingMinuta}
        onSuccess={() => {
          fetchMinutas()
          closeMinutaModal()
        }}
      />

      {/* Modal de confirmación de eliminación de recorrida */}
      {deleteRecorridaConfirm.open && (
        <>
          <Box
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={closeDeleteRecorridaConfirm}
          >
            <Box
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                width: '90%',
                maxWidth: 450,
                padding: 24
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <H3 style={{ margin: 0, marginBottom: 16 }}>¿Está seguro de eliminar esta recorrida?</H3>
              <Text style={{ marginBottom: 24, color: '#666' }}>
                Esta acción no se puede deshacer.
              </Text>
              <Box style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button
                  variant="text"
                  onClick={closeDeleteRecorridaConfirm}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteRecorrida}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  Aceptar
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}

      {/* Modal de confirmación de eliminación de minuta */}
      {deleteMinutaConfirm.open && (
        <>
          <Box
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={closeDeleteMinutaConfirm}
          >
            <Box
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                width: '90%',
                maxWidth: 450,
                padding: 24
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <H3 style={{ margin: 0, marginBottom: 16 }}>¿Está seguro de eliminar esta minuta?</H3>
              <Text style={{ marginBottom: 24, color: '#666' }}>
                Esta acción no se puede deshacer.
              </Text>
              <Box style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button
                  variant="text"
                  onClick={closeDeleteMinutaConfirm}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDeleteMinuta}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  Aceptar
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}

      <UserInfo />
    </Box>
  )
}

export default RecorridasDetalle
