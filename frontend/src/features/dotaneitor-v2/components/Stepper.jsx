import React from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

const STATUS_ICON = { done: CheckIcon, error: XMarkIcon }

export default function Stepper({ steps, current }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, i) => {
        const state = s.status
        const Icon = STATUS_ICON[state]
        const isLast = i === steps.length - 1
        return (
          <li key={s.key} className={`flex items-center ${isLast ? '' : 'flex-1 gap-2'}`}>
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors
                  ${state === 'done' ? 'bg-primary-600 text-white'
                    : state === 'error' ? 'bg-red-500 text-white'
                    : state === 'active' ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400'}`}
              >
                {Icon ? <Icon className="w-3.5 h-3.5" /> : String(i + 1).padStart(2, '0')}
              </span>
              <span
                className={`text-sm whitespace-nowrap ${state === 'done' || state === 'active' ? 'text-gray-900 font-medium' : 'text-gray-400'}`}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <span className={`flex-1 h-px mx-1 min-w-4 ${state === 'done' ? 'bg-primary-400' : 'bg-gray-200'}`} />
            )}
          </li>
        )
      })}
    </ol>
  )
}