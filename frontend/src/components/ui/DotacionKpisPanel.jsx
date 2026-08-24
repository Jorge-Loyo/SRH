import { useState, useEffect } from 'react';
import { ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiGet } from '../../api/client';
import Spinner from './Spinner';

const SIT_COLORS = {
  'Activo':             'bg-green-500',
  'Retención de Cargo': 'bg-orange-400',
  'Comisión':           'bg-blue-400',
};
const ESC_COLORS = [
  'bg-primary-500','bg-primary-400','bg-primary-300',
  'bg-emerald-500','bg-emerald-400','bg-amber-400',
  'bg-orange-400','bg-rose-400','bg-gray-400','bg-gray-300',
];

function MiniBar({ pct, color }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(1, pct)}%` }} />
    </div>
  );
}

/**
 * Panel de KPIs de dotación (globales, por escalafón, top efectores).
 *
 * Props:
 *   defaultOpen   {boolean}  — si el panel arranca expandido (default: true)
 *   onFilterSigla {fn}       — callback cuando el usuario selecciona un efector
 *   collapsible   {boolean}  — si se puede colapsar (default: true)
 */
export default function DotacionKpisPanel({ defaultOpen = true, onFilterSigla, collapsible = true }) {
  const [data, setData]       = useState(null);
  const [open, setOpen]       = useState(defaultOpen);
  const [sigla, setSigla]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiGet('/api/dotacion/kpis', sigla ? { sigla } : {})
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sigla]);

  const g     = data?.globales ?? {};
  const total = g.total || 1;

  return (
    <div className="border-b border-gray-200 bg-white">
      {collapsible ? (
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Panel de KPIs</span>
          <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
      ) : (
        <div className="px-4 py-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Panel de KPIs</span>
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 space-y-4">
          {/* Selector efector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Efector:</span>
            <select
              value={sigla}
              onChange={e => { setSigla(e.target.value); onFilterSigla?.(e.target.value); }}
              className="form-input text-xs py-1 w-40"
            >
              <option value="">Todos</option>
              {(data?.porEfector ?? []).map(r => (
                <option key={r.sigla} value={r.sigla}>{r.sigla}</option>
              ))}
            </select>
            {sigla && (
              <button
                onClick={() => { setSigla(''); onFilterSigla?.(''); }}
                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-0.5"
              >
                <XMarkIcon className="w-3 h-3" /> Quitar
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
              <Spinner size="sm" /> Cargando...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Col 1: KPI cards + barra situación */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total',     val: g.total,     cls: 'bg-gray-50 text-gray-800' },
                    { label: 'Activos',   val: g.activos,   cls: 'bg-green-50 text-green-700' },
                    { label: 'Retención', val: g.retencion, cls: 'bg-orange-50 text-orange-700' },
                    { label: 'Comisión',  val: g.comision,  cls: 'bg-blue-50 text-blue-700' },
                    { label: 'Mujeres',   val: g.mujeres,   cls: 'bg-pink-50 text-pink-700' },
                    { label: 'Varones',   val: g.varones,   cls: 'bg-sky-50 text-sky-700' },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className={`rounded-lg px-3 py-2 ${cls}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
                      <p className="text-lg font-bold">{(val ?? 0).toLocaleString('es-AR')}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Situación de revista</p>
                  <div className="flex rounded-full overflow-hidden h-3">
                    {(data?.porSitRevista ?? []).map(r => (
                      <div
                        key={r.situacion}
                        style={{ width: `${(r.total / total) * 100}%` }}
                        className={`${SIT_COLORS[r.situacion] ?? 'bg-gray-300'} transition-all`}
                        title={`${r.situacion}: ${r.total.toLocaleString('es-AR')}`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {(data?.porSitRevista ?? []).map(r => (
                      <span key={r.situacion} className="text-[10px] text-gray-500 flex items-center gap-1">
                        <span className={`inline-block w-2 h-2 rounded-full ${SIT_COLORS[r.situacion] ?? 'bg-gray-300'}`} />
                        {r.situacion} ({((r.total / total) * 100).toFixed(1)}%)
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Col 2: Por escalafón */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Por escalafón</p>
                <div className="space-y-1.5">
                  {(data?.porEscalafon ?? []).map((r, i) => (
                    <div key={r.escalafon}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-gray-600 truncate max-w-[160px]">{r.escalafon ?? 'Sin dato'}</span>
                        <span className="text-gray-500 font-medium ml-2">{r.total.toLocaleString('es-AR')}</span>
                      </div>
                      <MiniBar pct={(r.total / total) * 100} color={ESC_COLORS[i] ?? 'bg-gray-300'} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 3: Top efectores */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Top efectores</p>
                <div className="space-y-1.5">
                  {(data?.porEfector ?? []).slice(0, 10).map(r => (
                    <div key={r.sigla}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <button
                          onClick={() => { setSigla(r.sigla); onFilterSigla?.(r.sigla); }}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {r.sigla}
                        </button>
                        <span className="text-gray-500 font-medium ml-2">{r.total.toLocaleString('es-AR')}</span>
                      </div>
                      <MiniBar pct={(r.total / total) * 100} color="bg-primary-400" />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
