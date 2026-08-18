import { useState, useEffect, useCallback, useMemo } from 'react';
import { TableCellsIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiGet, ApiError } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import PeriodoSelect from '../../components/ui/PeriodoSelect';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';

const METRICAS = [
  { key: 'dotacion_total', label: 'Dotación Total' },
  { key: 'dotacion_diaria', label: 'Dotación Diaria' },
  { key: 'dotacion_sem', label: 'Dotación Semanal' },
  { key: 'activos', label: 'Activos' },
  { key: 'tecnicos', label: 'Técnicos' },
  { key: 'vacantes', label: 'Vacantes' },
];

const MIN_HOSPITALES = 2;
const MAX_HOSPITALES = 50;

function downloadBase64(base64, filename) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function POUComparativaPage() {
  const [hospitalesDisponibles, setHospitalesDisponibles] = useState([]);
  const [siglas, setSiglas] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [periodosMetadata, setPeriodosMetadata] = useState([]);
  const [periodo, setPeriodo] = useState('');
  const [metrica, setMetrica] = useState('dotacion_total');
  const [state, setState] = useState({ loading: false, rows: [], error: null });
  const [exporting, setExporting] = useState(false);
  const [filtrosPerfil, setFiltrosPerfil] = useState([]);
  const [filtrosEspecialidad, setFiltrosEspecialidad] = useState([]);

  // Hospitales con datos POU disponibles para elegir
  useEffect(() => {
    apiGet('/api/pou/hospitales')
      .then(d => setHospitalesDisponibles(d.items || []))
      .catch(() => {});
  }, []);

  // Períodos disponibles (globales, sin filtrar por hospital todavía)
  useEffect(() => {
    apiGet('/api/pou/periodos')
      .then(d => {
        const list = d.items || [];
        setPeriodos(list);
        setPeriodosMetadata(d.periodsMetadata || []);
        if (d.recommended) setPeriodo(d.recommended);
        else if (list.length > 0) setPeriodo(list[0]);
      })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    if (siglas.length < MIN_HOSPITALES || !periodo) {
      setState({ loading: false, rows: [], error: null });
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const data = await apiGet('/api/pou/comparar', { siglas: siglas.join(','), periodo });
      setState({ loading: false, rows: data.data || [], error: null });
    } catch (e) {
      const msg = e instanceof ApiError ? `Error ${e.status}: ${e.message}` : (e.message || 'Error al cargar datos');
      setState({ loading: false, rows: [], error: msg });
    }
  }, [siglas, periodo]);

  useEffect(() => {
    setFiltrosPerfil([]);
    setFiltrosEspecialidad([]);
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    if (siglas.length < MIN_HOSPITALES || !periodo) return;
    setExporting(true);
    try {
      const data = await apiGet('/api/pou/comparar/export', { siglas: siglas.join(','), periodo });
      if (data.base64) downloadBase64(data.base64, `POU_comparativa_${periodo}.xlsx`);
    } catch { /* silencioso */ }
    finally { setExporting(false); }
  };

  // Agrupa las filas (una por hospital) en combos de perfil/especialidad
  const combos = useMemo(() => {
    const map = new Map();
    state.rows.forEach(r => {
      const key = `${r.perfil || ''}|||${r.especialidad || ''}`;
      if (!map.has(key)) map.set(key, { perfil: r.perfil, especialidad: r.especialidad, porSigla: {} });
      map.get(key).porSigla[r.sigla] = r;
    });
    return [...map.values()].sort((a, b) => {
      const cmp = (a.perfil || '').localeCompare(b.perfil || '');
      return cmp !== 0 ? cmp : (a.especialidad || '').localeCompare(b.especialidad || '');
    });
  }, [state.rows]);

  const perfilesOpts = useMemo(() => (
    [...new Set(combos.map(c => c.perfil).filter(Boolean))].sort()
  ), [combos]);

  const especialidadesOpts = useMemo(() => {
    const source = filtrosPerfil.length ? combos.filter(c => filtrosPerfil.includes(c.perfil)) : combos;
    return [...new Set(source.map(c => c.especialidad).filter(Boolean))].sort();
  }, [combos, filtrosPerfil]);

  // Si cambia el perfil seleccionado, descarta especialidades que ya no son válidas para ese perfil
  useEffect(() => {
    setFiltrosEspecialidad(prev => prev.filter(e => especialidadesOpts.includes(e)));
  }, [especialidadesOpts]);

  const combosFiltrados = useMemo(() => combos.filter(c => {
    if (filtrosPerfil.length && !filtrosPerfil.includes(c.perfil)) return false;
    if (filtrosEspecialidad.length && !filtrosEspecialidad.includes(c.especialidad)) return false;
    return true;
  }), [combos, filtrosPerfil, filtrosEspecialidad]);

  const totales = useMemo(() => {
    const t = {};
    siglas.forEach(s => { t[s] = 0; });
    combosFiltrados.forEach(c => {
      siglas.forEach(s => { t[s] += Number(c.porSigla[s]?.[metrica]) || 0; });
    });
    return t;
  }, [combosFiltrados, siglas, metrica]);

  const puedeComparar = siglas.length >= MIN_HOSPITALES;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <TableCellsIcon className="w-5 h-5 text-primary-700 shrink-0" />
            <h1 className="text-lg font-bold text-gray-900 truncate">POU – Comparativa entre Hospitales</h1>
          </div>
          <button onClick={handleExport} disabled={exporting || !puedeComparar || combosFiltrados.length === 0}
            className="btn-secondary flex items-center gap-1.5 text-sm shrink-0">
            {exporting ? <Spinner size="sm" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
            Exportar Excel
          </button>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="w-64">
            <MultiSelectDropdown
              label={`Hospitales (mín. ${MIN_HOSPITALES})`}
              value={siglas}
              options={hospitalesDisponibles}
              onChange={(v) => setSiglas(v.slice(0, MAX_HOSPITALES))}
              placeholder="Seleccionar hospitales..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Período</label>
            <PeriodoSelect value={periodo} onChange={setPeriodo} items={periodos} metadata={periodosMetadata} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Métrica</label>
            <select value={metrica} onChange={e => setMetrica(e.target.value)} className="form-input text-sm py-1.5 w-44">
              {METRICAS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
        </div>
        {/* Filtros de perfil y especialidad */}
        {combos.length > 0 && (
          <div className="flex items-end gap-3 mt-3 flex-wrap">
            <div className="w-48">
              <MultiSelectDropdown
                label="Perfil"
                value={filtrosPerfil}
                options={perfilesOpts}
                onChange={setFiltrosPerfil}
                placeholder="Todos"
              />
            </div>
            <div className="w-56">
              <MultiSelectDropdown
                label="Especialidad"
                value={filtrosEspecialidad}
                options={especialidadesOpts}
                onChange={setFiltrosEspecialidad}
                placeholder="Todas"
              />
            </div>
            {(filtrosPerfil.length > 0 || filtrosEspecialidad.length > 0) && (
              <button onClick={() => { setFiltrosPerfil([]); setFiltrosEspecialidad([]); }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 mb-0.5">
                <XMarkIcon className="w-3.5 h-3.5" />Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 min-h-0">
        {!puedeComparar && (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            Seleccioná al menos {MIN_HOSPITALES} hospitales para ver la comparativa
          </div>
        )}
        {puedeComparar && state.error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700 flex-shrink-0">{state.error}</div>
        )}
        {puedeComparar && state.loading ? (
          <div className="flex-1 flex justify-center items-center"><Spinner size="lg" /></div>
        ) : puedeComparar && (
          <div className="overflow-auto rounded-lg border border-gray-200 flex-1 min-h-0">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Perfil</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Especialidad</th>
                  {siglas.map(s => (
                    <th key={s} className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600 whitespace-nowrap">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {combosFiltrados.map((c, idx) => (
                  <tr key={`${c.perfil}|${c.especialidad}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-3 py-2">{c.perfil ?? '—'}</td>
                    <td className="px-3 py-2">{c.especialidad ?? '—'}</td>
                    {siglas.map(s => (
                      <td key={s} className="px-3 py-2 text-right tabular-nums font-medium">
                        {c.porSigla[s]?.[metrica] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                {combosFiltrados.length === 0 && (
                  <tr><td colSpan={2 + siglas.length} className="px-3 py-10 text-center text-gray-400">Sin datos para los filtros seleccionados</td></tr>
                )}
                {combosFiltrados.length > 0 && (
                  <tr className="bg-primary-50 font-semibold border-t-2 border-primary-200">
                    <td className="px-3 py-2 text-xs text-primary-700" colSpan={2}>TOTAL · {METRICAS.find(m => m.key === metrica)?.label}</td>
                    {siglas.map(s => (
                      <td key={s} className="px-3 py-2 text-right tabular-nums text-primary-700">{totales[s]}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
