import React from 'react'
import { Box, Button, Icon } from '@adminjs/design-system'

/**
 * Botón para volver a la página anterior
 * @param {Object} props
 * @param {string} props.label - Texto del botón (default: 'Volver')
 */
const BackButton = ({ label = 'Volver' }) => {
  const goBack = () => {
    window.history.back()
  }
  return (
    <Button
      variant="text"
      size="sm"
      onClick={goBack}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 12px',
        margin: '12px 0',
        fontSize: 14,
        fontWeight: 500,
        color: '#1565c0',
        background: 'transparent',
        border: '1px solid #e0e0e0',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f5f5f5'
        e.currentTarget.style.borderColor = '#1565c0'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = '#e0e0e0'
      }}
    >
      <Icon icon="ChevronLeft" style={{ fontSize: 16 }} />
      {label}
    </Button>
  )
}

export default BackButton