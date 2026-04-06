import React, { useEffect, useState, useMemo } from 'react'
import { Box, H3, Text, Table, TableHead, TableRow, TableCell, TableBody, Button, Icon, Input, Label } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import LoadingSpinner from '../reutilizables/LoadingSpinner'
import { useErrorHandler } from '../hooks/useErrorHandler'

const UsuariosPage = () => {
  const ITEMS_PER_PAGE = 10
  
  const [state, setState] = useState({
    loading: true,
    users: [],
    editingUser: null,
    showModal: false,
    error: null,
    currentPage: 1,
    lastRefresh: null
  })

  // Modal de confirmación para toggle de usuario
  const [toggleModal, setToggleModal] = useState({
    open: false,
    userId: null,
    currentStatus: null,
    username: null
  })
  
  const { error, handleError, clearError } = useErrorHandler()

  async function loadUsers() {
    setState(s => ({ ...s, loading: true }))
    try {
      const response = await fetch('/admin/api/usuarios', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      const data = await response.json()
      setState(s => ({
        ...s,
        users: data.users || [],
        loading: false,
        lastRefresh: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
      }))
      clearError()
    } catch (e) {
      handleError(e, 'UsuariosPage.loadUsers')
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEditUser = (user) => {
    setState(s => ({
      ...s,
      editingUser: { ...user, password: '' },
      showModal: true
    }))
  }

  const handleCreateUser = () => {
    setState(s => ({
      ...s,
      editingUser: {
        username: '',
        email: '',
        role: 'viewer',
        is_active: true,
        password: '',
        hospital_code: null
      },
      showModal: true
    }))
  }

  const handleSaveUser = async () => {
    if (!state.editingUser) return
    
    // ✅ Validaciones frontend
    if (!state.editingUser.username?.trim()) {
      alert('El nombre de usuario es requerido')
      return
    }
    
    if (!state.editingUser.id && !state.editingUser.password?.trim()) {
      alert('La contraseña es requerida para crear usuarios nuevos')
      return
    }
    
    if (state.editingUser.email && !state.editingUser.email.includes('@')) {
      alert('El formato del email es inválido')
      return
    }
    
    if (state.editingUser.role === 'director' && !state.editingUser.hospital_code?.trim()) {
      alert('El rol Director requiere un código de hospital')
      return
    }
    
    setState(s => ({ ...s, loading: true }))
    try {
      const method = state.editingUser.id ? 'PUT' : 'POST'
      const response = await fetch('/admin/api/usuarios', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(state.editingUser)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setState(s => ({ ...s, showModal: false, editingUser: null }))
        loadUsers()
      } else {
        handleError(new Error(data.error || 'No se pudo guardar el usuario'), 'UsuariosPage.handleSaveUser')
        setState(s => ({ ...s, loading: false }))
      }
    } catch (e) {
      handleError(e, 'UsuariosPage.handleSaveUser')
      setState(s => ({ ...s, loading: false }))
    }
  }

  const handleToggleActive = (userId, currentStatus, username) => {
    setToggleModal({
      open: true,
      userId,
      currentStatus,
      username
    })
  }

  const confirmToggleActive = async () => {
    const { userId, currentStatus } = toggleModal
    
    try {
      const response = await fetch(`/admin/api/usuarios/${userId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setToggleModal({ open: false, userId: null, currentStatus: null, username: null })
        loadUsers()
      } else {
        handleError(new Error(data.error || 'No se pudo cambiar el estado'), 'UsuariosPage.confirmToggleActive')
      }
    } catch (e) {
      handleError(e, 'UsuariosPage.confirmToggleActive')
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      'admin': { bg: '#dbeafe', text: '#1e40af' },
      'editor': { bg: '#e0e7ff', text: '#4338ca' },
      'viewer': { bg: '#f3f4f6', text: '#374151' },
      'director': { bg: '#fef3c7', text: '#92400e' },
      'gerencia': { bg: '#fff7ed', text: '#9a3412' }
    }
    return colors[role] || colors.viewer
  }

  if (error) {
    return <ErrorFallback error={error} onRetry={() => loadUsers()} componentName="UsuariosPage" />
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <UserInfo />
      
      <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Box mb="lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <H3 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>
              👥 Gestión de Usuarios
            </H3>
            <Text style={{ color: '#6b7280' }}>
              Administrar usuarios y roles del sistema
            </Text>
          </Box>
          
          <Button onClick={handleCreateUser} variant="primary" disabled={state.loading}>
            <Icon icon="Plus" style={{ marginRight: 8 }} />
            Nuevo Usuario
          </Button>
        </Box>

        {state.loading ? (
          <Box style={{ textAlign: 'center', padding: 40 }}>
            <Text>⏳ Cargando usuarios...</Text>
          </Box>
        ) : error ? (
          <ErrorFallback error={error} onRetry={() => loadUsers()} componentName="UsuariosPage" />
        ) : (
          <>
            <Box style={{ 
              background: '#fff', 
              borderRadius: '10px', 
              overflow: 'hidden',
              border: '1px solid #111',
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              maxHeight: state.users.length > ITEMS_PER_PAGE ? 600 : 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box style={{ overflowY: 'auto', flex: 1 }}>
                <Table>
                  <TableHead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <TableRow style={{ background: '#F4F6F8' }}>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>ID</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Usuario</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Email</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Rol</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Hospital</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Estado</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {state.users.slice((state.currentPage - 1) * ITEMS_PER_PAGE, state.currentPage * ITEMS_PER_PAGE).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                          <Box>
                            <Text style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>👤 Sin usuarios</Text>
                            <Text style={{ fontSize: 13 }}>No hay usuarios registrados en el sistema</Text>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      state.users.slice((state.currentPage - 1) * ITEMS_PER_PAGE, state.currentPage * ITEMS_PER_PAGE).map((user, idx) => (
                        <TableRow key={user.id} style={{ background: idx % 2 ? '#F7F7F7' : '#FFFFFF' }}>
                          <TableCell style={{ fontFamily: 'monospace', fontSize: 13, color: '#6b7280' }}>
                            #{user.id}
                          </TableCell>
                          <TableCell style={{ fontWeight: 600 }}>
                            {user.username}
                          </TableCell>
                          <TableCell style={{ fontSize: 14, color: '#374151' }}>
                            {user.email || '-'}
                          </TableCell>
                          <TableCell>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              background: getRoleColor(user.role).bg,
                              color: getRoleColor(user.role).text
                            }}>
                              {user.role}
                            </span>
                          </TableCell>
                          <TableCell style={{ fontSize: 13, color: '#6b7280' }}>
                            {user.hospital_code || '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={user.is_active ? 'success' : 'danger'}
                              onClick={() => handleToggleActive(user.id, user.is_active, user.username)}
                              disabled={state.loading}
                              style={{ opacity: state.loading ? 0.6 : 1, cursor: state.loading ? 'not-allowed' : 'pointer' }}
                            >
                              {state.loading ? <LoadingSpinner inline size="small" color="#fff" /> : (user.is_active ? 'Activo' : 'Inactivo')}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Box style={{ display: 'flex', gap: 8 }}>
                              <Button
                                size="sm"
                                onClick={() => handleEditUser(user)}
                              >
                                <Icon icon="Edit" />
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>

            {/* Paginación - solo mostrar si hay más de ITEMS_PER_PAGE usuarios */}
            {state.users.length > ITEMS_PER_PAGE && (
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
              Mostrando {((state.currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(state.currentPage * ITEMS_PER_PAGE, state.users.length)} de {state.users.length} usuarios
              {state.lastRefresh && <span style={{ fontSize: 12, marginLeft: 16, color: '#9ca3af' }}>🔄 Actualizado: {state.lastRefresh}</span>}
            </Text>
                
                <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Button
                    onClick={() => setState(s => ({ ...s, currentPage: Math.max(1, s.currentPage - 1) }))}
                    disabled={state.currentPage === 1}
                    size="sm"
                  >
                    ◀ Anterior
                  </Button>
                  
                  {/* Números de página */}
                  <Box style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {Array.from({ length: Math.ceil(state.users.length / ITEMS_PER_PAGE) }, (_, i) => i + 1)
                      .filter(page => {
                        const totalPages = Math.ceil(state.users.length / ITEMS_PER_PAGE)
                        if (page === state.currentPage || 
                            page === state.currentPage - 1 || 
                            page === state.currentPage + 1 || 
                            page <= 2 || 
                            page >= totalPages - 1) {
                          return true
                        }
                        return false
                      })
                      .map((page, idx, arr) => {
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
                            onClick={() => setState(s => ({ ...s, currentPage: page }))}
                            size="sm"
                            style={{
                              minWidth: '32px',
                              padding: '4px 8px',
                              background: page === state.currentPage ? '#0B5FFF' : '#f3f4f6',
                              color: page === state.currentPage ? '#fff' : '#374151',
                              border: page === state.currentPage ? '1px solid #0B5FFF' : '1px solid #d1d5db',
                              fontWeight: page === state.currentPage ? '600' : '500',
                              cursor: 'pointer'
                            }}
                          >
                            {page}
                          </Button>
                        )
                      })}
                  </Box>
                  
                  <Button
                    onClick={() => {
                      const totalPages = Math.ceil(state.users.length / ITEMS_PER_PAGE)
                      setState(s => ({ ...s, currentPage: Math.min(totalPages, s.currentPage + 1) }))
                    }}
                    disabled={state.currentPage >= Math.ceil(state.users.length / ITEMS_PER_PAGE)}
                    size="sm"
                  >
                    Siguiente ▶
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Modal de edición */}
      {state.showModal && state.editingUser && (
        <Box style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <Box style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #111',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <H3 style={{ marginBottom: 24, fontSize: 20, fontWeight: 700 }}>
              {state.editingUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}
            </H3>
            
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Box>
                <Label>Usuario * {state.editingUser.username && <span style={{ fontSize: 12, color: '#10b981' }}>✓ Válido</span>}</Label>
                <Input
                  value={state.editingUser.username}
                  onChange={(e) => setState(s => ({
                    ...s,
                    editingUser: { ...s.editingUser, username: e.target.value }
                  }))}
                  placeholder="nombre_usuario"
                  style={{
                    borderColor: state.editingUser.username?.trim() ? '#10b981' : undefined,
                    borderWidth: state.editingUser.username?.trim() ? '2px' : undefined
                  }}
                />
              </Box>
              
              <Box>
                <Label>Email {state.editingUser.email && state.editingUser.email.includes('@') && <span style={{ fontSize: 12, color: '#10b981' }}>✓ Válido</span>} {state.editingUser.email && !state.editingUser.email.includes('@') && <span style={{ fontSize: 12, color: '#ef4444' }}>✗ Inválido</span>}</Label>
                <Input
                  type="email"
                  value={state.editingUser.email || ''}
                  onChange={(e) => setState(s => ({
                    ...s,
                    editingUser: { ...s.editingUser, email: e.target.value }
                  }))}
                  placeholder="usuario@ejemplo.com"
                  style={{
                    borderColor: state.editingUser.email && state.editingUser.email.includes('@') ? '#10b981' : (state.editingUser.email && !state.editingUser.email.includes('@') ? '#ef4444' : undefined),
                    borderWidth: state.editingUser.email ? '2px' : undefined
                  }}
                />
              </Box>
              
              <Box>
                <Label>Rol *</Label>
                <select
                  value={state.editingUser.role}
                  onChange={(e) => setState(s => ({
                    ...s,
                    editingUser: { ...s.editingUser, role: e.target.value }
                  }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px'
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                  <option value="director">Director</option>
                  <option value="gerencia">Gerencia</option>
                </select>
              </Box>
              
              {state.editingUser.role === 'director' && (
                <Box>
                  <Label>Código de Hospital</Label>
                  <Input
                    value={state.editingUser.hospital_code || ''}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingUser: { ...s.editingUser, hospital_code: e.target.value }
                    }))}
                    placeholder="ej: HGACA"
                  />
                </Box>
              )}
              
              <Box>
                <Label>{state.editingUser.id ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña *'}</Label>
                <Input
                  type="password"
                  value={state.editingUser.password}
                  onChange={(e) => setState(s => ({
                    ...s,
                    editingUser: { ...s.editingUser, password: e.target.value }
                  }))}
                  placeholder="••••••••"
                />
              </Box>
              
              <Box style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <Button 
                  onClick={handleSaveUser} 
                  variant="primary" 
                  style={{ flex: 1 }}
                  disabled={state.loading}
                >
                  {state.loading ? '⏳ Guardando...' : 'Guardar'}
                </Button>
                <Button 
                  onClick={() => setState(s => ({ ...s, showModal: false, editingUser: null }))}
                  variant="text"
                  style={{ flex: 1 }}
                  disabled={state.loading}
                >
                  Cancelar
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* Modal de confirmación para toggle de usuario */}
      {toggleModal.open && (
        <>
          <Box
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setToggleModal({ open: false, userId: null, currentStatus: null, username: null })}
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
              <H3 style={{ margin: 0, marginBottom: 16, color: toggleModal.currentStatus ? '#991b1b' : '#047857' }}>
                {toggleModal.currentStatus ? '⚠️ Desactivar Usuario' : '✅ Activar Usuario'}
              </H3>
              <Text style={{ marginBottom: 8, color: '#666' }}>
                Usuario: <strong>{toggleModal.username}</strong>
              </Text>
              <Text style={{ marginBottom: 24, color: '#666' }}>
                {toggleModal.currentStatus 
                  ? 'Este usuario perderá acceso a la aplicación.'
                  : 'Este usuario volverá a tener acceso a la aplicación.'
                }
              </Text>
              <Box style={{ 
                backgroundColor: toggleModal.currentStatus ? '#fee2e2' : '#dcfce7', 
                border: toggleModal.currentStatus ? '1px solid #fecaca' : '1px solid #86efac', 
                borderRadius: 8, 
                padding: 12, 
                marginBottom: 24 
              }}>
                <Text style={{ color: toggleModal.currentStatus ? '#991b1b' : '#166534', fontSize: 13, margin: 0 }}>
                  {toggleModal.currentStatus 
                    ? '⚠️ Esta acción desactivará el usuario.'
                    : '✅ Esta acción activará el usuario.'
                  }
                </Text>
              </Box>
              <Box style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button
                  variant="text"
                  onClick={() => setToggleModal({ open: false, userId: null, currentStatus: null, username: null })}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmToggleActive}
                  style={{
                    backgroundColor: toggleModal.currentStatus ? '#991b1b' : '#047857',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  {toggleModal.currentStatus ? 'Desactivar' : 'Activar'}
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}    </Box>
  )
}

export default UsuariosPage