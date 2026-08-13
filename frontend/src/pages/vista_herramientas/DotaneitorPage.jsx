import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch, apiPost, apiGet } from '../../api/client'
import {
  ArrowUpTrayIcon, DocumentIcon, ArrowDownTrayIcon,
  CheckCircleIcon, XCircleIcon, TrashIcon,
  CircleStackIcon, BellIcon, XMarkIcon,
} from '@heroicons/react/24/outline'

const BASE = '/api/herramientas/dotaneitor'
const PREVIEW_LIMIT = 50

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logColor(type) {
  if (type === 'error')   return 'text-red-600'
  if (type === 'warning') return 'text-amber-600'
  if (type === 'success') return 'text-green-600'
  return 'text-gray-600'
}

function logPrefix(type) {
  if (type === 'error')   return '✗'
  if (type === 'warning') return '⚠'
  if (type === 'success') return '✓'
  return '•'
}

function classifyLog(text) {
  const t = text.toLowerCase()
  if (t.includes('error') || t.includes('fallo') || t.includes('excepción')) return 'error'
  if (t.includes('advertencia') || t.includes('warning') || t.includes('atención')) return 'warning'
  if (t.includes('completado') || t.includes('listo') || t.includes('ok') || t.includes('✓')) return 'success'
  return 'info'
}

