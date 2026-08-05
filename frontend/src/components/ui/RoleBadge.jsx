import React from 'react'

const ROLE_STYLES = {
  admin:       'bg-red-100 text-red-700',
  editor:      'bg-blue-100 text-blue-700',
  viewer:      'bg-gray-100 text-gray-600',
  director:    'bg-purple-100 text-purple-700',
  gerencia:    'bg-amber-100 text-amber-700',
  concursales: 'bg-teal-100 text-teal-700',
  autoridades: 'bg-indigo-100 text-indigo-700',
}

const ROLE_LABELS = {
  admin:       'Admin',
  editor:      'Editor',
  viewer:      'Viewer',
  director:    'Director',
  gerencia:    'Gerencia',
  concursales: 'Concursales',
  autoridades: 'Autoridades',
}

/**
 * Muestra el badge del rol. Si se pasa `alias`, lo muestra en lugar del nombre estándar.
 */
export default function RoleBadge({ role, alias }) {
  const style = ROLE_STYLES[role] ?? 'bg-gray-100 text-gray-600'
  const label = alias || ROLE_LABELS[role] || role
  return (
    <span className={`role-badge ${style}`} title={alias ? `Rol: ${ROLE_LABELS[role] ?? role}` : undefined}>
      {label}
    </span>
  )
}
