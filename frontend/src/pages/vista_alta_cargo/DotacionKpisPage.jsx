import { useState, useEffect, useCallback } from 'react'
import { altaCargoApi } from '../../api/altaCargoApi'

const fmt = n => (n ?? 0).toLocaleString('es-AR')
const pct = (n, total) => total ? Math.round((n / total) * 100) : 0

const SITUACION_CFG = [
  { key: 'ocupados',  label: 'Ocupado',   cls: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'  },
  { key: 'retencion', label: 'Retención', cls: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50' },
  { key: 'comision',  label: 'Comisión',  cls: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
  { key: 'vacantes',  label: 'Vacante',   cls: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50'  },
]

const MODALIDAD_LABELS = { planta: 'POF', guardia: 'POU', sin_modalidad: 'Sin modalidad' }

function KpiCard({ label, value, sub, color = 'text-primary-700' }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{fmt(value)}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

function BarRow({ label, value, total, colorCls, pctOverride }) {
  const p = pctOverride ?? pct(value, total)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-32 shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${colorCls}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-16 text-right shrink-0">{fmt(value)} <span className="text-gray-300">({p}%)</span></span>
    </div>
  )
}

export default function DotacionKpisPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [sigla,   setSigla]   = useState('')
  const [siglas,  setSiglas]  = useState([])

  const load = useCallback(async (s) => {
    setLoading(true); setError(null)
    try {
      const params = s ? { sigla: s } : {}
      const r = await altaCargoApi.getDotacionKpis(params)
      setData(r)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    altaCargoApi.listSiglas().then(d => setSiglas(d.map(s => s.sigla))).catch(() => {})
    load('')
  }, [load])

  const g = data?.globales ?? {}
  const total = g.total_vigentes ?? 0

  return (
    <div className="w-full space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Dotación — KPIs</h1>
          <p className="text-xs text-gray-400">Vinculación organigrama · cargos · dotación</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Efector:</span>
          <select value={sigla} onChange={e => { setSigla(e.target.value); load(e.target.value) }}
            className="form-input text-sm py-1 w-48">
            <option value="">Todos los efectores</option>
            {siglas.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

      {loading && !data && (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
      )}

      {data && (
        <>
          {/* KPIs globales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard label="Total vigentes"   value={total}              color="text-gray-800" />
            <KpiCard label="Ocupados"         value={g.ocupados}         color="text-green-700"
              sub={`${pct(g.ocupados, total)}% del total`} />
            <KpiCard label="Retención"        value={g.retencion}        color="text-orange-600"
              sub={`${pct(g.retencion, total)}%`} />
            <KpiCard label="Comisión"         value={g.comision}         color="text-blue-600"
              sub={`${pct(g.comision, total)}%`} />
            <KpiCard label="Vacantes"         value={g.vacantes}         color="text-amber-600"
              sub={`${pct(g.vacantes, total)}%`} />
            <KpiCard label="Personas únicas"  value={g.personas_unicas}  color="text-primary-700" />
            <KpiCard label="Efectores"        value={g.efectores}        color="text-gray-600" />
          </div>

          {/* Barra de situación global */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución global</p>
            <div className="flex h-4 rounded-full overflow-hidden gap-px">
              {SITUACION_CFG.map(({ key, cls }) => {
                const p = pct(g[key] ?? 0, total)
                return p > 0
                  ? <div key={key} className={`${cls} transition-all`} style={{ width: `${p}%` }} title={`${key}: ${fmt(g[key])} (${p}%)`} />
                  : null
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {SITUACION_CFG.map(({ key, label, cls, text }) => (
                <span key={key} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />
                  <span className={`font-medium ${text}`}>{label}</span>
                  <span className="text-gray-400">{fmt(g[key] ?? 0)} ({pct(g[key] ?? 0, total)}%)</span>
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Por carrera */}
            <div className="card p-4 space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por carrera</p>
              {data.porCarrera.map(r => (
                <div key={r.carrera} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">{r.carrera}</span>
                    <span className="text-xs text-gray-400">{fmt(r.total)}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden gap-px bg-gray-100">
                    <div className="bg-green-500"  style={{ width: `${pct(r.ocupados,  r.total)}%` }} />
                    <div className="bg-orange-400" style={{ width: `${pct(r.retencion, r.total)}%` }} />
                    <div className="bg-blue-400"   style={{ width: `${pct(r.comision,  r.total)}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Por modalidad */}
            <div className="card p-4 space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por modalidad</p>
              {data.porModalidad.map(r => (
                <BarRow key={r.modalidad}
                  label={MODALIDAD_LABELS[r.modalidad] ?? r.modalidad}
                  value={r.total} total={total}
                  colorCls="bg-primary-500" />
              ))}
            </div>

            {/* Situación detalle */}
            <div className="card p-4 space-y-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Situación</p>
              {SITUACION_CFG.map(({ key, label, cls, bg, text }) => (
                <div key={key} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cls}`} />
                    <span className={`text-xs font-medium ${text}`}>{label}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${text}`}>{fmt(data.porSituacion?.[key] ?? 0)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">({pct(data.porSituacion?.[key] ?? 0, total)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top efectores */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Por efector {sigla ? `— ${sigla}` : `(top ${Math.min(data.porEfector.length, 20)})`}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-3 font-semibold text-gray-500 w-16">Sigla</th>
                    <th className="text-left py-2 pr-3 font-semibold text-gray-500">Repartición</th>
                    <th className="text-right py-2 pr-3 font-semibold text-gray-500">Total</th>
                    <th className="text-right py-2 pr-3 font-semibold text-green-600">Ocupados</th>
                    <th className="text-right py-2 pr-3 font-semibold text-orange-500">Retención</th>
                    <th className="text-right py-2 font-semibold text-blue-500">Comisión</th>
                    <th className="py-2 pl-4 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.porEfector.slice(0, 20).map(r => (
                    <tr key={r.sigla} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-1.5 pr-3 font-mono font-semibold text-primary-700">{r.sigla}</td>
                      <td className="py-1.5 pr-3 text-gray-600 max-w-[260px] truncate">{r.desc_rep ?? '—'}</td>
                      <td className="py-1.5 pr-3 text-right font-medium text-gray-700">{fmt(r.total)}</td>
                      <td className="py-1.5 pr-3 text-right text-green-700">{fmt(r.ocupados)}</td>
                      <td className="py-1.5 pr-3 text-right text-orange-600">{fmt(r.retencion)}</td>
                      <td className="py-1.5 text-right text-blue-600">{fmt(r.comision)}</td>
                      <td className="py-1.5 pl-4">
                        <div className="flex h-1.5 rounded-full overflow-hidden gap-px bg-gray-100 w-28">
                          <div className="bg-green-500"  style={{ width: `${pct(r.ocupados,  r.total)}%` }} />
                          <div className="bg-orange-400" style={{ width: `${pct(r.retencion, r.total)}%` }} />
                          <div className="bg-blue-400"   style={{ width: `${pct(r.comision,  r.total)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
