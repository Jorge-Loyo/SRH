import React from 'react'
import { Box, Icon, Text } from '@adminjs/design-system'

/**
 * LoadingSpinner - Indicador visual de carga consistente
 * 
 * Muestra un icono de spinner animado con texto opcional.
 * Puede usarse inline en botones o como overlay en contenedores.
 * 
 * @param {Object} props
 * @param {boolean} [props.loading=true] - Si está en estado de carga
 * @param {string} [props.text] - Texto a mostrar junto al spinner
 * @param {string} [props.size='default'] - Tamaño: 'small', 'default', 'large'
 * @param {string} [props.color='#666'] - Color del spinner y texto
 * @param {boolean} [props.inline=false] - Si es true, se muestra inline (útil para botones)
 * @param {boolean} [props.overlay=false] - Si es true, se muestra como overlay absoluto
 * @param {React.CSSProperties} [props.style] - Estilos adicionales
 * 
 * @example
 * // Spinner inline en botón
 * <Button disabled={loading}>
 *   {loading ? <LoadingSpinner inline size="small" text="Guardando..." /> : 'Guardar'}
 * </Button>
 * 
 * @example
 * // Spinner centrado en contenedor
 * {loading ? (
 *   <LoadingSpinner text="Cargando datos..." />
 * ) : (
 *   <Table data={data} />
 * )}
 * 
 * @example
 * // Spinner overlay sobre contenedor
 * <Box style={{ position: 'relative' }}>
 *   {loading && <LoadingSpinner overlay text="Procesando..." />}
 *   <Form />
 * </Box>
 */
const LoadingSpinner = ({
  loading = true,
  text,
  size = 'default',
  color = '#666',
  inline = false,
  overlay = false,
  style = {}
}) => {
  if (!loading) return null

  // Tamaños del spinner
  const sizes = {
    small: 14,
    default: 20,
    large: 32
  }

  const iconSize = sizes[size] || sizes.default

  // Estilo del contenedor
  const containerStyle = {
    display: inline ? 'inline-flex' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: color,
    ...style
  }

  // Si es overlay, agregar estilos de posicionamiento absoluto
  if (overlay) {
    Object.assign(containerStyle, {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      zIndex: 10,
      display: 'flex'
    })
  }

  return (
    <Box style={containerStyle}>
      {/* Spinner animado con CSS */}
      <Box
        style={{
          width: iconSize,
          height: iconSize,
          border: `${Math.max(2, iconSize / 10)}px solid ${color}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      {text && (
        <Text
          style={{
            margin: 0,
            fontSize: size === 'small' ? 13 : size === 'large' ? 16 : 14,
            color: color
          }}
        >
          {text}
        </Text>
      )}

      {/* Inyectar keyframes una sola vez */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  )
}

export default LoadingSpinner
