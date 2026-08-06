import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * BaseModal — wrapper responsivo para todos los modales.
 * En mobile ocupa pantalla completa, en desktop es centrado con max-w configurable.
 */
export default function BaseModal({ open, onClose, title, subtitle, children, size = 'md', footer, headerExtra, borderTop }) {
  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm:  'max-w-sm',
    md:  'max-w-lg',
    lg:  'max-w-2xl',
    xl:  'max-w-4xl',
    full:'max-w-full',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className={`
        relative w-full ${sizes[size] ?? sizes.md}
        bg-white rounded-t-2xl sm:rounded-xl shadow-xl
        flex flex-col max-h-[95vh] sm:max-h-[90vh]
        animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200
        ${borderTop ? `border-t-4 ${borderTop}` : ''}
      `}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">
              {headerExtra}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2 flex-wrap">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
