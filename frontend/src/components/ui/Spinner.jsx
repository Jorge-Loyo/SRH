import React from 'react'

/**
 * Spinner inline (dentro de un contenedor)
 * Props: size? ('sm'|'md'|'lg'), className?
 */
export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div
      className={`${sizes[size]} border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Cargando"
    />
  )
}
