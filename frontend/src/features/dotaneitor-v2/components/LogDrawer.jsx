import React, { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { DrawerShell } from './ui'

const COLOR = {
  error: 'text-red-600',
  warning: 'text-amber-600',
  success: 'text-green-600',
  info: 'text-gray-500',
}

const PREFIX = { error: '✗', warning: '⚠', success: '✓', info: '•' }

export default function LogDrawer({ open, onClose, logs, runningLabel }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, open])

  if (!open) return null

  return (
    <DrawerShell onClose={onClose} width="max-w-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">Log</span>
          {runningLabel && (
            <span className="flex items-center gap-1.5 text-xs text-blue-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              {runningLabel}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs space-y-1 bg-gray-50">
        {logs.length === 0 && <p className="text-gray-400">Sin actividad aún.</p>}
        {logs.map((l, i) => (
          <p key={i} className={COLOR[l.type] ?? COLOR.info}>
            {PREFIX[l.type] ?? PREFIX.info} {l.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </DrawerShell>
  )
}