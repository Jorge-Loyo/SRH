import React from 'react'

/**
 * Componente placeholder para páginas en construcción.
 * Se reemplazará página por página durante la migración.
 */
export default function PlaceholderPage({ title, icon = '🔧' }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <span className="text-5xl">{icon}</span>
      <div>
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 mt-1">Esta página está en migración.</p>
      </div>
    </div>
  )
}
