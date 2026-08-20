import React from 'react'

export function Spinner({ className = '' }) {
  return (
    <span className={`inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin ${className}`} />
  )
}

export function Button({ variant = 'primary', className = '', icon: Icon, children, ...rest }) {
  const styles = {
    primary: 'bg-primary-700 text-white hover:bg-primary-800 px-4 py-2',
    ghost: 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 px-3 py-2',
    danger: 'border border-red-200 bg-white text-red-500 hover:bg-red-50 px-3 py-2',
    success: 'bg-green-50 border border-green-200 text-green-700 py-2',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0" />}
      {children}
    </button>
  )
}

export function Kpi({ label, value, tone = 'gray' }) {
  const tones = {
    gray: 'text-gray-900',
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-500',
  }
  return (
    <div className="flex flex-col items-start">
      <p className={`text-2xl font-semibold tabular-nums ${tones[tone]}`}>
        {value.toLocaleString('es-AR')}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

export function StatusDot({ status }) {
  const map = {
    idle: 'bg-gray-300',
    running: 'bg-blue-400 animate-pulse',
    done: 'bg-green-500',
    error: 'bg-red-500',
  }
  return <span className={`inline-block w-2 h-2 rounded-full ${map[status] ?? map.idle}`} />
}

export function ModalShell({ children, onClose, maxW = 'max-w-5xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onMouseDown={onClose}>
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxW} max-h-[90vh] flex flex-col border border-gray-200`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function DrawerShell({ children, onClose, width = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end" onMouseDown={onClose}>
      <div
        className={`bg-white shadow-2xl w-full ${width} border-l border-gray-200 flex flex-col`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}