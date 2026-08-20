import { useCallback, useEffect, useRef, useState } from 'react'

export const PIPELINE_STEPS = [
  { key: 'normalizar', label: 'Normalizar cargos' },
  { key: 'procesar',   label: 'Procesar contra tablas' },
  { key: 'cruzar',     label: 'Cruzar especialidades' },
]

const STEP_START_LABEL = {
  normalizar: 'Normalizando cargos...',
  procesar:   'Procesando datos contra tablas de referencia...',
  cruzar:     'Cruzando especialidades...',
}

const PREVIEW_LIMIT = 50
const PENDIENTE_KEY = 'dotaneitor_pendiente_validacion'

function classifyLog(text) {
  const t = text.toLowerCase()
  if (t.includes('error') || t.includes('fallo') || t.includes('excepción')) return 'error'
  if (t.includes('advertencia') || t.includes('warning') || t.includes('atención')) return 'warning'
  if (t.includes('completado') || t.includes('listo') || t.includes('ok') || t.includes('✓')) return 'success'
  return 'info'
}

function logType(log) {
  if (typeof log === 'string') return classifyLog(log)
  return log.type ?? classifyLog(String(log.text ?? ''))
}

function logText(log) {
  if (typeof log === 'string') return log
  return String(log.text ?? log)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function useDotaneitor(api) {
  const [file, setFile] = useState(null)          // { name, rows }
  const [sessionId, setSessionId] = useState(null)
  const [fechaAsignada, setFechaAsignada] = useState('')
  const [steps, setSteps] = useState(() =>
    Object.fromEntries(PIPELINE_STEPS.map((s) => [s.key, 'idle'])))
  const [currentStep, setCurrentStep] = useState(null)
  const [diff, setDiff] = useState(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [savedInfo, setSavedInfo] = useState(null)
  const [syncInfo, setSyncInfo] = useState(null)
  const [syncLoading, setSyncLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState([])
  const [preview, setPreview] = useState(null)
  const [previewPage, setPreviewPage] = useState(1)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [online, setOnline] = useState(null)
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [historial, setHistorial] = useState([])
  const [historialLoading, setHistorialLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const runningRef = useRef(false)

  // Pendiente de validación: diff calculado pero no aprobado aún
  const [pendienteValidacion, setPendienteValidacion] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PENDIENTE_KEY) || 'null') } catch { return null }
  })

  const addLog = useCallback((text, type) => {
    setLogs((l) => [...l, { text, type: type ?? classifyLog(text) }])
  }, [])

  const busy = uploading || runningRef.current || !!currentStep || diffLoading || saving || syncLoading

  // ── Health ────────────────────────────────────────────────────────────────
  const checkHealth = useCallback(async (retries = 8, delay = 8000) => {
    setOnline(null)
    for (let i = 0; i < retries; i++) {
      try {
        const ok = await api.health()
        if (ok) { setOnline(true); return }
      } catch { /* ignorar */ }
      if (i < retries - 1) await wait(delay)
    }
    setOnline(false)
  }, [api])

  useEffect(() => {
    checkHealth()
    api.ultimaActualizacion().then(setUltimaActualizacion).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sesión y archivo ──────────────────────────────────────────────────────

  async function handleFile(input) {
    setUploading(true)
    setError(null)
    try {
      let sid = sessionId
      if (!sid) {
        const r = await api.createSession()
        sid = r.session_id
        setSessionId(sid)
      }
      const data = await api.uploadCargos(sid, input)
      setFile({ name: data.filename, rows: data.rows })
      setDiff(null)
      setSavedInfo(null)
      setSyncInfo(null)
      setSteps(Object.fromEntries(PIPELINE_STEPS.map((s) => [s.key, 'idle'])))
      setPreview(null)
      setPreviewPage(1)
      const m = (input?.name ?? '').match(/(\d{4})(\d{2})(\d{2})/)
      if (m) {
        const detectada = `${m[1]}-${m[2]}-${m[3]}`
        const hoy = new Date().toISOString().slice(0, 10)
        setFechaAsignada(detectada !== hoy ? detectada : '')
      }
      addLog(`Archivo cargado: ${data.filename} (${(data.rows ?? 0).toLocaleString('es-AR')} filas)`, 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  function clearFile() {
    setFile(null)
    setDiff(null)
    setSavedInfo(null)
    setSyncInfo(null)
    setSteps(Object.fromEntries(PIPELINE_STEPS.map((s) => [s.key, 'idle'])))
    setPreview(null)
    setError(null)
  }

  // ── Pipeline automático: normalizar → procesar → cruzar ───────────────────

  async function pollJob(jobId) {
    for (let i = 0; i < 300; i++) {
      await wait(2000)
      let job
      try {
        job = await api.pollJob(jobId)
      } catch (e) {
        if (e.status === 404) throw new Error('El servidor se reinició durante el proceso. Reintentá el paso.')
        throw e
      }
      if (!job) throw new Error('El servidor se reinició durante el proceso. Reintentá el paso.')
      if (job.status === 'done') return job.result
      if (job.status === 'error') throw new Error(job.error?.split('\n')[0] ?? 'Error en el servidor')
    }
    throw new Error('Timeout esperando respuesta del servidor')
  }

  async function runStep(step) {
    setCurrentStep(step.key)
    addLog(STEP_START_LABEL[step.key], 'info')
    const { job_id } = await api.runStep(sessionId, step.key)
    const data = await pollJob(job_id)
    ;(data.logs ?? []).forEach((l) => addLog(logText(l), logType(l)))
    setSteps((s) => ({ ...s, [step.key]: 'done' }))
    setCurrentStep(null)
  }

  async function runPipeline() {
    if (runningRef.current || !sessionId || !file) return
    runningRef.current = true
    setError(null)
    try {
      for (const step of PIPELINE_STEPS) {
        if (steps[step.key] === 'done') continue
        try {
          await runStep(step)
        } catch (e) {
          setSteps((s) => ({ ...s, [step.key]: 'error' }))
          throw e
        }
      }
      await loadDiff()
    } catch (e) {
      setError(e.message)
    } finally {
      runningRef.current = false
    }
  }

  function retryPipeline() {
    setSteps(Object.fromEntries(PIPELINE_STEPS.map((s) => [s.key, 'idle'])))
    runPipeline()
  }

  // ── Diff ──────────────────────────────────────────────────────────────────

  async function loadDiff() {
    if (!sessionId || !file) return
    setDiffLoading(true)
    setError(null)
    addLog('Calculando diferencias con la BD actual...', 'info')
    try {
      const data = await api.diff(sessionId, fechaAsignada)
      setDiff(data)
      // Persistir solo metadatos (sin el diff completo para no exceder quota de localStorage)
      const pendiente = {
        sessionId,
        fechaAsignada,
        filename: file?.name,
        totales: {
          total_nuevos: data.total_nuevos,
          total_modificados: data.total_modificados,
          total_eliminados: data.total_eliminados,
          total_campos_modificados: data.total_campos_modificados,
        },
      }
      localStorage.setItem(PENDIENTE_KEY, JSON.stringify(pendiente))
      setPendienteValidacion(pendiente)
      const { total_nuevos: n, total_eliminados: e, total_modificados: m } = data
      addLog(`Diff listo: +${n} nuevos, -${e} eliminados, ~${m} modificados`, 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setDiffLoading(false)
    }
  }

  function clearPendiente() {
    localStorage.removeItem(PENDIENTE_KEY)
    setPendienteValidacion(null)
  }

  // ── Guardado ──────────────────────────────────────────────────────────────

  async function handleSave(excluidos) {
    setSaving(true)
    setError(null)
    try {
      const r = await api.guardar(sessionId, excluidos, fechaAsignada)
      setSavedInfo(r)
      if (!r.es_historico) {
        setUltimaActualizacion(new Date().toISOString().replace('T', ' ').slice(0, 19))
      }
      if (!r.es_historico) await loadDiff()
      const partes = [
        r.es_historico ? `snapshot histórico para ${r.fecha_asignada}` : null,
        r.insertados ? `+${r.insertados} nuevos` : null,
        r.registros_actualizados ? `~${r.registros_actualizados} actualizados` : null,
        r.eliminados ? `-${r.eliminados} eliminados` : null,
      ].filter(Boolean)
      addLog(`✓ ${r.es_historico ? 'Guardado: ' : 'Guardado en BD: '}${partes.length ? partes.join(', ') : 'sin cambios'}`, 'success')
      return r
    } catch (e) {
      setError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  // ── Sincronización ────────────────────────────────────────────────────────

  async function handleSync() {
    setSyncLoading(true)
    setError(null)
    addLog('Sincronizando dotación desde padrón...', 'info')
    try {
      const r = await api.sincronizar()
      setSyncInfo(r)
      const partes = [
        r.insertados ? `+${r.insertados} nuevas ocupaciones` : null,
        r.actualizados ? `~${r.actualizados} actualizados` : null,
        r.bajas ? `-${r.bajas} cerradas` : null,
      ].filter(Boolean)
      addLog(`✓ Dotación sincronizada: ${partes.length ? partes.join(', ') : 'sin cambios'}`, 'success')
    } catch (e) {
      addLog(`Sincronización falló: ${e.message}`, 'warning')
      setError(e.message)
    } finally {
      setSyncLoading(false)
    }
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  async function loadPreview(page) {
    if (!sessionId) return
    setPreviewLoading(true)
    try {
      const p = await api.preview(sessionId, page, PREVIEW_LIMIT)
      setPreview(p)
      setPreviewPage(page)
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Descargas ─────────────────────────────────────────────────────────────

  async function handleDownload(tipo) {
    setError(null)
    try {
      await api.descargar(sessionId, tipo)
    } catch (e) {
      setError(e.message)
    }
  }

  // ── Historial ─────────────────────────────────────────────────────────────

  async function loadHistorial() {
    setHistorialLoading(true)
    try {
      setHistorial(await api.historial())
    } finally {
      setHistorialLoading(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  async function reset(todo = false) {
    if (sessionId) await api.deleteSession(sessionId).catch(() => {})
    setSessionId(null)
    setFile(null)
    setDiff(null)
    setSavedInfo(null)
    setSyncInfo(null)
    setLogs([])
    setPreview(null)
    setSteps(Object.fromEntries(PIPELINE_STEPS.map((s) => [s.key, 'idle'])))
    setError(null)
    if (todo) setFechaAsignada('')
    addLog('Sesión reiniciada.', 'info')
  }

  // Bloquear subida si hay pendiente de validación (distinto a la sesión actual)
  const hayPendienteExterno = !!pendienteValidacion &&
    pendienteValidacion.sessionId !== sessionId

  const allStepsDone = PIPELINE_STEPS.every((s) => steps[s.key] === 'done')
  const pipelineError = PIPELINE_STEPS.some((s) => steps[s.key] === 'error')

  return {
    // estado
    file, sessionId, fechaAsignada, setFechaAsignada,
    steps, currentStep, pipelineDone: allStepsDone, pipelineError,
    diff, diffLoading, savedInfo, syncInfo, syncLoading, saving,
    logs, preview, previewPage, previewLoading,
    online, ultimaActualizacion, error, busy, uploading,
    historial, historialLoading,
    pendienteValidacion, hayPendienteExterno, clearPendiente,
    // acciones
    handleFile, clearFile, runPipeline, retryPipeline, loadDiff,
    handleSave, handleSync, handleDownload, loadPreview, loadHistorial,
    checkHealth, reset,
  }
}