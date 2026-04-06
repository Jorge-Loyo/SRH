import React, { useEffect, useState, useMemo } from 'react'
import { Box, H3, Text, Table, TableHead, TableRow, TableCell, TableBody, Button, Icon, Label, Input } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import { useErrorHandler } from '../hooks/useErrorHandler'

const PermisosPage = () => {
  const [state, setState] = useState({
    loading: true,
    permissions: [],
    editingPerm: null,
    showModal: false,
    error: null
  })
  
  const { error, handleError, clearError } = useErrorHandler()

  async function loadPermissions() {
    setState(s => ({ ...s, loading: true }))
    try {
      const response = await fetch('/admin/api/permisos', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      const data = await response.json()
      setState(s => ({
        ...s,
        permissions: data.permissions || [],
        loading: false
      }))
      clearError()
    } catch (e) {
      handleError(e, 'PermisosPage.loadPermissions')
    }
  }

  useEffect(() => {
    loadPermissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleEditPermission = (perm) => {
    setState(s => ({
      ...s,
      editingPerm: { ...perm },
      showModal: true
    }))
  }

  const handleSavePermission = async () => {
    if (!state.editingPerm) return
    
    setState(s => ({ ...s, loading: true }))
    try {
      const response = await fetch('/admin/api/permisos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(state.editingPerm)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setState(s => ({ ...s, showModal: false, editingPerm: null }))
        loadPermissions()
      } else {
        handleError(new Error(data.error || 'No se pudo guardar los permisos'), 'PermisosPage.handleSavePermission')
        setState(s => ({ ...s, loading: false }))
      }
    } catch (e) {
      handleError(e, 'PermisosPage.handleSavePermission')
      setState(s => ({ ...s, loading: false }))
    }
  }

  const getRoleInfo = (role) => {
    const info = {
      'admin': {
        icon: '👑',
        name: 'Administrador',
        color: { bg: '#dbeafe', text: '#1e40af', border: 'rgba(59, 130, 246, 0.4)' },
        description: 'Acceso total al sistema'
      },
      'editor': {
        icon: '✏️',
        name: 'Editor',
        color: { bg: '#dcfce7', text: '#166534', border: 'rgba(34, 197, 94, 0.4)' },
        description: 'Puede crear, modificar y eliminar datos'
      },
      'viewer': {
        icon: '👀',
        name: 'Visor',
        color: { bg: '#f3e8ff', text: '#6b21a8', border: 'rgba(147, 51, 234, 0.4)' },
        description: 'Solo lectura sin modificaciones'
      },
      'director': {
        icon: '🏥',
        name: 'Director',
        color: { bg: '#fce7f3', text: '#9f1239', border: 'rgba(236, 72, 153, 0.4)' },
        description: 'Vista limitada a su hospital'
      },
      'gerencia': {
        icon: '📋',
        name: 'Gerencia',
        color: { bg: '#fff7ed', text: '#9a3412', border: 'rgba(234, 88, 12, 0.4)' },
        description: 'Lectura general + CRUD en Recorridas y Minutas'
      }
    }
    return info[role] || { icon: '👤', name: role, color: { bg: '#f3f4f6', text: '#374151', border: 'rgba(107, 114, 128, 0.4)' }, description: '' }
  }

  const CheckIcon = ({ checked }) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '20px',
      height: '20px',
      borderRadius: '4px',
      background: checked ? '#10b981' : '#e5e7eb',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold'
    }}>
      {checked ? '✓' : '✕'}
    </span>
  )

  if (error) {
    return <ErrorFallback error={error} onRetry={() => loadPermissions()} componentName="PermisosPage" />
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <UserInfo />
      
      <Box style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Box mb="lg">
          <H3 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>
            🔒 Permisos por Rol
          </H3>
          <Text style={{ color: '#6b7280' }}>
            Configurar permisos de acciones CRUD para cada rol del sistema
          </Text>
        </Box>

        {state.loading ? (
          <Box style={{ textAlign: 'center', padding: 40 }}>
            <Text>Cargando permisos...</Text>
          </Box>
        ) : state.error ? (
          <Box style={{ textAlign: 'center', padding: 40, color: '#ef4444' }}>
            <Text>Error: {state.error}</Text>
          </Box>
        ) : (
          <Box style={{ display: 'grid', gap: 24 }}>
            {state.permissions.length === 0 ? (
              <Box style={{ textAlign: 'center', padding: 40 }}>
                <Text style={{ fontSize: 16, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>🔒 Sin permisos configurados</Text>
                <Text style={{ fontSize: 13, color: '#9ca3af' }}>No hay roles con permisos en el sistema</Text>
              </Box>
            ) : (
              state.permissions.map((perm) => {
                const roleInfo = getRoleInfo(perm.role)
                return (
                  <Box
                  key={perm.role}
                  style={{
                    background: '#fff',
                    border: `2px solid ${roleInfo.color.border}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                  }}
                >
                  {/* Header del rol */}
                  <Box style={{
                    background: roleInfo.color.bg,
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Box>
                      <Box style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 24 }}>{roleInfo.icon}</span>
                        <H3 style={{ 
                          margin: 0, 
                          fontSize: 20, 
                          fontWeight: 700,
                          color: roleInfo.color.text
                        }}>
                          {roleInfo.name}
                        </H3>
                      </Box>
                      <Text style={{ fontSize: 14, color: roleInfo.color.text, opacity: 0.8 }}>
                        {perm.description || roleInfo.description}
                      </Text>
                    </Box>
                    
                    <Button 
                      onClick={() => handleEditPermission(perm)} 
                      size="sm"
                      disabled={state.loading}
                      style={{
                        background: 'rgba(139, 92, 246, 0.1)',
                        color: '#8b5cf6',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        fontWeight: 600,
                        opacity: state.loading ? 0.6 : 1,
                        cursor: state.loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <Icon icon="Edit" style={{ marginRight: 8, color: '#8b5cf6' }} />
                      Editar
                    </Button>
                  </Box>

                  {/* Permisos CRUD */}
                  <Box style={{ padding: '24px' }}>
                    <Box style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 16 
                    }}>
                      <Box style={{ 
                        padding: '16px', 
                        background: '#f9fafb', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <CheckIcon checked={perm.can_create} />
                          <Text style={{ fontWeight: 600, fontSize: 14 }}>Crear</Text>
                        </Box>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          Puede crear nuevos registros
                        </Text>
                      </Box>

                      <Box style={{ 
                        padding: '16px', 
                        background: '#f9fafb', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <CheckIcon checked={perm.can_update} />
                          <Text style={{ fontWeight: 600, fontSize: 14 }}>Editar</Text>
                        </Box>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          Puede modificar registros
                        </Text>
                      </Box>

                      <Box style={{ 
                        padding: '16px', 
                        background: '#f9fafb', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <CheckIcon checked={perm.can_delete} />
                          <Text style={{ fontWeight: 600, fontSize: 14 }}>Eliminar</Text>
                        </Box>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          Puede eliminar registros
                        </Text>
                      </Box>

                      <Box style={{ 
                        padding: '16px', 
                        background: '#f9fafb', 
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <CheckIcon checked={perm.can_alter_structure} />
                          <Text style={{ fontWeight: 600, fontSize: 14 }}>DDL</Text>
                        </Box>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>
                          Alterar estructura de datos
                        </Text>
                      </Box>
                    </Box>

                  </Box>
                </Box>
              )
            })
            )}
          </Box>
        )}
      </Box>

      {/* Modal de edición */}
      {state.showModal && state.editingPerm && (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #111',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
          }}>
            <H3 style={{ marginBottom: 24 }}>
              Editar Permisos: {getRoleInfo(state.editingPerm.role).name}
            </H3>
            
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Box>
                <Label>Descripción</Label>
                <Input
                  value={state.editingPerm.description || ''}
                  onChange={(e) => setState(s => ({
                    ...s,
                    editingPerm: { ...s.editingPerm, description: e.target.value }
                  }))}
                  placeholder="Descripción del rol..."
                />
              </Box>

              <Box style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 16,
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.editingPerm.can_create}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingPerm: { ...s.editingPerm, can_create: e.target.checked }
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <Text style={{ fontWeight: 600 }}>Crear</Text>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.editingPerm.can_update}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingPerm: { ...s.editingPerm, can_update: e.target.checked }
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <Text style={{ fontWeight: 600 }}>Editar</Text>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.editingPerm.can_delete}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingPerm: { ...s.editingPerm, can_delete: e.target.checked }
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <Text style={{ fontWeight: 600 }}>Eliminar</Text>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.editingPerm.can_alter_structure}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingPerm: { ...s.editingPerm, can_alter_structure: e.target.checked }
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <Text style={{ fontWeight: 600 }}>DDL</Text>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.editingPerm.can_manage_users}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingPerm: { ...s.editingPerm, can_manage_users: e.target.checked }
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <Text style={{ fontWeight: 600 }}>Gestión usuarios</Text>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={state.editingPerm.filter_by_hospital}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingPerm: { ...s.editingPerm, filter_by_hospital: e.target.checked }
                    }))}
                    style={{ width: 18, height: 18 }}
                  />
                  <Text style={{ fontWeight: 600 }}>Filtrar por hospital</Text>
                </label>
              </Box>

              {state.editingPerm.filter_by_hospital && (
                <Box>
                  <Label>Código de Hospital (opcional)</Label>
                  <Input
                    value={state.editingPerm.hospital_code || ''}
                    onChange={(e) => setState(s => ({
                      ...s,
                      editingPerm: { ...s.editingPerm, hospital_code: e.target.value }
                    }))}
                    placeholder="Dejar vacío para usar user.hospital_code"
                  />
                </Box>
              )}
              
              <Box style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <Button 
                  onClick={handleSavePermission} 
                  variant="primary" 
                  style={{ flex: 1 }}
                  disabled={state.loading}
                >
                  {state.loading ? '⏳ Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button 
                  onClick={() => setState(s => ({ ...s, showModal: false, editingPerm: null }))}
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
    </Box>
  )
}

export default PermisosPage
