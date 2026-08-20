import React, { useState } from 'react'
import { BoltIcon } from '@heroicons/react/24/outline'

export default function ServiceBadge({ online, onWake }) {
  const [waking, setWaking] = useState(false)

  async function handleWake() {
    setWaking(true)
    await onWake()
    setWaking(false)
  }

  if (online === null || waking) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-400">
        <span className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
        {waking ? 'Despertando...' : 'Verificando servicio...'}
      </span>
    )
  }
  if (online) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        Servicio activo
      </span>
    )
  }
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-500">
        <span className="w-2 h-2 rounded-full bg-red-400" />
        Servicio no disponible
      </span>
      <button
        onClick={handleWake}
        className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
      >
        <BoltIcon className="w-3 h-3" /> Despertar
      </button>
    </span>
  )
}