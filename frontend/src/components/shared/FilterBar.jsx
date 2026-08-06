import { useState } from 'react'
import { FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'

/**
 * FilterBar — barra de filtros colapsable.
 * En desktop siempre visible, en mobile colapsable con toggle.
 */
export default function FilterBar({ children, activeCount = 0 }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Toggle header — visible en mobile */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 sm:hidden"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FunnelIcon className="w-4 h-4" />
          Filtros
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-700 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {open
          ? <ChevronUpIcon className="w-4 h-4 text-gray-400" />
          : <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        }
      </button>

      {/* Contenido */}
      <div className={`${open ? 'block' : 'hidden'} sm:block px-3 py-3`}>
        <div className="flex flex-wrap gap-3">
          {children}
        </div>
      </div>
    </div>
  )
}
