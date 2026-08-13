import { useState, useEffect, useCallback } from 'react'
import { altaCargoApi } from '../../api/altaCargoApi'

const fmt  = n  => (n ?? 0).toLocaleString('es-AR')
const pct  = (n, t) => t ? Math.round((n / t) * 100) : 0
const fmtFecha = iso => iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const fmtDate  = iso => iso ? String(iso).slice(0, 10) : ''

// ─── Componentes base ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text-primary-700' }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{fmt(value)}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

function BarRow({ label, value, total, colorCls = 'bg-primary-500' }) {
  const p = pct(value, total)
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-40 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${colorCls}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-20 text-right shrink-0">{fmt(value)} <span className="text-gray-300">({p}%)</span></span>
    </div>
  )
}

const ESTADO_CFG = {
  Activo:    { cls: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50'  },
  Bloqueado: { cls: 'bg-red-400',    text: 'text-red-700',    bg: 'bg-red-50'    },
  Comision:  { cls: 'bg-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50'   },
}
const JEFATURA_COLORS = ['bg-violet-500', 'bg-indigo-400', 'bg-sky-400', 'bg-teal-400', 'bg-emerald-400']

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DotacionKpisPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [sigla,   setSigla]   = useState('')
  const [desde,   setDesde]   = useState('')
  const [hasta,   setHasta]   = useState('')

  const load = useCallback(async (s, d, h) => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (s) params.sigla = s
      if (d) params.desde = d
      if (h) params.hasta = h
      const r = await altaCargoApi.getDotacionKpis(params)
      setData(r)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('', '', '') }, [load])

  const applyFilters = () => load(sigla, desde, hasta)
  const clearFilters = () => { setSigla(''); setDesde(''); setHasta(''); load('', '', '') }

  const g     = data?.globales ?? {}
  const total = g.total ?? 0
  const meta  = data?.meta ?? {}

  return (
    <div className="w-full space-y-4">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Dotación — KPIs del Padrón</h1>
          <p className="text-xs text-gray-400">
            Fuente: padrón SIAL procesado por Dotaneitor
            {meta.ultimo_proceso && <> · Último proceso: <span className="font-medium text-gray-500">{fmtFecha(meta.ultimo_proceso)}</span></>}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider">Efector</label>
            <select value={sigla} onChange={e => setSigla(e.target.value)}
              className="form-input text-sm py-1 w-44">
              <option value="">Todos</option>
              {(data?.siglasDisponibles ?? []).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider">Proceso desde</label>
            <select value={desde} onChange={e => setDesde(e.target.value)}
              className="form-input text-sm py-1 w-36">
              <option value="">Cualquier fecha</option>
              {(data?.procesosDisponibles ?? []).map(p => (
                <option key={p.fecha} value={p.fecha}>{p.fecha} ({fmt(p.registros)} reg.)</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider">Hasta</label>
            <select value={hasta} onChange={e => setHasta(e.target.value)}
              className="form-input text-sm py-1 w-36">
              <option value="">Cualquier fecha</option>
              {(data?.procesosDisponibles ?? []).map(p => (
                <option key={p.fecha} value={p.fecha}>{p.fecha}</option>
              ))}
            </select>
          </div>
          <button onClick={applyFilters} disabled={loading}
            className="px-3 py-1.5 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50">
            Aplicar
          </button>
          {(sigla || desde || hasta) && (
            <button onClick={clearFilters}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
      {loading && !data && <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>}

      {data && (
        <>
          {/* KPIs globales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard label="Total registros"  value={total}            color="text-gray-800" />
            <KpiCard label="Personas únicas"  value={g.personas_unicas} color="text-primary-700"
              sub={total ? `${pct(g.personas_unicas, total)}% del total` : undefined} />
            <KpiCard label="Efectores"        value={g.efectores}      color="text-gray-600" />
            <KpiCard label="Activos"          value={g.activos}        color="text-green-700"
              sub={`${pct(g.activos, total)}%`} />
            <KpiCard label="Bloqueados"       value={g.bloqueados}     color="text-red-600"
              sub={`${pct(g.bloqueados, total)}%`} />
            <KpiCard label="Comisión"         value={g.comision}       color="text-blue-600"
              sub={`${pct(g.comision, total)}%`} />
            <KpiCard label="Jefaturas"        value={g.jefaturas}      color="text-violet-700"
              sub={`${pct(g.jefaturas, total)}%`} />
          </div>

          {/* Barra de estado global */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución por estado</p>
            <div className="flex h-4 rounded-full overflow-hidden gap-px">
              {(data.porEstado ?? []).map(r => {
                const p = pct(r.total, total)
                const cfg = ESTADO_CFG[r.estado] ?? { cls: 'bg-gray-300' }
                return p > 0
                  ? <div key={r.estado} className={`${cfg.cls} transition-all`} style={{ width: `${p}%` }}
                      title={`${r.estado}: ${fmt(r.total)} (${p}%)`} />
                  : null
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              {(data.porEstado ?? []).map(r => {
                const cfg = ESTADO_CFG[r.estado] ?? { cls: 'bg-gray-300', text: 'text-gray-600' }
                return (
                  <span key={r.estado} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.cls}`} />
                    <span className={`font-medium ${cfg.text}`}>{r.estado}</span>
                    <span className="text-gray-400">{fmt(r.total)} ({pct(r.total, total)}%)</span>
                  </span>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Por escalafón */}
            <div className="card p-4 space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por escalafón</p>
              {(data.porEscalafon ?? []).map(r => (
                <BarRow key={r.escalafon} label={r.escalafon} value={r.total} total={total} colorCls="bg-primary-500" />
              ))}
            </div>

            {/* Por universo */}
            <div className="card p-4 space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por universo totalizador</p>
              {(data.porUniverso ?? []).map(r => (
                <BarRow key={r.universo} label={r.universo} value={r.total} total={total} colorCls="bg-teal-500" />
              ))}
            </div>

            {/* Jefaturas */}
            <div className="card p-4 space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Jefaturas</p>
              {(data.porJefatura ?? []).map((r, i) => (
                <BarRow key={r.jefe_escalafon} label={r.jefe_escalafon} value={r.total}
                  total={g.jefaturas} colorCls={JEFATURA_COLORS[i % JEFATURA_COLORS.length]} />
              ))}
              {!data.porJefatura?.length && <p className="text-xs text-gray-400">Sin datos</p>}
            </div>
          </div>

          {/* Por agrupador */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Por agrupador</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {(data.porAgrupador ?? []).map(r => (
                <BarRow key={r.agrupador} label={r.agrupador} value={r.total} total={total} colorCls="bg-indigo-400" />
              ))}
            </div>
          </div>

          {/* Por situación de revista */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Por situación de revista</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {(data.porSitRevista ?? []).map(r => (
                <BarRow key={r.situacion} label={r.situacion} value={r.total} total={total} colorCls="bg-amber-400" />
              ))}
            </div>
          </div>

          {/* Por efector */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Por efector {sigla ? `— ${sigla}` : `(${data.porEfector?.length ?? 0} efectores)`}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-3 font-semibold text-gray-500 w-16">Sigla</th>
                    <th className="text-right py-2 pr-3 font-semibold text-gray-500">Total</th>
                    <th className="text-right py-2 pr-3 font-semibold text-green-600">Activos</th>
                    <th className="text-right py-2 pr-3 font-semibold text-red-500">Bloqueados</th>
                    <th className="text-right py-2 pr-3 font-semibold text-blue-500">Comisión</th>
                    <th className="text-right py-2 font-semibold text-violet-600">Jefaturas</th>
                    <th className="py-2 pl-4 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data.porEfector ?? []).map(r => (
                    <tr key={r.siglas} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-1.5 pr-3 font-mono font-semibold text-primary-700">{r.siglas}</td>
                      <td className="py-1.5 pr-3 text-right font-medium text-gray-700">{fmt(r.total)}</td>
                      <td className="py-1.5 pr-3 text-right text-green-700">{fmt(r.activos)}</td>
                      <td className="py-1.5 pr-3 text-right text-red-600">{fmt(r.bloqueados)}</td>
                      <td className="py-1.5 pr-3 text-right text-blue-600">{fmt(r.comision)}</td>
                      <td className="py-1.5 text-right text-violet-600">{fmt(r.jefaturas)}</td>
                      <td className="py-1.5 pl-4">
                        <div className="flex h-1.5 rounded-full overflow-hidden gap-px bg-gray-100 w-28">
                          <div className="bg-green-500" style={{ width: `${pct(r.activos,    r.total)}%` }} />
                          <div className="bg-red-400"   style={{ width: `${pct(r.bloqueados, r.total)}%` }} />
                          <div className="bg-blue-400"  style={{ width: `${pct(r.comision,   r.total)}%` }} />
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
