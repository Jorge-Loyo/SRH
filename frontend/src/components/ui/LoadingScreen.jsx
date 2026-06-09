import React from 'react'

/** Spinner de carga a pantalla completa */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </div>
  )
}
