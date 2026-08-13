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

  async function handleGuardarBD() {
    setLoading(true); setError(null)
    addLog('Guardando en base de datos...', 'info')
    try {
      const r = await apiPost(`${BASE}/guardar-bd`, { session_id: state.sessionId })
      setGuardadoInfo(r)
      setUltimaActualizacion(new Date().toISOString().replace('T', ' ').slice(0, 19))
      const partes = [
        r.insertados     ? `+${r.insertados} nuevos`                    : null,
        r.registros_actualizados ? `~${r.registros_actualizados} actualizados (${r.campos_modificados} campos)` : null,
        r.eliminados     ? `-${r.eliminados} eliminados`                : null,
      ].filter(Boolean)
      addLog(`✓ BD actualizada: ${partes.length ? partes.join(', ') : 'sin cambios'}`, 'success')
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

      {/* Paso 5 — Descargas + BD */}
      {state.procesado && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <StepHeader n={5} label="Exportar y guardar" done={false} />
          <div className="flex flex-wrap gap-3 mt-3">
            <button onClick={handleGuardarBD} disabled={loading || !state.cruzado}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50">
              <CircleStackIcon className="w-4 h-4" /> Guardar en BD
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
                    {p.insertados > 0 && <span className="text-[10px] text-green-600">+{p.insertados} nuevos</span>}
                    {p.registros_actualizados > 0 && <span className="text-[10px] text-blue-600">~{p.registros_actualizados} actualizados</span>}
                    {p.eliminados > 0 && <span className="text-[10px] text-red-500">-{p.eliminados} eliminados</span>}
                    {!p.insertados && !p.registros_actualizados && !p.eliminados && (
                      <span className="text-[10px] text-gray-400">Sin cambios</span>
                    )}
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