async function apiDownload(path) {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') ?? ''
  const match = cd.match(/filename[^;=\n]*=["']?([^"'\n;]+)/)
  const filename = match?.[1] ?? 'descarga.xlsx'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Badge de estado del servicio ────────────────────────────────────────────

function ServiceBadge({ online }) {
  if (online === null) return <span className="text-xs text-gray-400">Verificando servicio...</span>
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${online ? 'text-green-600' : 'text-red-500'}`}>
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-red-400'}`} />
      {online ? 'Servicio activo' : 'Servicio offline — ejecutá start.bat'}
    </span>
  )
}

// ─── Drop zone ───────────────────────────────────────────────────────────────

function DropZone({ onFile, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handle = (f) => {
    if (!f) return
    if (!f.name.match(/\.xlsx?$/i)) return
    onFile(f)
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) handle(e.dataTransfer.files[0]) }}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors
        ${disabled ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
          : dragging ? 'border-primary-400 bg-primary-50 cursor-pointer'
          : 'border-gray-200 hover:border-gray-300 bg-gray-50 cursor-pointer'}`}
    >
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={e => handle(e.target.files[0])} />
      <ArrowUpTrayIcon className="w-7 h-7 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-500">
        Arrastrá el archivo de cargos o{' '}
        <span className="text-primary-600 font-medium">hacé click para seleccionar</span>
      </p>
      <p className="text-xs text-gray-400 mt-1">Solo archivos .xlsx</p>
    </div>
  )
}

// ─── Log panel ───────────────────────────────────────────────────────────────

function LogPanel({ logs, loading }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-200 bg-white flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Log</span>
        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-blue-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            procesando...
          </span>
        )}
      </div>
      <div className="h-40 overflow-y-auto px-3 py-2 space-y-0.5 font-mono text-xs">
        {logs.length === 0 && <p className="text-gray-400">Sin actividad aún.</p>}
        {logs.map((l, i) => (
          <p key={i} className={logColor(l.type)}>
            {logPrefix(l.type)} {l.text}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// ─── Preview table ────────────────────────────────────────────────────────────

function PreviewTable({ preview, page, onPage }) {
  if (!preview) return null
  const { cols, rows, total } = preview
  const totalPages = Math.max(1, Math.ceil(total / PREVIEW_LIMIT))

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Vista previa — {total.toLocaleString('es-AR')} filas
        </span>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => onPage(1)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">«</button>
          <button disabled={page === 1} onClick={() => onPage(p => p - 1)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">‹</button>
          <span className="px-2 text-xs text-gray-500">{page}/{totalPages}</span>
          <button disabled={page === totalPages} onClick={() => onPage(p => p + 1)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">›</button>
          <button disabled={page === totalPages} onClick={() => onPage(totalPages)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">»</button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-64">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              {cols.map(c => (
                <th key={c} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}>
                {cols.map(c => (
                  <td key={c} className="px-3 py-1.5 text-gray-700 whitespace-nowrap border-b border-gray-50 max-w-[200px] truncate">
                    {row[c] === null || row[c] === undefined ? <span className="text-gray-300">—</span> : String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const INIT = {
  sessionId: null,
  cargosFile: null,
  normalizado: false,
  procesado: false,
  cruzado: false,
}

export default function DotaneitorPage() {
  const [state,       setState]      = useState(INIT)
  const [loading,     setLoading]    = useState(false)
  const [logs,        setLogs]       = useState([])
  const [preview,     setPreview]    = useState(null)
  const [previewPage, setPreviewPage] = useState(1)
  const [online,      setOnline]     = useState(null)
  const [error,       setError]      = useState(null)
  const [showHistorial, setShowHistorial] = useState(false)
  const [guardadoInfo,  setGuardadoInfo]  = useState(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [syncInfo,       setSyncInfo]      = useState(null)
  const [syncLoading,    setSyncLoading]   = useState(false)
  const [diff,           setDiff]          = useState(null)
  const [diffLoading,    setDiffLoading]   = useState(false)
  const [showDiff,       setShowDiff]      = useState(false)
  const [fechaAsignada,  setFechaAsignada] = useState('')  // YYYY-MM-DD; vacío = hoy

  const addLog = useCallback((text, type) => {
    setLogs(l => [...l, { text, type: type ?? classifyLog(text) }])
  }, [])

  // ── Health check al montar ──────────────────────────────────────────────────
  useEffect(() => {
    apiGet(`${BASE}/health`)
      .then(() => setOnline(true))
      .catch(() => setOnline(false))

    apiGet(`${BASE}/ultima-actualizacion`)
      .then(r => setUltimaActualizacion(r.ultima))
      .catch(() => {})

    // Restaurar sesión si existe
    const saved = sessionStorage.getItem('dotaneitor_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setState(s => ({ ...s, ...parsed }))
        if (parsed.cargosFile) {
          setLogs([{ text: `Sesión restaurada — archivo: ${parsed.cargosFile}`, type: 'info' }])
        }
      } catch { /* ignore */ }
    }
  }, [])

  // Persistir estado de sesión
  useEffect(() => {
    if (state.sessionId) {
      sessionStorage.setItem('dotaneitor_session', JSON.stringify({
        sessionId: state.sessionId,
        cargosFile: state.cargosFile,
        normalizado: state.normalizado,
        procesado: state.procesado,
        cruzado: state.cruzado,
      }))
    }
  }, [state])

  // ── Cargar preview cuando cambia la página ──────────────────────────────────
  useEffect(() => {
    if (!state.sessionId || !state.procesado) return
    apiGet(`${BASE}/preview`, { session_id: state.sessionId, page: previewPage, limit: PREVIEW_LIMIT })
      .then(setPreview)
      .catch(() => {})
  }, [previewPage]) // eslint-disable-line

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleFile(file) {
    setLoading(true); setError(null)
    try {
      let sid = state.sessionId
      if (!sid) {
        const r = await apiPost(`${BASE}/session`)
        sid = r.session_id
      }
      const fd = new FormData()
      fd.append('file', file)
      fd.append('session_id', sid)
      const res = await apiFetch(`${BASE}/upload-cargos`, { method: 'POST', body: fd })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail ?? `Error ${res.status}`) }
      const data = await res.json()
      setState(s => ({ ...s, sessionId: sid, cargosFile: data.filename, normalizado: false, procesado: false, cruzado: false }))
      setPreview(null); setPreviewPage(1)
      addLog(`Archivo cargado: ${data.filename} (${data.rows.toLocaleString('es-AR')} filas)`, 'success')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const STEP_LABELS = {
    normalizar: 'Normalizando cargos...',
    procesar:   'Procesando datos contra tablas de referencia...',
    cruzar:     'Cruzando especialidades...',
  }

  async function runStep(endpoint, stateKey, withPreview = false) {
    setLoading(true); setError(null)
    addLog(STEP_LABELS[endpoint] ?? `Ejecutando ${endpoint}...`, 'info')
    try {
      const data = await apiPost(`${BASE}/${endpoint}`, { session_id: state.sessionId })
      ;(data.logs ?? []).forEach(l => {
        if (typeof l === 'string') addLog(l)
        else addLog(l.text ?? String(l), l.type)
      })
      setState(s => ({ ...s, [stateKey]: true }))
      if (withPreview) {
        setPreviewPage(1)
        const prev = await apiGet(`${BASE}/preview`, { session_id: state.sessionId, page: 1, limit: PREVIEW_LIMIT })
        setPreview(prev)
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleDescargar(endpoint) {
    setLoading(true); setError(null)
    try {
      await apiDownload(`${BASE}/${endpoint}?session_id=${state.sessionId}`)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleVerCambios() {
    setDiffLoading(true); setError(null)
    addLog('Calculando diferencias con la BD actual...', 'info')
    try {
      const body = { session_id: state.sessionId }
      if (fechaAsignada) body.fecha_asignada = fechaAsignada
      const data = await apiPost(`${BASE}/diff`, body)
      setDiff(data)
      setShowDiff(true)
      const { total_nuevos: n, total_eliminados: e, total_modificados: m } = data
      addLog(`Diff listo: +${n} nuevos, -${e} eliminados, ~${m} modificados`, 'success')
    } catch (e) { setError(e.message) }
    finally { setDiffLoading(false) }
  }

  async function handleGuardarBD() {
    setLoading(true); setError(null)
    addLog('Guardando en base de datos...', 'info')
    try {
      const body = { session_id: state.sessionId }
      if (fechaAsignada) body.fecha_asignada = fechaAsignada
      const r = await apiPost(`${BASE}/guardar-bd`, body)
      setGuardadoInfo(r)
      if (!r.es_historico) {
        setUltimaActualizacion(new Date().toISOString().replace('T', ' ').slice(0, 19))
      }
      const partes = [
        r.es_historico ? `📅 Snapshot histórico guardado para ${r.fecha_asignada}` : null,
        r.insertados     ? `+${r.insertados} nuevos`                    : null,
        r.registros_actualizados ? `~${r.registros_actualizados} actualizados (${r.campos_modificados} campos)` : null,
        r.eliminados     ? `-${r.eliminados} eliminados`                : null,
      ].filter(Boolean)
      addLog(`✓ ${partes.length ? partes.join(', ') : 'Snapshot guardado sin cambios en vigente'}`, 'success')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleSincronizar() {
    setSyncLoading(true); setError(null)
    addLog('Sincronizando dotación desde padrón...', 'info')
    try {
      const r = await apiPost('/api/dotacion/cargos/sincronizar')
      setSyncInfo(r)
      const partes = [
        r.insertados  ? `+${r.insertados} nuevas ocupaciones`  : null,
        r.actualizados ? `~${r.actualizados} actualizados`     : null,
        r.bajas       ? `-${r.bajas} cerradas`                 : null,
      ].filter(Boolean)
      addLog(`✓ Dotación sincronizada: ${partes.length ? partes.join(', ') : 'sin cambios'}`, 'success')
    } catch (e) {
      addLog(`⚠ Sincronización falló: ${e.message} — los datos en BD están guardados correctamente`, 'warning')
    } finally {
      setSyncLoading(false)
    }
  }

  async function handleNuevaSesion() {
    if (state.sessionId) {
      await apiFetch(`${BASE}/session`, {
        method: 'DELETE',
        body: JSON.stringify({ session_id: state.sessionId }),
        headers: { 'content-type': 'application/json' },
      }).catch(() => {})
    }
    sessionStorage.removeItem('dotaneitor_session')
    setState(INIT); setLogs([]); setPreview(null); setPreviewPage(1); setError(null); setSyncInfo(null)
    addLog('Sesión reiniciada.', 'info')
  }

  const busy = loading || !online

  return (
    <div className="max-w-4xl space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Dotaneitor</h1>
          <div className="flex items-center gap-3">
            <ServiceBadge online={online} />
            {ultimaActualizacion && (
              <span className="text-xs text-gray-400">
                BD actualizada: {new Date(ultimaActualizacion).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistorial(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            <BellIcon className="w-3.5 h-3.5" />
            Notificaciones
            {guardadoInfo && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
          {(state.sessionId || state.cargosFile) && (
            <button onClick={handleNuevaSesion}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
              <TrashIcon className="w-3.5 h-3.5" /> Comenzar de cero
            </button>
          )}
        </div>
      </div>

      {/* Error global */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
          <XCircleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Paso 1 — Subir archivo */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <StepHeader n={1} label="Archivo de Cargos Salud" done={!!state.cargosFile} />
        {state.cargosFile
          ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
              <DocumentIcon className="w-5 h-5 text-primary-500 shrink-0" />
              <span className="text-sm text-gray-700 flex-1 truncate">{state.cargosFile}</span>
              <button onClick={() => setState(s => ({ ...s, cargosFile: null, normalizado: false, procesado: false, cruzado: false }))}
                className="text-xs text-gray-400 hover:text-red-500">Cambiar</button>
            </div>
          )
          : <DropZone onFile={handleFile} disabled={busy || !online} />
        }
      </div>

      {/* Pasos 2-4 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <StepButton n={2} label="Normalizar" done={state.normalizado}
            disabled={busy || !state.cargosFile || state.normalizado}
            onClick={() => runStep('normalizar', 'normalizado')} />
          <StepButton n={3} label="Procesar" done={state.procesado}
            disabled={busy || !state.normalizado || state.procesado}
            onClick={() => runStep('procesar', 'procesado', true)} />
          <StepButton n={4} label="Cruzar" done={state.cruzado}
            disabled={busy || !state.procesado || state.cruzado}
            onClick={() => runStep('cruzar', 'cruzado', true)} />
        </div>
      </div>

      {/* Paso 5 — Validar cambios + guardar */}
      {state.procesado && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <StepHeader n={5} label="Validar y guardar" done={!!guardadoInfo} />

          {/* Selector de fecha */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Fecha del proceso
              </label>
              <input
                type="date"
                value={fechaAsignada}
                onChange={e => setFechaAsignada(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="form-input text-sm py-1 w-44"
              />
            </div>
            <p className="text-xs text-gray-400 mt-4">
              {fechaAsignada
                ? fechaAsignada < new Date().toISOString().slice(0, 10)
                  ? <span className="text-amber-600">📅 Proceso histórico — solo guarda snapshot, no actualiza el padrón vigente</span>
                  : '✓ Proceso vigente — actualiza el padrón'
                : '✓ Sin fecha = hoy, actualiza el padrón vigente'
              }
            </p>
          </div>

          <div className="flex flex-wrap gap-3 mt-3">
            <button
              onClick={handleVerCambios}
              disabled={loading || diffLoading || !state.cruzado}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50">
              {diffLoading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <CircleStackIcon className="w-4 h-4" />}
              {guardadoInfo ? 'Ver cambios nuevamente' : 'Ver cambios antes de guardar'}
            </button>
            <button onClick={() => handleDescargar('descargar')} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <ArrowDownTrayIcon className="w-4 h-4" /> Exportar Excel
            </button>
            <button onClick={() => handleDescargar('reporte-calidad')} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <ArrowDownTrayIcon className="w-4 h-4" /> Reporte de calidad
            </button>
          </div>
          {guardadoInfo && (
            <div className="mt-3 flex gap-4 text-xs">
              {guardadoInfo.insertados > 0 && <span className="text-green-600">+{guardadoInfo.insertados} nuevos</span>}
              {guardadoInfo.registros_actualizados > 0 && <span className="text-blue-600">~{guardadoInfo.registros_actualizados} actualizados</span>}
              {guardadoInfo.eliminados > 0 && <span className="text-red-500">-{guardadoInfo.eliminados} eliminados</span>}
              {!guardadoInfo.insertados && !guardadoInfo.registros_actualizados && !guardadoInfo.eliminados && (
                <span className="text-gray-400">Sin cambios respecto al proceso anterior</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Paso 6 — Sincronizar dotación */}
      {guardadoInfo && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <StepHeader n={6} label="Sincronizar dotación" done={!!syncInfo} />
          <p className="text-xs text-gray-400 mt-1 mb-3">
            Actualiza <span className="font-medium text-gray-600">cargo_dotacion</span> con los datos recién guardados en el padrón.
          </p>
          <button
            onClick={handleSincronizar}
            disabled={syncLoading || !!syncInfo}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors
              ${ syncInfo
                ? 'bg-green-50 border border-green-200 text-green-700 cursor-default'
                : syncLoading
                  ? 'bg-gray-100 text-gray-400 cursor-wait'
                  : 'bg-primary-700 text-white hover:bg-primary-800'
              }`}
          >
            <CircleStackIcon className="w-4 h-4" />
            {syncInfo ? 'Sincronización completada' : syncLoading ? 'Sincronizando...' : 'Sincronizar dotación'}
          </button>
          {syncInfo && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs">
              {syncInfo.insertados   > 0 && <span className="text-green-600">+{syncInfo.insertados} nuevas ocupaciones</span>}
              {syncInfo.actualizados > 0 && <span className="text-blue-600">~{syncInfo.actualizados} actualizados</span>}
              {syncInfo.bajas        > 0 && <span className="text-red-500">-{syncInfo.bajas} cerradas</span>}
              {!syncInfo.insertados && !syncInfo.actualizados && !syncInfo.bajas && (
                <span className="text-gray-400">Sin cambios en dotación</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Log */}
      <LogPanel logs={logs} loading={loading} />

      {/* Preview */}
      {preview && (
        <PreviewTable preview={preview} page={previewPage} onPage={setPreviewPage} />
      )}

      {/* Historial */}
      {showHistorial && <HistorialPanel onClose={() => setShowHistorial(false)} />}

      {/* Portal de validación de cambios */}
      {showDiff && diff && (
        <DiffPanel
          diff={diff}
          loading={loading}
          onClose={() => setShowDiff(false)}
          onConfirm={async () => {
            setShowDiff(false)
            await handleGuardarBD()
          }}
        />
      )}
    </div>
  )
}

