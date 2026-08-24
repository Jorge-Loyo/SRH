import {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronUpIcon, ChevronDownIcon, ArrowLeftIcon,
  ArrowDownTrayIcon, FunnelIcon, XMarkIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import KpiCard, { KPI_DEFS_DOTACION } from '../../components/ui/tables/KpiCard';
import { apiGet, ApiError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext.jsx';
import Pagination from '../../components/ui/Pagination';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import Spinner from '../../components/ui/Spinner';
import TablaAmpliadaModal from '../../components/ui/TablaAmpliadaModal';
import PeriodoSelect from '../../components/ui/PeriodoSelect';
import { formatCellValue } from '../../utils/formatValue';


// ─── constantes ─────────────────────────────────────────────────────────────

const MULTI_FILTERS = [
  { key: 'unificador_puesto',       label: 'Unificador Puesto' },
  { key: 'especialidad',            label: 'Especialidad' },
  { key: 'agrupador',               label: 'Agrupamiento' },
  { key: 'literal_puesto',          label: 'Puesto' },
  { key: 'literal_codigo_registro', label: 'Código de Registro' },
  { key: 'escalafon',               label: 'Escalafón' },
  { key: 'sexo',                    label: 'Sexo' },
  { key: 'situacion_revista',       label: 'Situación de Revista' },
  { key: 'reparticion',             label: 'Repartición' },
];

const SIGLAS_FILTERS = [
  { key: 'sigla',                label: 'Hospital (Sigla)' },
  { key: 'universo_totalizador', label: 'Universo' },
  { key: 'tipo_hospital_sigla',  label: 'Tipo Hospital' },
  { key: 'monovalencia',         label: 'Monovalencia' },
];

const QUICK_FIELDS = [
  { key: 'codigo_cargo',    label: 'Cód. Cargo',        placeholder: 'Buscar...' },
  { key: 'nombre_apellido', label: 'Nombre / Apellido', placeholder: 'Buscar...' },
  { key: 'cuil',            label: 'CUIL',              placeholder: 'Buscar...' },
  { key: 'codigo_rol',      label: 'Cód. SIAL',         placeholder: 'Buscar...' },
];



const EMPTY_MULTI = {
  unificador_puesto: [], especialidad: [], agrupador: [],
  literal_puesto: [], literal_codigo_registro: [], escalafon: [], sexo: [],
  situacion_revista: [], reparticion: [],
};
const EMPTY_SIGLAS = { sigla: [], universo_totalizador: [], tipo_hospital_sigla: [], monovalencia: [] };
const EMPTY_QUICK = { codigo_cargo: '', nombre_apellido: '', cuil: '', codigo_rol: '' };

// ─── helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(base64, filename) {
  const url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}

// ─── sub-componentes ─────────────────────────────────────────────────────────

const DataTable = memo(({ columns, rows, sortBy, sortDir, onSort, tableRef }) => (
  <div
    ref={tableRef}
    className="overflow-auto rounded-lg border border-gray-200 flex-1"
    style={{ minHeight: '250px' }}
  >
    <table className="min-w-full text-sm border-collapse">
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          {columns.map(col => (
            <th key={col} onClick={() => onSort(col)}
              className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none border-b border-gray-200">
              <div className="flex items-center gap-1">
                {col}
                {sortBy === col
                  ? sortDir === 'ASC'
                    ? <ChevronUpIcon className="w-3 h-3 text-primary-600" />
                    : <ChevronDownIcon className="w-3 h-3 text-primary-600" />
                  : <span className="w-3 h-3 inline-block" />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx}
            className={row.nombre_apellido === 'TOTAL DE REGISTROS'
              ? 'bg-yellow-50 font-medium'
              : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
            {columns.map(col => (
              <td key={col} className="px-3 py-1.5 whitespace-nowrap text-gray-800 border-b border-gray-100">
                {formatCellValue(row[col], col)}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={columns.length || 1} className="px-3 py-10 text-center text-gray-400">Sin registros para los filtros seleccionados</td></tr>
        )}
      </tbody>
    </table>
  </div>
));
DataTable.displayName = 'DataTable';

// ─── Panel de KPIs ──────────────────────────────────────────────────────────



// ─── componente principal ────────────────────────────────────────────────────

export default function DotacionTotalPage() {
  const { user } = useAuth();
  const canExport = user?.role !== 'autoridades';
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Solo se muestra "Volver" cuando se llegó por un drill-down desde el Panel
  // (HomePage marca la navegación con este flag en el state del history).
  const fromPanel = location.state?.fromPanel === true;

  const [periodo, setPeriodo] = useState(searchParams.get('periodo') || '');
  const [periodos, setPeriodos] = useState([]);
  const [periodosMetadata, setPeriodosMetadata] = useState([]);
  const [tableState, setTableState] = useState({
    loading: true, columns: [], rows: [], error: null,
    page: 1, perPage: 50, total: 0,
    sortBy: undefined, sortDir: undefined,
    kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
  });
  // Estado inicial de los filtros: si se llega desde un link de drill-down
  // (ej. el Panel) con query params como ?literal_puesto=X&situacion_revista=Y,
  // arrancan ya aplicados.
  const [filters, setFilters] = useState(() => {
    const init = { ...EMPTY_MULTI };
    MULTI_FILTERS.forEach(({ key }) => {
      const v = searchParams.get(key);
      if (v) init[key] = v.split(',');
    });
    return init;
  });
  const [siglasFilters, setSiglasFilters] = useState(() => {
    const init = { ...EMPTY_SIGLAS };
    SIGLAS_FILTERS.forEach(({ key }) => {
      const v = searchParams.get(key);
      if (v) init[key] = v.split(',');
    });
    return init;
  });
  const [quickSearch, setQuickSearch] = useState(EMPTY_QUICK);
  const [rangoEdad, setRangoEdad] = useState({ min: '', max: '' });
  const [antiguedad, setAntiguedad] = useState({ min: '', max: '' });
  const [estadoFilter, setEstadoFilter] = useState(searchParams.get('estado') || '');
  // Código numérico de registro — sin UI propia, solo para el drill-down de "Administrativos".
  const [codigoRegistroFilter, setCodigoRegistroFilter] = useState(searchParams.get('codigo_registro') || '');
  const [distinctValues, setDistinctValues] = useState({ ...EMPTY_MULTI });
  const [siglasDistinctValues, setSiglasDistinctValues] = useState({ ...EMPTY_SIGLAS });
  const [showFilters, setShowFilters] = useState(true);
  const [tablaAmpliada, setTablaAmpliada] = useState(false);

  // refs para callbacks sin dependencias
  const tableStateRef = useRef(tableState);
  useEffect(() => { tableStateRef.current = tableState; }, [tableState]);
  const periodoRef = useRef(periodo);
  useEffect(() => { periodoRef.current = periodo; }, [periodo]);
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  const siglasFiltersRef = useRef(siglasFilters);
  useEffect(() => { siglasFiltersRef.current = siglasFilters; }, [siglasFilters]);
  const quickSearchRef = useRef(quickSearch);
  useEffect(() => { quickSearchRef.current = quickSearch; }, [quickSearch]);
  const rangoEdadRef = useRef(rangoEdad);
  useEffect(() => { rangoEdadRef.current = rangoEdad; }, [rangoEdad]);
  const antiguedadRef = useRef(antiguedad);
  useEffect(() => { antiguedadRef.current = antiguedad; }, [antiguedad]);
  const estadoFilterRef = useRef(estadoFilter);
  useEffect(() => { estadoFilterRef.current = estadoFilter; }, [estadoFilter]);
  const codigoRegistroFilterRef = useRef(codigoRegistroFilter);
  useEffect(() => { codigoRegistroFilterRef.current = codigoRegistroFilter; }, [codigoRegistroFilter]);
  const tableRef = useRef(null);

  const buildActiveFilters = useCallback(() => {
    const active = {};
    Object.entries(filtersRef.current).forEach(([k, v]) => { if (v.length) active[k] = v.join(','); });
    Object.entries(siglasFiltersRef.current).forEach(([k, v]) => { if (v.length) active[k] = v.join(','); });
    Object.entries(quickSearchRef.current).forEach(([k, v]) => { if (v?.trim()) active[k] = v.trim(); });
    if (rangoEdadRef.current.min) active.edad_min = rangoEdadRef.current.min;
    if (rangoEdadRef.current.max) active.edad_max = rangoEdadRef.current.max;
    if (antiguedadRef.current.min) active.antiguedad_min = antiguedadRef.current.min;
    if (antiguedadRef.current.max) active.antiguedad_max = antiguedadRef.current.max;
    if (estadoFilterRef.current) active.estado = estadoFilterRef.current;
    if (codigoRegistroFilterRef.current) active.codigo_registro = codigoRegistroFilterRef.current;
    return active;
  }, []);

  const fetchData = useCallback(async (overrides = {}) => {
    const cur = tableStateRef.current;
    const page = overrides.page ?? cur.page;
    const perPage = overrides.perPage ?? cur.perPage;
    const sortBy = overrides.sortBy ?? cur.sortBy;
    const sortDir = overrides.sortDir ?? cur.sortDir;
    const skipDistinct = overrides.skipDistinct === true;

    if (!overrides.skipLoading) setTableState(s => ({ ...s, loading: true, error: null }));
    try {
      const params = {
        periodo: periodoRef.current, page, perPage,
        ...(sortBy ? { sortBy } : {}),
        ...(sortDir ? { sortDir } : {}),
        ...(skipDistinct ? { skipDistinct: 'true' } : {}),
        ...buildActiveFilters(),
      };
      const data = await apiGet('/api/dotacion-total', params);
      setTableState(s => ({
        ...s, loading: false,
        columns: data.columns || [], rows: data.rows || [],
        total: data.total || 0, kpis: data.kpis || s.kpis,
        error: null, page, perPage, sortBy, sortDir,
      }));
      if (data.distinctValues) setDistinctValues(data.distinctValues);
      if (data.siglasDistinctValues) setSiglasDistinctValues(data.siglasDistinctValues);
    } catch (e) {
      const msg = e instanceof ApiError ? `Error ${e.status}: ${e.message}` : (e.message || 'Error al cargar datos');
      setTableState(s => ({ ...s, loading: false, error: msg }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildActiveFilters]);

  // cargar períodos al montar
  useEffect(() => {
    apiGet('/api/periodos', { limit: 12 })
      .then(d => {
        const list = d?.items || [];
        setPeriodos(list);
        setPeriodosMetadata(d?.periodsMetadata || []);
        if (!periodoRef.current && d?.recommended) {
          setPeriodo(d.recommended);
          periodoRef.current = d.recommended;
          setSearchParams({ periodo: d.recommended }, { replace: true });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (periodo) fetchData({ page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  useEffect(() => {
    const t = setTimeout(() => fetchData({ page: 1 }), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, siglasFilters, quickSearch, rangoEdad, antiguedad, estadoFilter]);

  const handleSort = useCallback(col => {
    const s = tableStateRef.current;
    const nextDir = s.sortBy === col && s.sortDir === 'ASC' ? 'DESC' : 'ASC';
    fetchData({ page: 1, sortBy: col, sortDir: nextDir, skipDistinct: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = useCallback(page => {
    fetchData({ page, skipDistinct: true, skipLoading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePerPageChange = useCallback(e => {
    fetchData({ page: 1, perPage: Number(e.target.value), skipDistinct: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKpiClick = useCallback(estadoValue => {
    setEstadoFilter(cur => cur === estadoValue ? '' : estadoValue);
  }, []);

  const handlePeriodoChange = useCallback(e => {
    const p = e.target.value;
    setPeriodo(p);
    setSearchParams({ periodo: p }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_MULTI);
    setSiglasFilters(EMPTY_SIGLAS);
    setQuickSearch(EMPTY_QUICK);
    setRangoEdad({ min: '', max: '' });
    setAntiguedad({ min: '', max: '' });
    setEstadoFilter('');
    setCodigoRegistroFilter('');
  }, []);

  const exportPage = useCallback(async () => {
    const s = tableStateRef.current;
    try {
      const params = {
        periodo: periodoRef.current, page: s.page, perPage: s.perPage, export: 'xlsx',
        ...(s.sortBy ? { sortBy: s.sortBy } : {}),
        ...(s.sortDir ? { sortDir: s.sortDir } : {}),
        ...buildActiveFilters(),
      };
      const data = await apiGet('/api/dotacion-total', params);
      if (data.xlsxBase64) downloadBlob(data.xlsxBase64, data.filename || `dotacion_total_pag${s.page}.xlsx`);
    } catch { /* silencioso */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildActiveFilters]);

  const exportFull = useCallback(() => {
    const s = tableStateRef.current;
    const params = new URLSearchParams({ periodo: periodoRef.current, export: 'xlsx' });
    if (s.sortBy) params.append('sortBy', s.sortBy);
    if (s.sortDir) params.append('sortDir', s.sortDir);
    Object.entries(buildActiveFilters()).forEach(([k, v]) => params.append(k, v));
    const a = document.createElement('a');
    a.href = `/api/dotacion-total?${params}`;
    a.download = `dotacion_total_${periodoRef.current}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildActiveFilters]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(tableState.total / tableState.perPage)),
    [tableState.total, tableState.perPage]
  );
  const hasActiveFilters = useMemo(() => (
    Object.values(filters).some(v => v.length > 0) ||
    Object.values(siglasFilters).some(v => v.length > 0) ||
    Object.values(quickSearch).some(v => v.trim()) ||
    rangoEdad.min || rangoEdad.max || antiguedad.min || antiguedad.max || estadoFilter || codigoRegistroFilter
  ), [filters, siglasFilters, quickSearch, rangoEdad, antiguedad, estadoFilter, codigoRegistroFilter]);

  return (
    <div className="flex flex-col">
      {/* Barra superior */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3">
          {fromPanel && (
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />Volver
            </button>
          )}
          <h1 className="text-lg font-bold text-gray-900">Dotación Total</h1>
          <span className="text-xs text-gray-400">Todos los hospitales</span>
          <div className="flex-1" />

          {/* Período */}
          {periodos.length > 0 && (
            <PeriodoSelect
              value={periodo}
              onChange={(p) => { setPeriodo(p); setSearchParams({ periodo: p }, { replace: true }); }}
              items={periodos}
              metadata={periodosMetadata}
            />
          )}

          {/* Filtros toggle */}
          <button onClick={() => setShowFilters(v => !v)}
            className={`btn-secondary flex items-center gap-1.5 text-sm ${hasActiveFilters ? 'border-primary-500 text-primary-700' : ''}`}>
            <FunnelIcon className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-xs">!</span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
              <XMarkIcon className="w-3.5 h-3.5" />Limpiar
            </button>
          )}
        </div>
      </div>



      {/* Panel de filtros */}
      {showFilters && (
        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
          {/* Filtros de segmentación de hospitales */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Segmentación de hospitales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {SIGLAS_FILTERS.map(({ key, label }) => (
                <MultiSelectDropdown key={key} label={label}
                  value={siglasFilters[key]} options={siglasDistinctValues[key] || []}
                  onChange={v => setSiglasFilters(f => ({ ...f, [key]: v }))} />
              ))}
            </div>
          </div>
          {/* Filtros de dotación */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Filtros de dotación</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-3">
              {MULTI_FILTERS.map(({ key, label }) => (
                <MultiSelectDropdown key={key} label={label}
                  value={filters[key]} options={distinctValues[key] || []}
                  onChange={v => setFilters(f => ({ ...f, [key]: v }))} />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
              {QUICK_FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input type="text" value={quickSearch[key]} placeholder={placeholder} className="form-input text-sm w-full"
                    onChange={e => setQuickSearch(q => ({ ...q, [key]: e.target.value }))} />
                </div>
              ))}
              <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Edad</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={rangoEdad.min} min="0" max="120" placeholder="Mín."
                        className="form-input text-sm w-full"
                        onChange={e => setRangoEdad(r => ({ ...r, min: e.target.value }))} />
                      <span className="text-gray-400 text-xs flex-shrink-0">–</span>
                      <input type="number" value={rangoEdad.max} min="0" max="120" placeholder="Máx."
                        className="form-input text-sm w-full"
                        onChange={e => setRangoEdad(r => ({ ...r, max: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Antigüedad</label>
                    <div className="flex items-center gap-2">
                      <input type="number" value={antiguedad.min} min="0" placeholder="Mín."
                        className="form-input text-sm w-full"
                        onChange={e => setAntiguedad(a => ({ ...a, min: e.target.value }))} />
                      <span className="text-gray-400 text-xs flex-shrink-0">–</span>
                      <input type="number" value={antiguedad.max} min="0" placeholder="Máx."
                        className="form-input text-sm w-full"
                        onChange={e => setAntiguedad(a => ({ ...a, max: e.target.value }))} />
                    </div>
                  </div>
            </div>
          </div>
        </div>
      )}

      {/* KPIs + Cargos Vacantes */}
      <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* KPIs */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {KPI_DEFS_DOTACION.map(def => (
              <KpiCard key={def.key} def={def}
                value={tableState.kpis?.[def.key]}
                active={estadoFilter === def.estadoValue && def.estadoValue !== ''}
                onClick={handleKpiClick} />
            ))}
            {estadoFilter && (
              <button onClick={() => setEstadoFilter('')}
                className="text-xs text-red-500 hover:text-red-700 ml-2 flex items-center gap-1">
                <XMarkIcon className="w-3.5 h-3.5" />Quitar filtro estado
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla + controles */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 min-h-0">
        {tableState.error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700 flex-shrink-0">
            {tableState.error}
          </div>
        )}

        {tableState.loading && tableState.rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Spinner size="lg" />
              <span className="text-sm">Cargando tabla...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {tableState.loading && <Spinner size="sm" />}
                <span>{tableState.columns.length} columnas</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-sm text-gray-500">
                  Mostrar
                  <select value={tableState.perPage} onChange={handlePerPageChange} className="form-input text-sm py-1 w-20">
                    {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  por página
                </label>
                <button onClick={() => setTablaAmpliada(true)} className="btn-secondary flex items-center gap-1.5 text-sm" title="Ver tabla ampliada">
                  <TableCellsIcon className="w-4 h-4" />Ampliar
                </button>
                {canExport && (
                  <>
                    <button onClick={exportPage} className="btn-secondary flex items-center gap-1.5 text-sm" title="Exportar página actual">
                      <ArrowDownTrayIcon className="w-4 h-4" />Página
                    </button>
                    <button onClick={exportFull} className="btn-secondary flex items-center gap-1.5 text-sm" title="Exportar todos los registros">
                      <ArrowDownTrayIcon className="w-4 h-4" />Completo
                    </button>
                  </>
                )}
              </div>
            </div>

            <DataTable columns={tableState.columns} rows={tableState.rows}
              sortBy={tableState.sortBy} sortDir={tableState.sortDir}
              onSort={handleSort} tableRef={tableRef} />

            <div className="flex-shrink-0">
              <Pagination currentPage={tableState.page} totalPages={totalPages}
                totalRecords={tableState.total} onPageChange={handlePageChange}
                loading={tableState.loading} tableRef={tableRef} />
            </div>
          </>
        )}
      </div>

      {tablaAmpliada && (
        <TablaAmpliadaModal
          isOpen={tablaAmpliada}
          onClose={() => setTablaAmpliada(false)}
          columns={tableState.columns}
          rows={tableState.rows}
          state={tableState}
          toggleSort={handleSort}
          totalPages={totalPages}
          fetchData={fetchData}
        />
      )}
    </div>
  );
}
