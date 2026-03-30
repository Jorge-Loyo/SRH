import React, { useEffect, useState, useMemo } from 'react'
import { Box, H3, Text, Table, TableHead, TableRow, TableCell, TableBody, Button, Icon } from '@adminjs/design-system'
import BackButton from '../reutilizables/BackButton'
import UserInfo from '../reutilizables/UserInfo'
import ErrorFallback from '../reutilizables/ErrorFallback'
import LoadingSpinner from '../reutilizables/LoadingSpinner'
import { useErrorHandler } from '../hooks/useErrorHandler'

const TokensPage = () => {
  const ITEMS_PER_PAGE = 10
  
  const [state, setState] = useState({
    loading: true,
    tokens: [],
    error: null,
    showRevoked: false,
    currentPage: 1
  })
  
  // Modales de confirmación
  const [revokeConfirm, setRevokeConfirm] = useState({ open: false, tokenId: null, tokenUser: null })
  
  // Modal para revocar familia de usuario
  const [revokeFamilyModal, setRevokeFamilyModal] = useState({ 
    open: false, 
    selectedUser: null,
    selectedFamily: null 
  })
  
  const { error, handleError, clearError } = useErrorHandler()

  async function loadTokens() {
    setState(s => ({ ...s, loading: true }))
    try {
      // Cargar ambos: activos y revocados, sin recargar página
      const [activeRes, revokedRes] = await Promise.all([
        fetch('/admin/api/tokens?limit=10000', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }),
        fetch('/admin/api/tokens?includeRevoked=true&limit=10000', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        })
      ])
      
      const activeData = await activeRes.json()
      const revokedData = await revokedRes.json()
      
      // Combinar activos y revocados sin duplicados
      const activeTokens = (activeData.tokens || []).map(t => ({ ...t, revoked: false }))
      const allRevokedTokens = (revokedData.tokens || [])
      const revokedOnly = allRevokedTokens.filter(t => !activeTokens.find(at => at.id === t.id)).map(t => ({ ...t, revoked: true }))
      
      setState(s => ({
        ...s,
        tokens: [...activeTokens, ...revokedOnly],
        loading: false,
        currentPage: 1,
        showRevoked: false
      }))
      clearError()
    } catch (e) {
      handleError(e, 'TokensPage.loadTokens')
    }
  }

  useEffect(() => {
    loadTokens()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRevokeToken = async (tokenId) => {
    // Abrir modal de confirmación
    const token = state.tokens.find(t => t.id === tokenId)
    setRevokeConfirm({ 
      open: true, 
      tokenId, 
      tokenUser: token?.user?.username || 'Usuario desconocido'
    })
  }

  const closeRevokeConfirm = () => {
    setRevokeConfirm({ open: false, tokenId: null, tokenUser: null })
  }

  const confirmRevokeToken = async () => {
    const { tokenId } = revokeConfirm
    closeRevokeConfirm()
    
    try {
      const response = await fetch(`/admin/api/tokens/${tokenId}/revoke`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })
      
      const data = await response.json()
      
      if (data.success) {
        loadTokens()
      } else {
        handleError(new Error(data.error || 'No se pudo revocar el token'), 'TokensPage.confirmRevokeToken')
      }
    } catch (e) {
      handleError(e, 'TokensPage.confirmRevokeToken')
    }
  }

  
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTokenStatus = (token) => {
    if (token.revoked) return { text: 'Revocado', color: '#ef4444', emoji: '🚫' }
    
    const now = new Date()
    const expires = new Date(token.expires_at)
    const hoursUntilExpiry = (expires - now) / (1000 * 60 * 60)
    
    if (expires < now) return { text: 'Expirado', color: '#f59e0b', emoji: '⏰' }
    if (hoursUntilExpiry < 1) return { text: 'Expira pronto', color: '#f59e0b', emoji: '⚠️' }
    
    const lastUsed = token.last_used ? new Date(token.last_used) : null
    if (lastUsed) {
      const hoursSinceUse = (now - lastUsed) / (1000 * 60 * 60)
      if (hoursSinceUse < 1) return { text: 'Activo', color: '#10b981', emoji: '✅' }
      if (hoursSinceUse < 24) return { text: 'Reciente', color: '#3b82f6', emoji: '📝' }
    }
    
    return { text: 'Válido', color: '#6b7280', emoji: '✓' }
  }

  // Obtener usuarios únicos para el modal
  const uniqueUsers = useMemo(() => {
    const users = new Map()
    state.tokens.forEach(token => {
      if (token.user?.username && !users.has(token.user.username)) {
        users.set(token.user.username, token.user)
      }
    })
    return Array.from(users.values()).sort((a, b) => a.username.localeCompare(b.username))
  }, [state.tokens])

  // Obtener familias de un usuario
  const getFamiliesForUser = (username) => {
    const families = new Map()
    state.tokens
      .filter(t => t.user?.username === username)
      .forEach(token => {
        if (token.family_id && !families.has(token.family_id)) {
          families.set(token.family_id, {
            family_id: token.family_id,
            count: state.tokens.filter(t => t.family_id === token.family_id && t.user?.username === username).length,
            created_at: token.created_at
          })
        }
      })
    return Array.from(families.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  const handleOpenRevokeFamilyModal = () => {
    setRevokeFamilyModal({ open: true, selectedUser: null, selectedFamily: null })
  }

  const handleConfirmRevokeFamily = async () => {
    if (!revokeFamilyModal.selectedUser) {
      handleError(new Error('Por favor selecciona un usuario'), 'TokensPage.handleConfirmRevokeFamily')
      return
    }

    try {
      const response = await fetch(`/admin/api/tokens/user/${revokeFamilyModal.selectedUser}/revoke`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        setRevokeFamilyModal({ open: false, selectedUser: null, selectedFamily: null })
        // Cambiar a pestaña de revocados y recargar
        loadTokens()
      } else {
        handleError(new Error(data.error || 'No se pudo revocar los tokens del usuario'), 'TokensPage.handleConfirmRevokeFamily')
      }
    } catch (e) {
      handleError(e, 'TokensPage.handleConfirmRevokeFamily')
    }
  }

  // Cálculo de paginación
  const totalPages = Math.ceil(state.tokens.filter(token => state.showRevoked ? token.revoked : !token.revoked).length / ITEMS_PER_PAGE)

  if (error) {
    return <ErrorFallback error={error} onRetry={() => loadTokens()} componentName="TokensPage" />
  }

  return (
    <Box style={{ padding: 16 }}>
      <BackButton />
      <UserInfo />
      
      <Box style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Box mb="lg">
          <H3 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>
            🔐 Tokens de Sesión
          </H3>
          <Text style={{ color: '#6b7280' }}>
            Gestión de tokens JWT y control de sesiones activas
          </Text>
        </Box>

        {/* Toggle para mostrar/ocultar tokens revocados */}
        <Box style={{ marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Button
              onClick={() => setState(s => ({ ...s, showRevoked: false, currentPage: 1 }))}
              variant={!state.showRevoked ? 'default' : 'text'}
              style={{
                backgroundColor: !state.showRevoked ? '#3b82f6' : 'transparent',
                color: !state.showRevoked ? '#fff' : '#3b82f6',
                border: '1px solid #3b82f6',
                padding: '8px 16px',
                fontSize: 14
              }}
            >
              Tokens Activos
            </Button>
            <Button
              onClick={() => setState(s => ({ ...s, showRevoked: true, currentPage: 1 }))}
              variant={state.showRevoked ? 'default' : 'text'}
              style={{
                backgroundColor: state.showRevoked ? '#ef4444' : 'transparent',
                color: state.showRevoked ? '#fff' : '#ef4444',
                border: '1px solid #ef4444',
                padding: '8px 16px',
                fontSize: 14
              }}
            >
              Ver Revocados ({state.tokens.filter(t => t.revoked).length})
            </Button>
          </Box>
          
          {/* Botón para revocar familia - Solo cuando NO se muestran revocados */}
          {!state.showRevoked && (
            <Button
              onClick={handleOpenRevokeFamilyModal}
              style={{
                backgroundColor: '#8b5cf6',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                fontSize: 14,
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              🗑️ Revocar Familia
            </Button>
          )}
        </Box>

        {state.loading ? (
          <Box style={{ textAlign: 'center', padding: 40 }}>
            <Text>⏳ Cargando tokens...</Text>
          </Box>
        ) : error ? (
          <ErrorFallback error={error} onRetry={() => loadTokens()} componentName="TokensPage" />
        ) : (
          <>
            <Box style={{ 
              background: '#fff', 
              borderRadius: '10px', 
              overflow: 'hidden',
              border: '1px solid #111',
              boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
              maxHeight: '600px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Tabla con scroll interno */}
              <Box style={{
                overflowY: 'auto',
                overflowX: 'auto',
                flex: 1,
                minHeight: '300px'
              }}>
                <Table>
                  <TableHead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <TableRow style={{ background: '#F4F6F8' }}>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Usuario</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>JTI</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Familia</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Creado</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Expira</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Último Uso</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Estado</TableCell>
                      <TableCell style={{ borderBottom: '2px solid #111' }}>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {state.tokens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                          <Box>
                            <Text style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>🔐 Sin tokens</Text>
                            <Text style={{ fontSize: 13 }}>No hay {state.showRevoked ? 'tokens revocados' : 'sesiones activas'} en el sistema</Text>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      state.tokens
                        .filter(token => state.showRevoked ? token.revoked : !token.revoked)
                        .slice((state.currentPage - 1) * ITEMS_PER_PAGE, state.currentPage * ITEMS_PER_PAGE)
                        .map((token, idx) => {
                        const status = getTokenStatus(token)
                        return (
                          <TableRow key={token.id} style={{ 
                            background: idx % 2 === 0 ? '#FFFFFF' : '#F7F7F7'
                          }}>
                        <TableCell style={{ fontWeight: 600 }}>
                          {token.user?.username || 'Usuario desconocido'}
                        </TableCell>
                        <TableCell style={{ 
                          fontFamily: 'monospace', 
                          fontSize: 11, 
                          color: '#6b7280',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={token.jti}>
                          {token.jti}
                        </TableCell>
                        <TableCell style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>
                          {token.family_id ? `...${token.family_id.slice(-8)}` : '-'}
                        </TableCell>
                        <TableCell style={{ fontSize: 13 }}>
                          {formatDate(token.created_at)}
                        </TableCell>
                        <TableCell style={{ fontSize: 13 }}>
                          {formatDate(token.expires_at)}
                        </TableCell>
                        <TableCell style={{ fontSize: 13 }}>
                          {formatDate(token.last_used)}
                        </TableCell>
                        <TableCell>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: status.color + '20',
                            color: status.color
                          }}>
                            {status.emoji} {status.text}
                          </span>
                        </TableCell>
                        <TableCell>
                          {!token.revoked && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleRevokeToken(token.id)}
                              disabled={state.loading}
                              style={{ opacity: state.loading ? 0.6 : 1, cursor: state.loading ? 'not-allowed' : 'pointer' }}
                            >
                              {state.loading ? <LoadingSpinner inline size="small" text="Procesando..." color="#fff" /> : 'Revocar'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </Box>

              {/* Controles de Paginación - Visible solo si hay más de 10 registros */}
              {totalPages > 1 && (
                <Box style={{
                  padding: '15px 20px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f9fafb',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <Box style={{ fontSize: '13px', color: '#6b7280', minWidth: '200px' }}>
                    Mostrando {(state.currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(state.currentPage * ITEMS_PER_PAGE, state.tokens.filter(token => state.showRevoked ? token.revoked : !token.revoked).length)} de {state.tokens.filter(token => state.showRevoked ? token.revoked : !token.revoked).length} tokens
                  </Box>

                  <Box style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(() => {
                      const pages = []
                      const showFirst = state.currentPage > 3
                      const showLast = state.currentPage < totalPages - 2

                      // Siempre mostrar página 1
                      pages.push(1)

                      // Agregar ellipsis si es necesario
                      if (showFirst) pages.push('...')

                      // Mostrar páginas alrededor de la actual
                      const start = Math.max(2, state.currentPage - 1)
                      const end = Math.min(totalPages - 1, state.currentPage + 1)
                      for (let i = start; i <= end; i++) {
                        if (!pages.includes(i)) pages.push(i)
                      }

                      // Agregar ellipsis si es necesario
                      if (showLast) pages.push('...')

                      // Siempre mostrar última página (si hay más de 1)
                      if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages)

                      return pages.map((page, idx) => {
                        if (page === '...') {
                          return (
                            <span key={`ellipsis-${idx}`} style={{ 
                              padding: '4px 8px',
                              color: '#9ca3af'
                            }}>
                              ...
                            </span>
                          )
                        }
                        return (
                          <Button
                            key={page}
                            size="sm"
                            onClick={() => setState(s => ({ ...s, currentPage: page }))}
                            style={{
                              background: state.currentPage === page ? '#0B5FFF' : '#fff',
                              color: state.currentPage === page ? '#fff' : '#111',
                              border: '1px solid #d1d5db',
                              minWidth: '32px',
                              height: '32px',
                              padding: '0 8px',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: state.currentPage === page ? 600 : 400
                            }}
                          >
                            {page}
                          </Button>
                        )
                      })
                    })()}
                  </Box>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Modal de confirmación para revocar token individual */}
      {revokeConfirm.open && (
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
            onClick={closeRevokeConfirm}
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
              <H3 style={{ margin: 0, marginBottom: 16 }}>¿Revocar este token?</H3>
              <Text style={{ marginBottom: 8, color: '#666' }}>
                Usuario: <strong>{revokeConfirm.tokenUser}</strong>
              </Text>
              <Text style={{ marginBottom: 24, color: '#666' }}>
                El usuario deberá iniciar sesión nuevamente con este dispositivo.
              </Text>
              <Box style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button
                  variant="text"
                  onClick={closeRevokeConfirm}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmRevokeToken}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none'
                  }}
                >
                  Revocar
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}

      {/* Modal selector para elegir usuario */}
      {revokeFamilyModal.open && (
        <>
          <Box
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              zIndex: 9998,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => setRevokeFamilyModal({ open: false, selectedUser: null, selectedFamily: null })}
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
              <H3 style={{ margin: 0, marginBottom: 8, color: '#1f2937' }}>
                🗑️ Revocar Todos los Tokens
              </H3>
              <Text style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>
                Selecciona el usuario para revocar todas sus sesiones activas
              </Text>

              {/* Selector de usuario */}
              <Box style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#374151' }}>
                  Seleccionar Usuario
                </label>
                <select
                  value={revokeFamilyModal.selectedUser || ''}
                  onChange={(e) => setRevokeFamilyModal(prev => ({
                    ...prev,
                    selectedUser: e.target.value
                  }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    backgroundColor: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">-- Seleccionar usuario --</option>
                  {uniqueUsers.map(user => (
                    <option key={user.id} value={user.username}>
                      {user.username}
                    </option>
                  ))}
                </select>
              </Box>

              {/* Info de la acción */}
              {revokeFamilyModal.selectedUser && (
                <>
                  <Text style={{ color: '#374151', fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                    Sesiones activas: <span style={{ color: '#ef4444', fontSize: 16 }}>
                      {state.tokens.filter(t => t.user?.username === revokeFamilyModal.selectedUser && !t.revoked).length}
                    </span>
                  </Text>
                  <Box style={{ 
                    backgroundColor: '#fef3c7', 
                    border: '1px solid #fcd34d', 
                    borderRadius: 8, 
                    padding: 12, 
                    marginBottom: 24 
                  }}>
                    <Text style={{ color: '#92400e', fontSize: 13, margin: 0 }}>
                      ℹ️ Se revocarán TODOS los tokens de este usuario en todos sus dispositivos.
                    </Text>
                  </Box>
                </>
              )}

              {/* Botones */}
              <Box style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button
                  variant="text"
                  onClick={() => setRevokeFamilyModal({ open: false, selectedUser: null, selectedFamily: null })}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmRevokeFamily}
                  disabled={!revokeFamilyModal.selectedUser}
                  style={{
                    backgroundColor: !revokeFamilyModal.selectedUser ? '#d1d5db' : '#ef4444',
                    color: '#fff',
                    border: 'none',
                    cursor: !revokeFamilyModal.selectedUser ? 'not-allowed' : 'pointer',
                    opacity: !revokeFamilyModal.selectedUser ? 0.6 : 1
                  }}
                >
                  Revocar
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}

export default TokensPage
