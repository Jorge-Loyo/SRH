import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiGet } from '../../api/client';
import Spinner from '../../components/ui/Spinner';

const fmt = n => (n ?? 0).toLocaleString('es-AR');
const pct = (n, t) => t ? Math.round((n / t) * 100) : 0;

function KpiCard({ label, value, sub, color = 'text-primary-700' }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{fmt(value)}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function BarRow({ label, value, total, colorCls = 'bg-primary-500', onClick }) {
  const p = pct(value, total);
  return (
    <div className={`flex items-center gap-3 ${onClick ? 'cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1' : ''}`} onClick={onClick}>
      <span className="text-xs text-gray-600 w-40 shrink-0 truncate" title={label}>{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${colorCls}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-20 text-right shrink-0">{fmt(value)} <span className="text-gray-300">({p}%)</span></span>
    </div>
  );
}

function JefaturasModal({ jefe, sigla, onClose }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = { jefe_escalafon: jefe };
    if (sigla) params.sigla = sigla;
    apiGet('/api/dotacion/kpis/jefaturas-detalle', params)
      .then(d => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, [jefe, sigla]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <div>
            <p className="font-semibold text-gray-800">{jefe}</p>
            <p className="text-xs text-gray-400">{rows.length} registros{sigla ? ` — ${sigla}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
              <Spinner size="lg" /><span className="text-sm">Cargando...</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Nombre</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500">CUIL</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Sigla</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Escalafón</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Puesto</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-1.5 font-medium text-gray-800">{r.nombre_apellido}</td>
                    <td className="px-4 py-1.5 font-mono text-gray-500">{r.cuil}</td>
                    <td className="px-4 py-1.5 font-semibold text-primary-700">{r.sigla}</td>
                    <td className="px-4 py-1.5 text-gray-600">{r.escalafon}</td>
                    <td className="px-4 py-1.5 text-gray-600">{r.literal_puesto}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin registros</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const JEFATURA_COLORS = ['bg-violet-500', 'bg-indigo-400', 'bg-sky-400', 'bg-teal-400', 'bg-emerald-400'];

export default function DashboardGestionPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [sigla,   setSigla]   = useState('');
  const [jefeModal, setJefeModal] = useState(null);

  const load = useCallback(async (s) => {
    setLoading(true); setError(null);
    try {
      setData(await apiGet('/api/dotacion/kpis', s ? { sigla: s } : {}));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const g     = data?.globales ?? {};
  const total = g.total ?? 0;
  const siglas = (data?.porEfector ?? []).map(r => r.sigla).filter(Boolean);

  return (
    <div className="flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-200 bg-white flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Dashboard</h1>
          {data?.periodo && <span className="text-xs text-gray-400">Período: {data.periodo}</span>}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Efector:</label>
          <select value={sigla} onChange={e => { setSigla(e.target.value); load(e.target.value); }}
            className="form-input text-sm py-1 w-44">
            <option value="">Todos</option>
            {siglas.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {sigla && (
            <button onClick={() => { setSigla(''); load(''); }}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <XMarkIcon className="w-3.5 h-3.5" />Quitar
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {error && <p className="text-sm text-red-500">{error}</p>}
        {loading && !data && (
          <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
            <Spinner size="lg" /><span className="text-sm">Cargando...</span>
          </div>
        )}

        {data && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
              <KpiCard label="Total"           value={total}             color="text-gray-800" />
              <KpiCard label="Personas únicas" value={g.personas_unicas} color="text-primary-700" sub={`${pct(g.personas_unicas, total)}%`} />
              <KpiCard label="Efectores"       value={g.efectores}       color="text-gray-600" />
              <KpiCard label="Activos"         value={g.activos}         color="text-green-700"  sub={`${pct(g.activos, total)}%`} />
              <KpiCard label="Retención"       value={g.retencion}       color="text-orange-600" sub={`${pct(g.retencion, total)}%`} />
              <KpiCard label="Comisión"        value={g.comision}        color="text-blue-600"   sub={`${pct(g.comision, total)}%`} />
              <KpiCard label="Jefaturas"       value={g.jefaturas}       color="text-violet-700" sub={`${pct(g.jefaturas, total)}%`} />
              <KpiCard label="Mujeres"         value={g.mujeres}         color="text-pink-600"   sub={`${pct(g.mujeres, total)}%`} />
              <KpiCard label="Varones"         value={g.varones}         color="text-sky-600"    sub={`${pct(g.varones, total)}%`} />
            </div>

            {/* Barra situación de revista */}
            <div className="card p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Situación de revista</p>
              <div className="flex h-4 rounded-full overflow-hidden gap-px">
                {(data.porSitRevista ?? []).map(r => {
                  const p = pct(r.total, total);
                  const colors = { 'Activo': 'bg-green-500', 'Retención de Cargo': 'bg-orange-400', 'Comisión': 'bg-blue-400' };
                  return p > 0 ? (
                    <div key={r.situacion} className={colors[r.situacion] ?? 'bg-gray-300'}
                      style={{ width: `${p}%` }} title={`${r.situacion}: ${fmt(r.total)} (${p}%)`} />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                {(data.porSitRevista ?? []).map(r => {
                  const colors = { 'Activo': 'bg-green-500 text-green-700', 'Retención de Cargo': 'bg-orange-400 text-orange-700', 'Comisión': 'bg-blue-400 text-blue-700' };
                  const [bg, text] = (colors[r.situacion] ?? 'bg-gray-300 text-gray-600').split(' ');
                  return (
                    <span key={r.situacion} className="flex items-center gap-1.5 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${bg}`} />
                      <span className={`font-medium ${text}`}>{r.situacion}</span>
                      <span className="text-gray-400">{fmt(r.total)} ({pct(r.total, total)}%)</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Grilla: escalafón + universo + jefaturas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="card p-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por escalafón</p>
                {(data.porEscalafon ?? []).map(r => <BarRow key={r.escalafon} label={r.escalafon ?? 'Sin dato'} value={r.total} total={total} colorCls="bg-primary-500" />)}
              </div>
              <div className="card p-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Por universo totalizador</p>
                {(data.porUniverso ?? []).map(r => <BarRow key={r.universo} label={r.universo} value={r.total} total={total} colorCls="bg-teal-500" />)}
              </div>
              <div className="card p-4 space-y-2.5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Jefaturas <span className="normal-case font-normal text-gray-300">(click para ver detalle)</span></p>
                {(data.porJefatura ?? []).map((r, i) => (
                  <BarRow key={r.jefe_escalafon} label={r.jefe_escalafon} value={r.total} total={g.jefaturas}
                    colorCls={JEFATURA_COLORS[i % JEFATURA_COLORS.length]}
                    onClick={() => setJefeModal(r.jefe_escalafon)} />
                ))}
                {!data.porJefatura?.length && <p className="text-xs text-gray-400">Sin datos</p>}
              </div>
            </div>

            {/* Por agrupador */}
            <div className="card p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Por agrupador</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                {(data.porAgrupador ?? []).map(r => <BarRow key={r.agrupador} label={r.agrupador} value={r.total} total={total} colorCls="bg-indigo-400" />)}
              </div>
            </div>

            {/* Tabla de efectores */}
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
                      <th className="text-right py-2 pr-3 font-semibold text-orange-500">Retención</th>
                      <th className="text-right py-2 pr-3 font-semibold text-blue-500">Comisión</th>
                      <th className="text-right py-2 font-semibold text-violet-600">Jefaturas</th>
                      <th className="py-2 pl-4 w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.porEfector ?? []).map(r => (
                      <tr key={r.sigla} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="py-1.5 pr-3 font-mono font-semibold text-primary-700">{r.sigla}</td>
                        <td className="py-1.5 pr-3 text-right font-medium text-gray-700">{fmt(r.total)}</td>
                        <td className="py-1.5 pr-3 text-right text-green-700">{fmt(r.activos)}</td>
                        <td className="py-1.5 pr-3 text-right text-orange-600">{fmt(r.retencion)}</td>
                        <td className="py-1.5 pr-3 text-right text-blue-600">{fmt(r.comision)}</td>
                        <td className="py-1.5 text-right text-violet-600">{fmt(r.jefaturas)}</td>
                        <td className="py-1.5 pl-4">
                          <div className="flex h-1.5 rounded-full overflow-hidden gap-px bg-gray-100 w-28">
                            <div className="bg-green-500"  style={{ width: `${pct(r.activos,   r.total)}%` }} />
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

      {jefeModal && (
        <JefaturasModal jefe={jefeModal} sigla={sigla} onClose={() => setJefeModal(null)} />
      )}
    </div>
  );
}