// ─── Panel de validación de cambios (Diff) ──────────────────────────────────

const DIFF_TABS = [
  { key: 'modificados', label: 'Modificados',  color: 'text-blue-600',  bg: 'bg-blue-50',  border: 'border-blue-200'  },
  { key: 'nuevos',      label: 'Nuevos',       color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'eliminados',  label: 'Eliminados',   color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200'   },
]

const CAMPO_LABEL = {
  ayn: 'Nombre', siglas: 'Sigla', escalafon: 'Escalafón',
  codigo_de_registro: 'Cód. Registro', literal_puesto: 'Puesto',
  especialidad: 'Especialidad', unificador_de_puestos: 'Unificador',
  agrupador: 'Agrupador', estado: 'Estado', situacion_de_revista: 'Sit. Revista',
  universo_totalizador: 'Universo',
}

function DiffPanel({ diff, loading, onClose, onConfirm }) {
  const [tab,    setTab]    = useState('modificados')
  const [search, setSearch] = useState('')
  const [campo,  setCampo]  = useState('todos')

  const counts = {
    modificados: diff.total_modificados,
    nuevos:      diff.total_nuevos,
    eliminados:  diff.total_eliminados,
  }

  const camposDisponibles = tab === 'modificados'
    ? ['todos', ...new Set(diff.modificados.flatMap(m => m.cambios.map(c => c.campo)))]
    : ['todos']

  const filas = diff[tab] ?? []
  const filtradas = filas.filter(f => {
    const txt = search.toLowerCase()
    const matchSearch = !txt ||
      (f.ayn ?? '').toLowerCase().includes(txt) ||
      (f.id_sial ?? '').toLowerCase().includes(txt) ||
      (f.siglas ?? '').toLowerCase().includes(txt)
    const matchCampo = campo === 'todos' || tab !== 'modificados' ||
      f.cambios?.some(c => c.campo === campo)
    return matchSearch && matchCampo
  })

  const hayDatos = diff.total_nuevos + diff.total_eliminados + diff.total_modificados > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200"
        onMouseDown={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="font-semibold text-gray-800">Validación de cambios</h2>
            <p className="text-xs text-gray-400 mt-0.5">Revisá los cambios antes de guardar en la base de datos</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen */}
        <div className="flex gap-6 px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
          {[
            { label: 'modificados',      val: diff.total_modificados,      color: 'text-blue-600'  },
            { label: 'nuevos',           val: diff.total_nuevos,           color: 'text-green-600' },
            { label: 'eliminados',       val: diff.total_eliminados,       color: 'text-red-500'   },
            { label: 'campos cambiados', val: diff.total_campos_modificados, color: 'text-gray-700' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.val.toLocaleString('es-AR')}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs + filtros */}
        <div className="flex items-center gap-3 px-5 py-2 border-b border-gray-100 shrink-0 flex-wrap">
          <div className="flex gap-1">
            {DIFF_TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setCampo('todos') }}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors
                  ${tab === t.key ? `${t.bg} ${t.color} ${t.border}` : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                {t.label} <span className="ml-1 opacity-60">({counts[t.key].toLocaleString('es-AR')})</span>
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, ID SIAL o sigla..."
            className="flex-1 min-w-[180px] px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400" />
          {tab === 'modificados' && camposDisponibles.length > 1 && (
            <select value={campo} onChange={e => setCampo(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none">
              {camposDisponibles.map(c => (
                <option key={c} value={c}>{c === 'todos' ? 'Todos los campos' : (CAMPO_LABEL[c] ?? c)}</option>
              ))}
            </select>
          )}
          <span className="text-xs text-gray-400 ml-auto">{filtradas.length.toLocaleString('es-AR')} filas</span>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-auto">
          {!hayDatos ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
              <CheckCircleIcon className="w-10 h-10 mb-2 text-green-400" />
              <p className="text-sm">Sin cambios — el padrón está actualizado</p>
            </div>
          ) : filtradas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">Sin resultados para el filtro aplicado.</p>
          ) : tab === 'modificados' ? (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  {['ID SIAL', 'Nombre', 'Sigla', 'Campo', 'Antes', 'Después'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.flatMap(f => {
                  const cambiosFiltrados = campo === 'todos' ? f.cambios : f.cambios.filter(c => c.campo === campo)
                  return cambiosFiltrados.map((c, j) => (
                    <tr key={`${f.id_sial}-${c.campo}`} className={j === 0 ? 'border-t-2 border-gray-100' : ''}>
                      {j === 0 && (
                        <>
                          <td className="px-3 py-1.5 text-gray-400 font-mono align-top" rowSpan={cambiosFiltrados.length}>{f.id_sial}</td>
                          <td className="px-3 py-1.5 text-gray-700 font-medium align-top max-w-[140px] truncate" rowSpan={cambiosFiltrados.length}>{f.ayn}</td>
                          <td className="px-3 py-1.5 text-gray-500 align-top" rowSpan={cambiosFiltrados.length}>{f.siglas}</td>
                        </>
                      )}
                      <td className="px-3 py-1.5 text-blue-500 font-medium whitespace-nowrap">{CAMPO_LABEL[c.campo] ?? c.campo}</td>
                      <td className="px-3 py-1.5 text-red-400 max-w-[160px] truncate">{c.antes ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-1.5 text-green-600 max-w-[160px] truncate">{c.despues ?? <span className="text-gray-300">—</span>}</td>
                    </tr>
                  ))
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  {['ID SIAL', 'Nombre', 'Sigla', 'Escalafón', 'Puesto', 'Especialidad'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.map((f, i) => (
                  <tr key={f.id_sial} className={i % 2 ? 'bg-gray-50/50' : ''}>
                    <td className="px-3 py-1.5 text-gray-400 font-mono">{f.id_sial}</td>
                    <td className="px-3 py-1.5 text-gray-700 font-medium max-w-[160px] truncate">{f.ayn}</td>
                    <td className="px-3 py-1.5 text-gray-500">{f.siglas}</td>
                    <td className="px-3 py-1.5 text-gray-600">{f.escalafon}</td>
                    <td className="px-3 py-1.5 text-gray-600 max-w-[140px] truncate">{f.literal_puesto}</td>
                    <td className="px-3 py-1.5 text-gray-600 max-w-[140px] truncate">{f.especialidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50 font-medium">
            <CircleStackIcon className="w-4 h-4" />
            {loading ? 'Guardando...' : 'Confirmar y guardar en BD'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel historial / notificaciones ───────────────────────────────────────

function HistorialPanel({ onClose }) {
  const [procesos, setProcesos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    apiGet(`${BASE}/historial`, { limit: 10 })
      .then(setProcesos)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fmt = (iso) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mt-12 border border-gray-200 overflow-hidden"
        onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-800">Historial de procesos</span>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[70vh]">
          {loading && <p className="text-xs text-gray-400 text-center py-8">Cargando...</p>}
          {!loading && !procesos.length && (
            <p className="text-xs text-gray-400 text-center py-8">Sin procesos guardados aún.</p>
          )}
          {procesos.map((p, i) => (
            <div key={p.proceso_id} className="border-b border-gray-50 last:border-0">
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left">
                <div>
                  <p className="text-xs font-medium text-gray-700">{fmt(p.fecha)}</p>
                  <div className="flex gap-3 mt-0.5">
                    {p.es_carga_inicial
                      ? <span className="text-[10px] text-gray-500">Carga inicial — {p.insertados} registros</span>
                      : (
                        <>
                          {p.insertados > 0 && <span className="text-[10px] text-green-600">+{p.insertados} nuevos</span>}
                          {p.registros_actualizados > 0 && <span className="text-[10px] text-blue-600">~{p.registros_actualizados} actualizados</span>}
                          {p.eliminados > 0 && <span className="text-[10px] text-red-500">-{p.eliminados} eliminados</span>}
                          {!p.insertados && !p.registros_actualizados && !p.eliminados && (
                            <span className="text-[10px] text-gray-400">Sin cambios</span>
                          )}
                        </>
                      )
                    }
                  </div>
                </div>
                <span className="text-gray-300 text-xs">{expanded === i ? '▲' : '▼'}</span>
              </button>
              {expanded === i && p.cambios?.length > 0 && (
                <div className="px-4 pb-3">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="text-left py-1 pr-2">ID SIAL</th>
                        <th className="text-left py-1 pr-2">AYN</th>
                        <th className="text-left py-1 pr-2">Campo</th>
                        <th className="text-left py-1 pr-2">Antes</th>
                        <th className="text-left py-1">Después</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.cambios.slice(0, 50).map((c, j) => (
                        <tr key={j} className="border-t border-gray-50">
                          <td className="py-0.5 pr-2 text-gray-500">{c.id_sial}</td>
                          <td className="py-0.5 pr-2 text-gray-600 max-w-[100px] truncate">{c.ayn}</td>
                          <td className="py-0.5 pr-2 text-blue-500 font-medium">{c.campo}</td>
                          <td className="py-0.5 pr-2 text-red-400 max-w-[80px] truncate">{c.valor_anterior ?? '—'}</td>
                          <td className="py-0.5 text-green-600 max-w-[80px] truncate">{c.valor_nuevo ?? '—'}</td>
                        </tr>
                      ))}
                      {p.cambios.length > 50 && (
                        <tr><td colSpan={5} className="text-gray-400 py-1">... y {p.cambios.length - 50} cambios más</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              {expanded === i && !p.cambios?.length && p.registros_actualizados > 0 && (
                <p className="px-4 pb-3 text-[10px] text-gray-400">Detalle no disponible para este proceso.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componentes pequeños ─────────────────────────────────────────────────

function StepHeader({ n, label, done }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        ${done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
        {done ? '✓' : n}
      </span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  )
}

function StepButton({ n, label, done, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border text-sm font-medium transition-colors
        ${done
          ? 'border-green-200 bg-green-50 text-green-700 cursor-default'
          : disabled
            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
            : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
        }`}>
      {done
        ? <CheckCircleIcon className="w-6 h-6 text-green-500" />
        : <span className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold">{n}</span>
      }
      {label}
    </button>
  )
}
