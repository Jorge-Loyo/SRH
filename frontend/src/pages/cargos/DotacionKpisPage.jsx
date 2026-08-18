import { useState, useEffect, useCallback } from 'react'
import { altaCargoApi } from '../../api/altaCargoApi'

const fmt     = n  => (n ?? 0).toLocaleString('es-AR')
const pct     = (n, t) => t ? Math.round((n / t) * 100) : 0
const fmtFecha = iso => iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const fmtDate  = iso => iso ? String(iso).slice(0, 10) : ''
const delta    = (a, b) => b - a  // positivo = creció

// ─── Componentes base ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text-primary-700', diff }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{fmt(value)}</span>
      {diff != null && diff !== 0 && (
        <span className={`text-xs font-medium ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {diff > 0 ? '▲' : '▼'} {fmt(Math.abs(diff))}
        </span>
      )}
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
  Activo:    { cls: 'bg-green-500', text: 'text-green-700' },
  Bloqueado: { cls: 'bg-red-400',   text: 'text-red-700'   },
  Comision:  { cls: 'bg-blue-400',  text: 'text-blue-700'  },
}
const JEFATURA_COLORS = ['bg-violet-500', 'bg-indigo-400', 'bg-sky-400', 'bg-teal-400', 'bg-emerald-400']

// ─── Filtros compartidos ───────────────────────────────────────────────────────

function FiltroEfector({ value, onChange, opciones }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] text-gray-400 uppercase tracking-wider">Efector</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="form-input text-sm py-1 w-44">
        <option value="">Todos</option>
        {opciones.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  )
}

// ─── Tab Snapshot ──────────────────────────────────────────────────────────────

function TabSnapshot({ siglasDisponibles }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [sigla,   setSigla]   = useState('')
  const [proceso, setProceso] = useState('')

  const load = useCallback(async (s, p) => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (s) params.sigla = s
      if (p) { params.desde = p; params.hasta = p }
      setData(await altaCargoApi.getDotacionKpis(params))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('', '') }, [load])

  const g     = data?.globales ?? {}
  const total = g.total ?? 0
  const meta  = data?.meta ?? {}

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2">
        <FiltroEfector value={sigla} onChange={setSigla} opciones={siglasDisponibles} />
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Proceso</label>
          <select value={proceso} onChange={e => setProceso(e.target.value)} className="form-input text-sm py-1 w-44">
            <option value="">Último disponible</option>
            {(data?.procesosDisponibles ?? []).map(p => (
              <option key={p.fecha} value={p.fecha}>{p.fecha} ({fmt(p.registros)} reg.)</option>
            ))}
          </select>
        </div>
        <button onClick={() => load(sigla, proceso)} disabled={loading}
          className="px-3 py-1.5 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50">
          Aplicar
        </button>
        {(sigla || proceso) && (
          <button onClick={() => { setSigla(''); setProceso(''); load('', '') }}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            Limpiar
          </button>
        )}
        {meta.ultimo_proceso && (
          <span className="text-xs text-gray-400 ml-2">
            Proceso: <span className="font-medium text-gray-500">{fmtFecha(meta.ultimo_proceso)}</span>
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && !data && <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard label="Total registros"  value={total}             color="text-gray-800" />
            <KpiCard label="Personas únicas"  value={g.personas_unicas} color="text-primary-700" sub={`${pct(g.personas_unicas, total)}%`} />
            <KpiCard label="Efectores"        value={g.efectores}       color="text-gray-600" />
            <KpiCard label="Activos"          value={g.activos}         color="text-green-700"  sub={`${pct(g.activos, total)}%`} />
            <KpiCard label="Bloqueados"       value={g.bloqueados}      color="text-red-600"    sub={`${pct(g.bloqueados, total)}%`} />
            <KpiCard label="Comisión"         value={g.comision}        color="text-blue-600"   sub={`${pct(g.comision, total)}%`} />
            <KpiCard label="Jefaturas"        value={g.jefaturas}       color="text-violet-700" sub={`${pct(g.jefaturas, total)}%`} />
          </div>

          {/* Barra de estado */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución por estado</p>
            <div className="flex h-4 rounded-full overflow-hidden gap-px">
              {(data.porEstado ?? []).map(r => {
                const p = pct(r.total, total)
                const cfg = ESTADO_CFG[r.estado] ?? { cls: 'bg-gray-300' }
                return p > 0 ? <div key={r.estado} className={`${cfg.cls}`} style={{ width: `${p}%` }} title={`${r.estado}: ${fmt(r.total)} (${p}%)`} /> : null
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
            <div className="card p-4 space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por escalafón</p>
              {(data.porEscalafon ?? []).map(r => <BarRow key={r.escalafon} label={r.escalafon} value={r.total} total={total} colorCls="bg-primary-500" />)}
            </div>
            <div className="card p-4 space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por universo totalizador</p>
              {(data.porUniverso ?? []).map(r => <BarRow key={r.universo} label={r.universo} value={r.total} total={total} colorCls="bg-teal-500" />)}
            </div>
            <div className="card p-4 space-y-2.5">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Jefaturas</p>
              {(data.porJefatura ?? []).map((r, i) => <BarRow key={r.jefe_escalafon} label={r.jefe_escalafon} value={r.total} total={g.jefaturas} colorCls={JEFATURA_COLORS[i % JEFATURA_COLORS.length]} />)}
              {!data.porJefatura?.length && <p className="text-xs text-gray-400">Sin datos</p>}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Por agrupador</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {(data.porAgrupador ?? []).map(r => <BarRow key={r.agrupador} label={r.agrupador} value={r.total} total={total} colorCls="bg-indigo-400" />)}
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Por situación de revista</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {(data.porSitRevista ?? []).map(r => <BarRow key={r.situacion} label={r.situacion} value={r.total} total={total} colorCls="bg-amber-400" />)}
            </div>
          </div>

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

// ─── Tab Evolución ─────────────────────────────────────────────────────────────

const EVO_METRICS = [
  { key: 'total',          label: 'Total',          color: 'text-gray-700',    bar: 'bg-gray-400'    },
  { key: 'personas_unicas',label: 'Personas únicas', color: 'text-primary-700', bar: 'bg-primary-500' },
  { key: 'activos',        label: 'Activos',         color: 'text-green-700',   bar: 'bg-green-500'   },
  { key: 'bloqueados',     label: 'Bloqueados',      color: 'text-red-600',     bar: 'bg-red-400'     },
  { key: 'comision',       label: 'Comisión',        color: 'text-blue-600',    bar: 'bg-blue-400'    },
  { key: 'jefaturas',      label: 'Jefaturas',       color: 'text-violet-700',  bar: 'bg-violet-500'  },
]

function MiniSparkline({ rows, metricKey, barCls }) {
  if (!rows.length) return null
  const vals = rows.map(r => r[metricKey])
  const max  = Math.max(...vals, 1)
  return (
    <div className="flex items-end gap-px h-8">
      {vals.map((v, i) => (
        <div key={i} className={`flex-1 rounded-sm ${barCls} opacity-80`}
          style={{ height: `${Math.max(4, Math.round((v / max) * 32))}px` }}
          title={`${rows[i].fecha}: ${fmt(v)}`} />
      ))}
    </div>
  )
}

function TabEvolucion({ siglasDisponibles }) {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [sigla,   setSigla]   = useState('')
  const [desde,   setDesde]   = useState('')
  const [hasta,   setHasta]   = useState('')
  const [metric,  setMetric]  = useState('total')

  const load = useCallback(async (s, d, h) => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (s) params.sigla = s
      if (d) params.desde = d
      if (h) params.hasta = h
      setRows(await altaCargoApi.getDotacionEvolucion(params))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load('', '', '') }, [load])

  const first = rows[0]
  const last  = rows[rows.length - 1]
  const maxVal = rows.length ? Math.max(...rows.map(r => r[metric]), 1) : 1

  const metaCfg = EVO_METRICS.find(m => m.key === metric) ?? EVO_METRICS[0]

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2">
        <FiltroEfector value={sigla} onChange={setSigla} opciones={siglasDisponibles} />
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            className="form-input text-sm py-1 w-36" />
        </div>
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            className="form-input text-sm py-1 w-36" />
        </div>
        <button onClick={() => load(sigla, desde, hasta)} disabled={loading}
          className="px-3 py-1.5 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50">
          Aplicar
        </button>
        {(sigla || desde || hasta) && (
          <button onClick={() => { setSigla(''); setDesde(''); setHasta(''); load('', '', '') }}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
            Limpiar
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>}

      {!loading && rows.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">Sin datos para el rango seleccionado</div>
      )}

      {!loading && rows.length > 0 && (
        <>
          {/* Selector de métrica + resumen */}
          <div className="flex flex-wrap gap-2">
            {EVO_METRICS.map(m => (
              <button key={m.key} onClick={() => setMetric(m.key)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${metric === m.key ? 'bg-primary-700 text-white border-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Cards resumen: primer vs último proceso */}
          {first && last && first.fecha !== last.fecha && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {EVO_METRICS.map(m => {
                const d = delta(first[m.key], last[m.key])
                return (
                  <KpiCard key={m.key} label={m.label}
                    value={last[m.key]}
                    color={m.color}
                    diff={d}
                    sub={`inicio: ${fmt(first[m.key])}`} />
                )
              })}
            </div>
          )}

          {/* Gráfico de barras horizontal por fecha */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {metaCfg.label} por proceso ({rows.length} fechas)
              </p>
              <MiniSparkline rows={rows} metricKey={metric} barCls={metaCfg.bar} />
            </div>
            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
              {rows.map((r, i) => {
                const prev = i > 0 ? rows[i - 1] : null
                const d    = prev ? delta(prev[metric], r[metric]) : null
                const p    = Math.round((r[metric] / maxVal) * 100)
                return (
                  <div key={r.fecha} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500 w-24 shrink-0">{r.fecha}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className={`h-3 rounded-full ${metaCfg.bar}`} style={{ width: `${p}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-16 text-right shrink-0">{fmt(r[metric])}</span>
                    {d != null && d !== 0 && (
                      <span className={`text-xs w-14 text-right shrink-0 ${d > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {d > 0 ? '▲' : '▼'}{fmt(Math.abs(d))}
                      </span>
                    )}
                    {(d == null || d === 0) && <span className="w-14 shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tabla comparativa completa */}
          <div className="card p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Tabla comparativa</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 font-semibold text-gray-500">Fecha</th>
                    {EVO_METRICS.map(m => (
                      <th key={m.key} className={`text-right py-2 px-2 font-semibold ${m.color}`}>{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const prev = i > 0 ? rows[i - 1] : null
                    return (
                      <tr key={r.fecha} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-1.5 pr-4 font-mono text-gray-600">{r.fecha}</td>
                        {EVO_METRICS.map(m => {
                          const d = prev ? delta(prev[m.key], r[m.key]) : null
                          return (
                            <td key={m.key} className="py-1.5 px-2 text-right">
                              <span className="font-medium text-gray-700">{fmt(r[m.key])}</span>
                              {d != null && d !== 0 && (
                                <span className={`ml-1 text-[10px] ${d > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {d > 0 ? '▲' : '▼'}{fmt(Math.abs(d))}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function DotacionKpisPage() {
  const [tab,    setTab]    = useState('snapshot')
  const [siglas, setSiglas] = useState([])

  useEffect(() => {
    altaCargoApi.getDotacionKpis({}).then(d => setSiglas(d?.siglasDisponibles ?? [])).catch(() => {})
  }, [])

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-gray-800">Dotación — KPIs del Padrón</h1>
          <p className="text-xs text-gray-400">Fuente: padrón SIAL procesado por Dotaneitor · <span className="font-mono">dot_resultado</span> / <span className="font-mono">dot_resultado_historico</span></p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['snapshot', 'Indicadores'], ['evolucion', 'Evolución']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 text-sm rounded-md transition-colors ${tab === key ? 'bg-white shadow-sm font-medium text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'snapshot'  && <TabSnapshot  siglasDisponibles={siglas} />}
      {tab === 'evolucion' && <TabEvolucion siglasDisponibles={siglas} />}
    </div>
  )
}
