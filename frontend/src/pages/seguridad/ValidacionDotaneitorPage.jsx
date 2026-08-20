import { useState, useCallback, useEffect } from 'react'
import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { apiGet, apiPost } from '../../api/client'
import PageHeader from '../../components/shared/PageHeader'
import Spinner from '../../components/ui/Spinner'

const BASE = '/api/herramientas/dotaneitor'
const PENDIENTE_KEY = 'dotaneitor_pendiente_validacion'

const CAMPO_LABEL = {
  ayn: 'Nombre', siglas: 'Sigla', escalafon: 'Escalafón',
  codigo_de_registro: 'Cód. Registro', literal_puesto: 'Puesto',
  especialidad: 'Especialidad', unificador_de_puestos: 'Unificador',
  agrupador: 'Agrupador', estado: 'Estado', situacion_de_revista: 'Sit. Revista',
  universo_totalizador: 'Universo',
}

const TABS = [
  { key: 'modificados', label: 'Modificados', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'nuevos',      label: 'Nuevos',      color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'eliminados',  label: 'Eliminados',  color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200' },
]

// ── Panel de diff con aprobación ──────────────────────────────────────────────
function DiffPanel({ pendiente, onApproved }) {
  const { sessionId, fechaAsignada, filename } = pendiente
  const [diff, setDiff] = useState(null)
  const [diffLoading, setDiffLoading] = useState(true)
  const [diffErr, setDiffErr] = useState(null)
  const [tab, setTab] = useState('modificados')
  const [search, setSearch] = useState('')
  const [excluded, setExcluded] = useState(new Set())
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState(null)
  const [savedOk, setSavedOk] = useState(false)

  useEffect(() => {
    setDiffLoading(true)
    setDiffErr(null)
    const body = { session_id: sessionId }
    if (fechaAsignada) body.fecha_asignada = fechaAsignada
    apiPost(`${BASE}/diff`, body)
      .then(setDiff)
      .catch(e => setDiffErr(e.message))
      .finally(() => setDiffLoading(false))
  }, [sessionId, fechaAsignada])

  if (diffLoading) return (
    <div className="flex items-center gap-2 py-10 text-sm text-gray-400">
      <Spinner size="sm" /> Calculando diferencias...
    </div>
  )
  if (diffErr) return (
    <div className="flex items-center gap-2 py-10 text-sm text-red-500">
      <XCircleIcon className="w-5 h-5" /> {diffErr}
    </div>
  )
  const counts = {
    modificados: diff.total_modificados,
    nuevos: diff.total_nuevos,
    eliminados: diff.total_eliminados,
  }

  const filas = diff[tab] ?? []
  const filtradas = filas.filter(f => {
    const txt = search.toLowerCase()
    return !txt ||
      (f.ayn ?? '').toLowerCase().includes(txt) ||
      (f.id_sial ?? '').toLowerCase().includes(txt) ||
      (f.siglas ?? '').toLowerCase().includes(txt)
  })

  const toggleExclude = (id) => setExcluded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    const ids = filtradas.map(f => f.id_sial)
    const allIncluded = ids.every(id => !excluded.has(id))
    setExcluded(prev => {
      const next = new Set(prev)
      ids.forEach(id => allIncluded ? next.add(id) : next.delete(id))
      return next
    })
  }

  async function handleApprove() {
    setSaving(true); setSaveErr(null)
    try {
      const body = { session_id: sessionId, excluidos: [...excluded] }
      if (fechaAsignada) body.fecha_asignada = fechaAsignada
      await apiPost(`${BASE}/guardar-bd`, body)
      localStorage.removeItem(PENDIENTE_KEY)
      setSavedOk(true)
      onApproved?.()
    } catch (e) {
      setSaveErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const hayDatos = counts.modificados + counts.nuevos + counts.eliminados > 0

  if (savedOk) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-green-600">
        <CheckCircleIcon className="w-10 h-10" />
        <p className="text-sm font-semibold">Cambios aprobados y guardados en BD</p>
        <p className="text-xs text-gray-400">Ya podés subir un nuevo archivo en el Dotaneitor.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Info del proceso */}
      <div className="flex items-center gap-3 px-1">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">{filename ?? 'Archivo procesado'}</p>
          {fechaAsignada && (
            <p className="text-xs text-amber-600 mt-0.5">Proceso histórico · {fechaAsignada}</p>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="flex gap-6 px-5 py-3 bg-gray-50 rounded-xl border border-gray-100">
        {[
          { label: 'modificados', val: counts.modificados, tone: 'text-blue-600' },
          { label: 'nuevos', val: counts.nuevos, tone: 'text-green-600' },
          { label: 'eliminados', val: counts.eliminados, tone: 'text-red-500' },
          { label: 'campos cambiados', val: diff.total_campos_modificados, tone: 'text-gray-700' },
        ].map((s, i) => (
          <div key={i} className="text-center">
            <p className={`text-2xl font-bold tabular-nums ${s.tone}`}>{s.val.toLocaleString('es-AR')}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + búsqueda */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {TABS.map(t => (
            <button key={t.key}
              onClick={() => { setTab(t.key); setSearch('') }}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors
                ${tab === t.key ? `${t.bg} ${t.color} ${t.border}` : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
              {t.label} <span className="ml-1 opacity-60">({counts[t.key].toLocaleString('es-AR')})</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, ID SIAL o sigla..."
          className="flex-1 min-w-[180px] px-3 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400" />
        <span className="text-xs text-gray-400">{filtradas.length.toLocaleString('es-AR')} filas</span>
      </div>

      {/* Tabla */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[50vh]">
          {!hayDatos ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <CheckCircleIcon className="w-8 h-8 mb-1 text-green-400" />
              <p className="text-sm">Sin cambios respecto a la BD actual</p>
            </div>
          ) : filtradas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Sin resultados para el filtro.</p>
          ) : tab === 'modificados' ? (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox"
                      checked={filtradas.length > 0 && filtradas.every(f => !excluded.has(f.id_sial))}
                      onChange={toggleAll} className="cursor-pointer" />
                  </th>
                  {['ID SIAL', 'Nombre', 'Sigla', 'Campo', 'Antes', 'Después'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtradas.flatMap(f => {
                  const isExcluded = excluded.has(f.id_sial)
                  return f.cambios.map((c, j) => (
                    <tr key={`${f.id_sial}-${c.campo}`}
                      className={`${j === 0 ? 'border-t-2 border-gray-100' : ''} ${isExcluded ? 'opacity-40 line-through' : ''}`}>
                      {j === 0 && (
                        <>
                          <td className="px-3 py-1.5 align-top" rowSpan={f.cambios.length}>
                            <input type="checkbox" checked={!isExcluded}
                              onChange={() => toggleExclude(f.id_sial)} className="cursor-pointer" />
                          </td>
                          <td className="px-3 py-1.5 text-gray-400 font-mono align-top" rowSpan={f.cambios.length}>{f.id_sial}</td>
                          <td className="px-3 py-1.5 text-gray-700 font-medium align-top max-w-[140px] truncate" rowSpan={f.cambios.length}>{f.ayn}</td>
                          <td className="px-3 py-1.5 text-gray-500 align-top" rowSpan={f.cambios.length}>{f.siglas}</td>
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

        {/* Footer aprobación */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-400">
            {excluded.size > 0
              ? <span className="text-amber-600 font-medium">{excluded.size} fila(s) excluidas</span>
              : 'Todas las filas incluidas'}
          </div>
          <div className="flex items-center gap-3">
            {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
            <button onClick={handleApprove} disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50 font-medium">
              {saving ? <Spinner size="sm" /> : <CheckCircleIcon className="w-4 h-4" />}
              {saving ? 'Guardando...' : excluded.size > 0 ? `Aprobar (excluyendo ${excluded.size})` : 'Aprobar y guardar en BD'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Historial de procesos anteriores (colapsable) ─────────────────────────────
function HistorialSection() {
  const [open, setOpen] = useState(false)
  const [procesos, setProcesos] = useState([])
  const [loading, setLoading] = useState(false)

  async function load() {
    if (procesos.length) return
    setLoading(true)
    try {
      setProcesos(await apiGet(`${BASE}/historial`, { limit: 20 }))
    } finally {
      setLoading(false)
    }
  }

  function fmt(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => { setOpen(o => !o); if (!open) load() }}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 text-left"
      >
        <span className="text-sm font-medium text-gray-600">Historial de procesos anteriores</span>
        <div className="flex items-center gap-2">
          {loading && <Spinner size="sm" />}
          {open ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {procesos.length === 0 && !loading && (
            <p className="text-xs text-gray-400 text-center py-6">Sin procesos anteriores.</p>
          )}
          {procesos.map(p => (
            <div key={p.proceso_id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">{fmt(p.fecha)}</p>
                <div className="flex gap-3 mt-0.5">
                  {p.es_carga_inicial
                    ? <span className="text-[10px] text-gray-500">Carga inicial — {p.insertados} registros</span>
                    : <>
                        {p.insertados > 0 && <span className="text-[10px] text-green-600">+{p.insertados} nuevos</span>}
                        {p.registros_actualizados > 0 && <span className="text-[10px] text-blue-600">~{p.registros_actualizados} actualizados</span>}
                        {p.eliminados > 0 && <span className="text-[10px] text-red-500">-{p.eliminados} eliminados</span>}
                        {!p.insertados && !p.registros_actualizados && !p.eliminados && <span className="text-[10px] text-gray-400">Sin cambios</span>}
                      </>
                  }
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 border border-green-200 text-green-600 flex items-center gap-1">
                <CheckCircleIcon className="w-3 h-3" /> Aprobado
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ValidacionDotaneitorPage() {
  const [pendiente, setPendiente] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PENDIENTE_KEY) || 'null') } catch { return null }
  })

  const handleApproved = useCallback(() => {
    setPendiente(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        icon={ShieldCheckIcon}
        title="Validación Dotaneitor"
        subtitle="Revisá y aprobá los cambios antes de que se guarden en la base de datos"
      />

      {pendiente ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-900">Proceso pendiente de aprobación</h2>
          </div>
          <DiffPanel pendiente={pendiente} onApproved={handleApproved} />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <CheckCircleIcon className="w-10 h-10 text-green-400" />
          <p className="text-sm font-medium text-gray-600">No hay procesos pendientes de validación</p>
          <p className="text-xs">Cuando el Dotaneitor termine de procesar un archivo, aparecerá aquí para aprobar.</p>
        </div>
      )}

      <HistorialSection />
    </div>
  )
}
