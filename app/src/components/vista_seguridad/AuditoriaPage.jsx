import React, { useEffect, useState, useMemo } from 'react'
import { Box, H3, Text, Table, TableHead, TableRow, TableCell, TableBody, Button, Icon, Input, Label } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'

const AuditoriaPage = () => {
  const [state, setState] = useState({
    loading: true,
    logs: [],
    page: 1,
    perPage: 10,
    total: 0,
    filters: {
      user_username: '',
      action: '',
      resource: '',
      dateFrom: '',
      dateTo: ''
    }
  })
  
  const { error, handleError, clearError } = useErrorHandler()

  async function loadLogs() {
    setState(s => ({ ...s, loading: true }))
    try {
      const response = await fetch('/admin/api/auditoria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          page: 1,  // ← Siempre traer desde página 1 (sin paginación en servidor)
          perPage: 10000,  // ← Traer TODOS los registros que cumplen filtros (sin limit hardcode)
          filters: state.filters
        })
      })
      
      const data = await response.json()
      
      setState(s => ({
        ...s,
        logs: data.logs || [],
        total: data.total || 0,
        page: 1,  // ← Resetear a página 1 cuando cargan nuevos datos
        loading: false
      }))
      clearError()
    } catch (e) {
      handleError(e, 'AuditoriaPage.loadLogs')
    }
  }

  useEffect(() => {
    loadLogs()
    // ✅ Se ejecuta SOLO cuando filtros cambian, NO cuando page cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters.user_username, state.filters.action, state.filters.resource, state.filters.dateFrom, state.filters.dateTo])

  const handleFilterChange = (field, value) => {
    setState(s => ({
      ...s,
      filters: { ...s.filters, [field]: value }
    }))
  }

  const applyFilters = () => {
    setState(s => ({ ...s, page: 1 }))
    loadLogs()
  }

  const clearFilters = () => {
    setState(s => ({
      ...s,
      filters: {
        user_username: '',
        action: '',
        resource: '',
        dateFrom: '',
        dateTo: ''
      },
      page: 1
    }))
    // El useEffect reacciona al cambio de filtros y recarga automáticamente
  }

  const totalPages = Math.ceil(state.total / state.perPage)

  const getActionInfo = (action) => {
    const info = {
      'login_success': { emoji: '✔️', label: 'Login OK', bg: '#dcfce7', color: '#166534' },
      'login_fail': { emoji: '✗️', label: 'Login Error', bg: '#fee2e2', color: '#991b1b' },
      'create': { emoji: '✅', label: 'Crear', bg: '#dcfce7', color: '#166534' },
      'update': { emoji: '📝', label: 'Actualizar', bg: '#dbeafe', color: '#1e40af' },
      'delete': { emoji: '❌', label: 'Eliminar', bg: '#fee2e2', color: '#991b1b' },
      'export': { emoji: '📤', label: 'Exportar', bg: '#f3e8ff', color: '#6b21a8' }
    }
    return info[action] || { emoji: '•', label: action || '-', bg: '#f3f4f6', color: '#374151' }
  }

  const getStatusColor = (status) => {
    if (status >= 200 && status < 300) {
      return { bg: '#dcfce7', color: '#166534' }  // Verde (éxito)
    } else if (status >= 400 && status < 500) {
      return { bg: '#dbeafe', color: '#1e40af' }  // Azul (client error)
    } else if (status >= 500) {
      return { bg: '#fee2e2', color: '#991b1b' }  // Rojo (server error)
    }
    return { bg: '#f3f4f6', color: '#374151' }
  }

  const getRoleColor = (role) => {
    const colors = {
      'admin': { bg: '#dbeafe', color: '#1e40af' },
      'editor': { bg: '#dcfce7', color: '#166534' },
      'viewer': { bg: '#f3e8ff', color: '#6b21a8' },
      'director': { bg: '#fce7f3', color: '#9f1239' },
    }
    return colors[role] || { bg: '#f3f4f6', color: '#374151' }
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={() => loadLogs()} componentName="AuditoriaPage" />
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <UserInfo />
      
      <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Box mb="lg">
          <H3 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>
            📊 Auditoría del Sistema
          </H3>
          <Text style={{ color: '#6b7280' }}>
            Registro completo de todas las acciones realizadas en el sistema
          </Text>
        </Box>

        {/* Filtros */}
        <Box style={{ 
          background: '#fff', 
          padding: '20px', 
          borderRadius: '10px', 
          marginBottom: '24px',
          border: '1px solid #111',
          boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
        }}>
          <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
            <Box>
              <Label>Usuario</Label>
              <Input
                value={state.filters.user_username}
                onChange={(e) => handleFilterChange('user_username', e.target.value)}
                placeholder="Buscar por usuario..."
              />
            </Box>
            
            <Box>
              <Label>Acción</Label>
              <select
                value={state.filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              >
                <option value="">Todas</option>
                <option value="login_success">Login exitoso</option>
                <option value="login_fail">Login fallido</option>
                <option value="create">Crear</option>
                <option value="update">Actualizar</option>
                <option value="delete">Eliminar</option>
                <option value="export">Exportar</option>
              </select>
            </Box>
            
            <Box>
              <Label>Recurso</Label>
              <Input
                value={state.filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                placeholder="ej: Persona, User..."
              />
            </Box>
            
            <Box>
              <Label>Desde</Label>
              <Input
                type="date"
                value={state.filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </Box>
            
            <Box>
              <Label>Hasta</Label>
              <Input
                type="date"
                value={state.filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </Box>
          </Box>
          
          <Box style={{ display: 'flex', gap: 12 }}>
            <Button onClick={applyFilters} variant="primary">
              <Icon icon="Filter" style={{ marginRight: 8 }} />
              Aplicar Filtros
            </Button>
            <Button onClick={clearFilters} variant="text">
              Limpiar
            </Button>
          </Box>
        </Box>

        {/* Tabla */}
        {state.loading ? (
          <Box style={{ textAlign: 'center', padding: 40 }}>
            <Text>⏳ Cargando auditoría...</Text>
          </Box>
        ) : error ? (
          <ErrorFallback error={error} onRetry={() => loadLogs()} componentName="AuditoriaPage" />
        ) : (
          <>
            <Box style={{ 
              background: '#fff', 
              borderRadius: '10px', 
              overflow: 'hidden',
              border: '1px solid #111',
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              maxHeight: 600,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box style={{ overflowY: 'auto', flex: 1 }}>
                <Table>
                  <TableHead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <TableRow style={{ background: '#F4F6F8' }}>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Fecha/Hora</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Usuario</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Rol</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Acción</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Recurso</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>ID</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>IP</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {state.logs.slice((state.page - 1) * state.perPage, state.page * state.perPage).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                          <Box>
                            <Text style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>📊 Sin registros</Text>
                            <Text style={{ fontSize: 13 }}>No hay registros de auditoría que coincidan con los filtros</Text>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      state.logs.slice((state.page - 1) * state.perPage, state.page * state.perPage).map((log, idx) => {
                        const actionInfo = getActionInfo(log.action)
                        const roleColor = getRoleColor(log.user_role)
                        const statusColor = getStatusColor(log.status)
                        return (
                          <TableRow key={log.id || idx} style={{ background: idx % 2 ? '#F7F7F7' : '#FFFFFF' }}>
                            <TableCell style={{ fontSize: 13, fontWeight: 500 }}>
                              {new Date(log.created_at).toLocaleString('es-AR')}
                            </TableCell>
                            <TableCell style={{ fontWeight: 500 }}>
                              {log.user_username || '-'}
                            </TableCell>
                            <TableCell>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: roleColor.bg,
                                color: roleColor.color,
                                textTransform: 'capitalize'
                              }}>
                                {log.user_role || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                background: actionInfo.bg,
                                color: actionInfo.color
                              }}>
                                {actionInfo.emoji} {actionInfo.label}
                              </span>
                            </TableCell>
                            <TableCell style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 500 }}>
                              {log.resource || '-'}
                            </TableCell>
                            <TableCell style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                              {log.record_id || '-'}
                            </TableCell>
                            <TableCell style={{ fontSize: 12, color: '#6b7280' }}>
                              {log.ip || '-'}
                            </TableCell>
                            <TableCell>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                background: statusColor.bg,
                                color: statusColor.color
                              }}>
                                {log.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>

            {/* Paginación */}
            <Box style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: 20,
              padding: '16px',
              borderRadius: '10px',
              border: '1px solid #111',
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
            }}>
              <Text style={{ fontSize: 14, color: '#6b7280' }}>
                Mostrando {((state.page - 1) * state.perPage) + 1} - {Math.min(state.page * state.perPage, state.total)} de {state.total} registros
              </Text>
              
              <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  onClick={() => setState(s => ({ ...s, page: Math.max(1, s.page - 1) }))}
                  disabled={state.page === 1}
                  size="sm"
                >
                  ◀ Anterior
                </Button>
                
                {/* Números de página */}
                <Box style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Mostrar página actual, página anterior, página siguiente, y primeras/últimas 2
                      if (page === state.page || 
                          page === state.page - 1 || 
                          page === state.page + 1 || 
                          page <= 2 || 
                          page >= totalPages - 1) {
                        return true
                      }
                      return false
                    })
                    .map((page, idx, arr) => {
                      // Si hay salto entre números, mostrar "..."
                      if (idx > 0 && arr[idx - 1] !== page - 1) {
                        return (
                          <span key={`dots-${idx}`} style={{ color: '#6b7280', padding: '0 4px' }}>
                            ...
                          </span>
                        )
                      }
                      
                      return (
                        <Button
                          key={page}
                          onClick={() => setState(s => ({ ...s, page }))}
                          size="sm"
                          style={{
                            minWidth: '32px',
                            padding: '4px 8px',
                            background: page === state.page ? '#0B5FFF' : '#f3f4f6',
                            color: page === state.page ? '#fff' : '#374151',
                            border: page === state.page ? '1px solid #0B5FFF' : '1px solid #d1d5db',
                            fontWeight: page === state.page ? '600' : '500',
                            cursor: 'pointer'
                          }}
                        >
                          {page}
                        </Button>
                      )
                    })}
                </Box>
                
                <Button
                  onClick={() => setState(s => ({ ...s, page: Math.min(totalPages, s.page + 1) }))}
                  disabled={state.page >= totalPages}
                  size="sm"
                >
                  Siguiente ▶
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  )
}

export default AuditoriaPage
