import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TableCellsIcon, ArrowDownTrayIcon, ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiGet } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import PeriodoSelect from '../../components/ui/PeriodoSelect';

const COLS = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'especialidad', label: 'Especialidad' },
  { key: 'dotacion_diaria', label: 'Dot. Diaria', num: true },
  { key: 'dotacion_sem', label: 'Dot. Semanal', num: true },
  { key: 'dotacion_total', label: 'Dot. Total', num: true },
  { key: 'activos', label: 'Activos', num: true },
  { key: 'tecnicos', label: 'Técnicos', num: true },
  { key: 'vacantes', label: 'Vacantes', num: true },
];

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

export default function POUPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [periodos, setPeriodos] = useState([]);
  const [periodosMetadata, setPeriodosMetadata] = useState([]);
  const [periodo, setPeriodo] = useState('');
  const [state, setState] = useState({ loading: false, rows: [], total: 0, error: null });
  const [exporting, setExporting] = useState(false);
  const [filtroPerfil, setFiltroPerfil] = useState('');
  const [filtroEspecialidad, setFiltroEspecialidad] = useState('');

  useEffect(() => {
    if (!code) return;
    apiGet('/api/pou/periodos', { sigla: code.toUpperCase() })
      .then(d => {
        const list = d.items || [];
        setPeriodos(list);
        setPeriodosMetadata(d.periodsMetadata || []);
        const initial = d.recommended || (list.length > 0 ? list[0] : '');
        if (initial) setPeriodo(initial);
      })
      .catch(() => {});
  }, [code]);

  const fetchData = useCallback(async () => {
    if (!code) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const params = { sigla: code.toUpperCase() };
      if (periodo) params.periodo = periodo;
      const data = await apiGet('/api/pou', params);
      setState({ loading: false, rows: data.data || [], total: data.meta?.count || 0, error: null });
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, [code, periodo]);

  useEffect(() => {
    setFiltroPerfil('');
    setFiltroEspecialidad('');
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { sigla: code.toUpperCase() };
      if (periodo) params.periodo = periodo;
      const data = await apiGet('/api/pou/export', params);
      if (data.base64) downloadBase64(data.base64, `POU_${code.toUpperCase()}_${periodo || 'all'}.xlsx`);
    } catch { /* silencioso */ }
    finally { setExporting(false); }
  };

  const sigla = code?.toUpperCase() || '';

  // Opciones únicas de Perfil (de todas las filas cargadas)
  const perfilesOpts = useMemo(() => {
    return [...new Set(state.rows.map(r => r.perfil).filter(Boolean))].sort();
  }, [state.rows]);

  // Especialidades filtradas por perfil si hay uno seleccionado
  const especialidadesOpts = useMemo(() => {
    const source = filtroPerfil ? state.rows.filter(r => r.perfil === filtroPerfil) : state.rows;
    return [...new Set(source.map(r => r.especialidad).filter(Boolean))].sort();
  }, [state.rows, filtroPerfil]);

  // Filas con filtros aplicados
  const rowsFiltradas = useMemo(() => {
    return state.rows.filter(r => {
      if (filtroPerfil && r.perfil !== filtroPerfil) return false;
      if (filtroEspecialidad && r.especialidad !== filtroEspecialidad) return false;
      return true;
    });
  }, [state.rows, filtroPerfil, filtroEspecialidad]);

  // Calcular totales de filas filtradas
  const totals = COLS.filter(c => c.num).reduce((acc, c) => {
    acc[c.key] = rowsFiltradas.reduce((s, r) => s + (Number(r[c.key]) || 0), 0);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 transition-colors mr-1">
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
            <TableCellsIcon className="w-5 h-5 text-primary-700" />
            <h1 className="text-lg font-bold text-gray-900">POU – {sigla}</h1>
          </div>
          <button onClick={handleExport} disabled={exporting || state.rows.length === 0}
            className="btn-secondary flex items-center gap-1.5 text-sm">
            {exporting ? <Spinner size="sm" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
            Exportar Excel
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Período</label>
          <PeriodoSelect
            value={periodo}
            onChange={setPeriodo}
            items={periodos}
            metadata={periodosMetadata}
          />
          {state.total > 0 && (
            <span className="text-sm text-gray-400">
              {rowsFiltradas.length !== state.total
                ? `${rowsFiltradas.length} de ${state.total} registros`
                : `${state.total} registros`}
            </span>
          )}
        </div>
        {/* Filtros de perfil y especialidad */}
        {state.rows.length > 0 && (
          <div className="flex items-end gap-3 mt-3 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Perfil</label>
              <select value={filtroPerfil} onChange={e => { setFiltroPerfil(e.target.value); setFiltroEspecialidad(''); }}
                className="form-input text-sm w-48 py-1.5">
                <option value="">Todos</option>
                {perfilesOpts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Especialidad</label>
              <select value={filtroEspecialidad} onChange={e => setFiltroEspecialidad(e.target.value)}
                className="form-input text-sm w-56 py-1.5">
                <option value="">Todas</option>
                {especialidadesOpts.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            {(filtroPerfil || filtroEspecialidad) && (
              <button onClick={() => { setFiltroPerfil(''); setFiltroEspecialidad(''); }}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 mb-0.5">
                <XMarkIcon className="w-3.5 h-3.5" />Limpiar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-3">
        {state.error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{state.error}</div>
        )}
        {state.loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  {COLS.map(c => (
                    <th key={c.key} className={`px-3 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap ${c.num ? 'text-right' : 'text-left'}`}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsFiltradas.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {COLS.map(c => (
                      <td key={c.key} className={`px-3 py-2 ${c.num ? 'text-right tabular-nums font-medium' : ''}`}>
                        {row[c.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                {rowsFiltradas.length === 0 && (
                  <tr><td colSpan={COLS.length} className="px-3 py-10 text-center text-gray-400">Sin datos para los filtros seleccionados</td></tr>
                )}
                {rowsFiltradas.length > 0 && (
                  <tr className="bg-primary-50 font-semibold border-t-2 border-primary-200">
                    <td className="px-3 py-2 text-xs text-primary-700">TOTAL</td>
                    <td className="px-3 py-2" />
                    {COLS.filter(c => c.num).map(c => (
                      <td key={c.key} className="px-3 py-2 text-right tabular-nums text-primary-700">{totals[c.key]}</td>
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
