import React, { useState } from 'react'
import { ClockIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline'
import useDotaneitor from './hooks/useDotaneitor.js'
import mockApi from './api/mockDotaneitorApi.js'
import realApi from './api/dotaneitorApi.js'
import Stepper from './components/Stepper.jsx'
import ServiceBadge from './components/ServiceBadge.jsx'
import UploadStep from './components/UploadStep.jsx'
import ProcessStage from './components/ProcessStage.jsx'
import ReviewStage from './components/ReviewStage.jsx'
import DiffModal from './components/DiffModal.jsx'
import PreviewModal from './components/PreviewModal.jsx'
import LogDrawer from './components/LogDrawer.jsx'
import HistoryDrawer from './components/HistoryDrawer.jsx'

const USE_MOCK = typeof __DOTANEITOR_USE_MOCK__ !== 'undefined'
  ? __DOTANEITOR_USE_MOCK__
  : false

export default function DotaneitorV2() {
  const h = useDotaneitor(USE_MOCK ? mockApi : realApi)
  const [showDiff, setShowDiff] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)

  const stage = h.file ? 'procesar' : 'subir'

  const stepperSteps = [
    { key: 'subir', label: 'Subir archivo', status: h.file ? 'done' : 'active' },
    {
      key: 'procesar', label: 'Procesar',
      status: h.pipelineDone ? 'done' : h.pipelineError ? 'error' : h.file ? 'active' : 'todo',
    },
    {
      key: 'guardar', label: 'Guardar',
      status: h.savedInfo ? 'done' : h.pipelineDone ? 'active' : 'todo',
    },
  ]

  const runningLabel = h.currentStep
    ? ({ normalizar: 'Normalizando...', procesar: 'Procesando datos...', cruzar: 'Cruzando especialidades...' })[h.currentStep]
    : h.syncLoading ? 'Sincronizando...'
    : h.diffLoading ? 'Calculando diferencias...'
    : null

  async function handleDiffConfirm(excluidos) {
    try {
      await h.handleSave(excluidos)
      setShowDiff(false)
      return true
    } catch {
      return false
    }
  }

  function handleExample() {
    const f = new File([''], 'Cargos_salud_20260812.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    h.handleFile(f)
  }

  return (
    <>
      <div className="max-w-2xl space-y-4">

        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">Dotaneitor</h1>
              {USE_MOCK && (
                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-50 border border-amber-200 text-amber-600">
                  Modo demo · datos simulados
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <ServiceBadge online={h.online} onWake={h.checkHealth} />
              {h.ultimaActualizacion && (
                <span className="text-xs text-gray-400">
                  BD: {new Date(h.ultimaActualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistorial(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ClockIcon className="w-3.5 h-3.5" /> Historial
            </button>
            {h.file && (
              <button
                onClick={() => h.reset(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" /> Comenzar de cero
              </button>
            )}
          </div>
        </header>

        {h.error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <XCircleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{h.error}</p>
          </div>
        )}

        <Stepper steps={stepperSteps} current={stage} />

        <UploadStep
          file={h.file}
          busy={h.busy}
          onPick={h.handleFile}
          onClear={h.clearFile}
          onExample={USE_MOCK ? handleExample : null}
          pendienteValidacion={h.pendienteValidacion}
          hayPendienteExterno={h.hayPendienteExterno}
        />

        <ProcessStage
          file={h.file}
          steps={h.steps}
          currentStep={h.currentStep}
          busy={h.busy}
          pipelineDone={h.pipelineDone}
          pipelineError={h.pipelineError}
          onRun={h.runPipeline}
          onRetry={h.retryPipeline}
          onOpenLog={() => setShowLog(true)}
          onOpenPreview={() => { setShowPreview(true); h.loadPreview(1) }}
        />

        <ReviewStage
          pipelineDone={h.pipelineDone}
          diff={h.diff}
          diffLoading={h.diffLoading}
          fechaAsignada={h.fechaAsignada}
          setFechaAsignada={h.setFechaAsignada}
          savedInfo={h.savedInfo}
          syncInfo={h.syncInfo}
          syncLoading={h.syncLoading}
          busy={h.busy}
          onDownload={h.handleDownload}
          onSync={h.handleSync}
        />

      </div>

      {/* Overlays — fuera del max-w para que ocupen toda la pantalla */}
      <LogDrawer open={showLog} onClose={() => setShowLog(false)} logs={h.logs} runningLabel={runningLabel} />

      {showPreview && h.preview && (
        <PreviewModal
          preview={h.preview}
          loading={h.previewLoading}
          page={h.previewPage}
          onPage={h.loadPreview}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showDiff && h.diff && (
        <DiffModal
          diff={h.diff}
          saving={h.saving}
          onConfirm={handleDiffConfirm}
          onClose={() => setShowDiff(false)}
        />
      )}

      <HistoryDrawer
        open={showHistorial}
        onClose={() => setShowHistorial(false)}
        loading={h.historialLoading}
        procesos={h.historial}
        onLoad={h.loadHistorial}
      />
    </>
  )
}
