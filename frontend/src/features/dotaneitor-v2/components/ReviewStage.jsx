import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownTrayIcon, CheckCircleIcon, CircleStackIcon,
  ShieldCheckIcon, DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { Button, Kpi, Spinner } from './ui'

export default function ReviewStage({
  pipelineDone, diff, diffLoading, fechaAsignada, setFechaAsignada,
  savedInfo, syncInfo, syncLoading, busy,
  onDownload, onSync,
}) {
  const navigate = useNavigate()
  if (!pipelineDone) return null

  const hoy = new Date().toISOString().slice(0, 10)
  const hayCambios = diff && (diff.total_nuevos + diff.total_eliminados + diff.total_modificados) > 0

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <h2 className="text-sm font-semibold text-gray-900">Revisión y guardado</h2>

      {/* Resumen del diff */}
      {diffLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Spinner className="w-4 h-4 text-primary-600" />
          Calculando diferencias con la BD actual...
        </div>
      ) : diff ? (
        <div className="flex flex-wrap gap-8">
          <Kpi label="nuevos" value={diff.total_nuevos} tone={diff.total_nuevos ? 'green' : 'gray'} />
          <Kpi label="modificados" value={diff.total_modificados} tone={diff.total_modificados ? 'blue' : 'gray'} />
          <Kpi label="eliminados" value={diff.total_eliminados} tone={diff.total_eliminados ? 'red' : 'gray'} />
          <Kpi label="campos cambiados" value={diff.total_campos_modificados} />
        </div>
      ) : null}

      {diff && !hayCambios && (
        <p className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircleIcon className="w-4 h-4" /> El padrón está actualizado — sin cambios respecto al proceso anterior.
        </p>
      )}

      {/* Fecha del proceso */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Fecha del proceso
          </label>
          <input
            type="date"
            value={fechaAsignada}
            onChange={(e) => setFechaAsignada(e.target.value)}
            max={hoy}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400"
          />
        </div>
        <p className="text-xs text-gray-400 pt-4">
          {fechaAsignada && fechaAsignada < hoy
            ? 'Proceso histórico — solo guarda snapshot, no actualiza el padrón vigente'
            : 'Sin fecha = hoy, actualiza el padrón vigente'}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon={ShieldCheckIcon} onClick={() => navigate('/seguridad/validacion')} disabled={busy || !diff}>
          Validar cambios
        </Button>
        <Button variant="ghost" icon={ArrowDownTrayIcon} onClick={() => onDownload('descargar')} disabled={busy}>
          Exportar Excel
        </Button>
        <Button variant="ghost" icon={DocumentArrowDownIcon} onClick={() => onDownload('reporte-calidad')} disabled={busy}>
          Reporte de calidad
        </Button>
      </div>

      {/* Resultado del guardado */}
      {savedInfo && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          <p className="font-medium mb-1">
            {savedInfo.es_historico
              ? `Snapshot histórico guardado para el ${savedInfo.fecha_asignada}`
              : 'Datos guardados en el padrón'}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-green-600">
            {savedInfo.insertados > 0 && <span>+{savedInfo.insertados} nuevos</span>}
            {savedInfo.registros_actualizados > 0 && (
              <span>~{savedInfo.registros_actualizados} actualizados ({savedInfo.campos_modificados} campos)</span>
            )}
            {savedInfo.eliminados > 0 && <span>-{savedInfo.eliminados} eliminados</span>}
            {!savedInfo.insertados && !savedInfo.registros_actualizados && !savedInfo.eliminados && (
              <span>Sin cambios respecto al proceso anterior</span>
            )}
          </div>
        </div>
      )}

      {/* Sincronización */}
      {savedInfo && !savedInfo.es_historico && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-400 mb-3">
            Actualiza <span className="font-medium text-gray-600">cargo_dotacion</span> con los datos recién guardados.
          </p>
          <Button
            variant={syncInfo ? 'success' : 'primary'}
            icon={CircleStackIcon}
            onClick={onSync}
            disabled={syncLoading || !!syncInfo || syncLoading}
          >
            {syncInfo
              ? 'Sincronización completada'
              : syncLoading
                ? 'Sincronizando...'
                : 'Sincronizar dotación'}
          </Button>
          {syncInfo && (
            <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-gray-500">
              {syncInfo.insertados > 0 && <span className="text-green-600">+{syncInfo.insertados} ocupaciones</span>}
              {syncInfo.actualizados > 0 && <span className="text-blue-600">~{syncInfo.actualizados} actualizados</span>}
              {syncInfo.bajas > 0 && <span className="text-red-500">-{syncInfo.bajas} cerradas</span>}
              {!syncInfo.insertados && !syncInfo.actualizados && !syncInfo.bajas && (
                <span className="text-gray-400">Sin cambios en dotación</span>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}