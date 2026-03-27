import React from 'react'
import { Box, H3, Text, Button, Icon } from '@adminjs/design-system'

/**
 * Componente que se muestra cuando hay error
 * Reemplaza el UI roto de AdminJS default
 * 
 * @param {Object} error - Objeto de error con message, type, isRecoverable
 * @param {Function} onRetry - Callback para reintentar la operación
 * @param {string} componentName - Nombre del componente que falló
 * @param {string} homeUrl - URL de inicio para el botón de volver
 */
const ErrorFallback = ({ 
  error, 
  onRetry, 
  componentName = 'Componente',
  homeUrl = '/admin'
}) => {
  if (!error) return null

  const isRecoverable = error.isRecoverable !== false

  // ✅ Definir función getErrorColor
  const getErrorColor = (errorType) => {
    const colors = {
      'validation': '#ff9800',
      'network': '#f44336',
      'authentication': '#e91e63',
      'authorization': '#9c27b0',
      'not_found': '#2196f3',
      'server': '#f44336',
      'unknown': '#757575'
    }
    return colors[errorType] || colors.unknown
  }

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 300,
        padding: 32,
        backgroundColor: '#fafafa',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        textAlign: 'center'
      }}
    >
      {/* Icono de error */}
      <div
        style={{
          fontSize: 48,
          marginBottom: 16,
          color: getErrorColor(error.type),
          opacity: 0.8
        }}
      >
        ⚠️
      </div>

      {/* Título */}
      <H3 style={{ marginBottom: 8, color: '#333' }}>
        {componentName}
      </H3>

      {/* Mensaje de error */}
      <Text
        style={{
          marginBottom: 16,
          color: '#666',
          maxWidth: 400,
          lineHeight: 1.6
        }}
      >
        {error.message}
      </Text>

      {/* Código de error (para debugging) */}
      <Text
        style={{
          marginBottom: 24,
          color: '#999',
          fontSize: 12,
          fontFamily: 'monospace'
        }}
      >
        [{error.type}]
      </Text>

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {isRecoverable && onRetry && (
          <Button
            onClick={onRetry}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Reintentar
          </Button>
        )}

        <Button
          onClick={() => window.location.href = homeUrl}
          style={{
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Volver al Inicio
        </Button>
      </div>

      {/* Hint de soporte */}
      <Text
        style={{
          marginTop: 24,
          color: '#999',
          fontSize: 12,
          maxWidth: 400
        }}
      >
        Si el problema persiste, contacta al equipo de soporte.
      </Text>
    </Box>
  )
}

export default ErrorFallback
