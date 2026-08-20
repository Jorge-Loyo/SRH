// ─── Adaptador REAL del Dotaneitor ─────────────────────────────────────────
// Misma interfaz que api/mockDotaneitorApi.js. Conecta al backend Node (proxy)
// y este al microservicio Python. Para usarlo: DOTANEITOR_MOCK=0 npm run dev
// (en dotaneitor-test) o importar este adaptador desde la app real.

import { apiFetch, apiGet, apiPost } from '../../../api/client'

const BASE = '/api/herramientas/dotaneitor'

async function download(path) {
  const res = await apiFetch(path)
  if (!res.ok) throw new Error(`Error ${res.status}`)
  const blob = await res.blob()
  const cd = res.headers.get('content-disposition') ?? ''
  const match = cd.match(/filename[^;=\n]*=["']?([^"'\n;]+)/)
  const filename = match?.[1] ?? 'descarga.xlsx'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const API = {
  async health() {
    const py = await fetch('https://srh-python.onrender.com/health').catch(() => null)
    if (py?.ok) return true
    try {
      await apiGet(`${BASE}/health`)
      return true
    } catch {
      return false
    }
  },

  async ultimaActualizacion() {
    const r = await apiGet(`${BASE}/ultima-actualizacion`)
    return r.ultima
  },

  async createSession() {
    const r = await apiPost(`${BASE}/session`)
    return { session_id: r.session_id }
  },

  async uploadCargos(session_id, file) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('session_id', session_id)
    const res = await apiFetch(`${BASE}/upload-cargos`, { method: 'POST', body: fd })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      throw new Error(e.detail ?? `Error ${res.status}`)
    }
    return res.json()
  },

  async runStep(session_id, step) {
    const { job_id } = await apiPost(`${BASE}/${step}`, { session_id })
    return { job_id }
  },

  async pollJob(job_id) {
    return apiGet(`${BASE}/job/${job_id}`)
  },

  async preview(session_id, page = 1, limit = 50) {
    return apiGet(`${BASE}/preview`, { session_id, page, limit })
  },

  async diff(session_id, fechaAsignada) {
    const body = { session_id }
    if (fechaAsignada) body.fecha_asignada = fechaAsignada
    return apiPost(`${BASE}/diff`, body)
  },

  async guardar(session_id, excluidos, fechaAsignada) {
    const body = { session_id, excluidos }
    if (fechaAsignada) body.fecha_asignada = fechaAsignada
    return apiPost(`${BASE}/guardar-bd`, body)
  },

  async descargar(session_id, tipo) {
    await download(`${BASE}/${tipo}?session_id=${session_id}`)
  },

  async sincronizar() {
    return apiPost('/api/dotacion/cargos/sincronizar')
  },

  async historial() {
    return apiGet(`${BASE}/historial`, { limit: 10 })
  },

  async deleteSession(session_id) {
    await apiPost(`${BASE}/session/delete`, { session_id })
  },
}

export default API