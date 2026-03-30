import React from 'react'
import { Box, Text, Button, Icon } from '@adminjs/design-system'

/**
 * ConfirmationDialog - Modal de confirmación para acciones destructivas
 * 
 * Proporciona un diálogo simple para confirmar operaciones peligrosas
 * como eliminaciones, cambios irreversibles, etc.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Si el diálogo está visible
 * @param {function} props.onConfirm - Callback al confirmar la acción
 * @param {function} props.onCancel - Callback al cancelar
 * @param {string} [props.title='Confirmar acción'] - Título del diálogo
 * @param {string} [props.message='¿Está seguro de realizar esta acción?'] - Mensaje explicativo
 * @param {string} [props.confirmText='Confirmar'] - Texto del botón de confirmación
 * @param {string} [props.cancelText='Cancelar'] - Texto del botón de cancelación
 * @param {string} [props.variant='danger'] - Variante del botón: 'danger', 'primary', 'light'
 * @param {string} [props.icon='AlertCircle'] - Icono a mostrar (nombre de icon de AdminJS)
 * @param {boolean} [props.loading=false] - Si está procesando la acción
 * 
 * @example
 * // Confirmación de eliminación
 * <ConfirmationDialog
 *   isOpen={showConfirm}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowConfirm(false)}
 *   title="Eliminar Usuario"
 *   message="¿Está seguro de eliminar este usuario? Esta acción no se puede deshacer."
 *   confirmText="Eliminar"
 *   variant="danger"
 *   icon="Delete"
 * />
 * 
 * @example
 * // Confirmación genérica con loading
 * <ConfirmationDialog
 *   isOpen={showSave}
 *   onConfirm={handleSave}
 *   onCancel={() => setShowSave(false)}
 *   title="Guardar cambios"
 *   message="¿Desea guardar los cambios realizados?"
 *   confirmText="Guardar"
 *   variant="primary"
 *   icon="Save"
 *   loading={isSaving}
 * />
 */
const ConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Confirmar acción',
  message = '¿Está seguro de realizar esta acción?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  icon = 'AlertCircle',
  loading = false
}) => {
  if (!isOpen) return null

  // Colores según variante
  const variantColors = {
    danger: { bg: '#fee2e2', border: '#fecaca', iconColor: '#dc2626', btnBg: '#dc2626' },
    primary: { bg: '#dbeafe', border: '#bfdbfe', iconColor: '#2563eb', btnBg: '#2563eb' },
    warning: { bg: '#fef3c7', border: '#fde68a', iconColor: '#d97706', btnBg: '#d97706' },
    light: { bg: '#f3f4f6', border: '#e5e7eb', iconColor: '#6b7280', btnBg: '#6b7280' }
  }

  const colors = variantColors[variant] || variantColors.danger

  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
    >
      <Box
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          maxWidth: '500px',
          width: '100%',
          padding: '24px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icono y Título */}
        <Box style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: colors.bg,
              border: `2px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon icon={icon} style={{ color: colors.iconColor, fontSize: 24 }} />
          </Box>
          <Box style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: 600,
                margin: 0,
                marginBottom: 8,
                color: '#111'
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                margin: 0,
                color: '#666',
                lineHeight: 1.5
              }}
            >
              {message}
            </Text>
          </Box>
        </Box>

        {/* Botones */}
        <Box style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
          <Button
            onClick={onCancel}
            variant="light"
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#9ca3af' : colors.btnBg,
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Procesando...' : confirmText}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default ConfirmationDialog
