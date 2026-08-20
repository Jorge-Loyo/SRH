import React from 'react'
import { PlayIcon, ArrowPathIcon, CheckIcon, TableCellsIcon } from '@heroicons/react/24/outline'
import { PIPELINE_STEPS } from '../hooks/useDotaneitor'
import { Button, Spinner, StatusDot } from './ui'

const STATUS_LABEL = { idle: 'Pendiente', running: 'En curso', done: 'Completado', error: 'Error' }

export default function ProcessStage({
  file, steps, currentStep, busy, pipelineDone, pipelineError,
  onRun, onRetry, onOpenLog, onOpenPreview,
}) {
  if (!file) return null

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Procesamiento</h2>
        <button onClick={onOpenLog} className="text-xs text-gray-400 hover:text-gray-600">
          Ver log
        </button>
      </div>

      {/* Estados de los sub-pasos */}
      <ul className="space-y-2 mb-5">
        {PIPELINE_STEPS.map((s) => {
          const status = steps[s.key] ?? 'idle'
          const running = currentStep === s.key
          return (
            <li key={s.key} className="flex items-center gap-3 text-sm">
              <StatusDot status={running ? 'running' : status} />
              <span className={`flex-1 ${status === 'done' ? 'text-gray-500' : 'text-gray-700'}`}>
                {s.label}
              </span>
              {status === 'done' && <CheckIcon className="w-4 h-4 text-green-500" />}
              {running && <Spinner className="w-4 h-4 text-blue-500" />}
              <span className="text-xs text-gray-400 w-20 text-right">
                {running ? 'Procesando...' : STATUS_LABEL[status]}
              </span>
            </li>
          )
        })}
      </ul>

      {/* Acción principal */}
      {pipelineDone ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckIcon className="w-4 h-4" />
            <span className="font-medium">Proceso completado</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" icon={TableCellsIcon} onClick={onOpenPreview}>
              Ver registros
            </Button>
            <Button variant="ghost" onClick={onRun} disabled={busy}>
              Reprocesar
            </Button>
          </div>
        </div>
      ) : pipelineError ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-red-500">Hubo un error en el procesamiento.</p>
          <Button variant="primary" icon={ArrowPathIcon} onClick={onRetry} disabled={busy}>
            Reintentar desde el paso fallido
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            Normaliza cargos, procesa contra las tablas de referencia y cruza especialidades.
            Un solo paso, sin intervención.
          </p>
          <Button
            variant="primary"
            icon={busy ? null : PlayIcon}
            onClick={onRun}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            {busy && <Spinner className="w-4 h-4" />}
            {busy ? 'Procesando...' : 'Procesar archivo'}
          </Button>
        </>
      )}
    </section>
  )
}