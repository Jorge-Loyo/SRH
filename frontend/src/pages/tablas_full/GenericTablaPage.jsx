import {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  ChevronUpIcon, ChevronDownIcon,
  ArrowDownTrayIcon, FunnelIcon, XMarkIcon,
} from '@heroicons/react/24/outline';
import { apiGet, ApiError } from '../../api/client';
import { getTableConfig, FILTER_TYPES } from '../../data/tables-config';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import PeriodoSelect from '../../components/ui/PeriodoSelect';

// ─── helpers ─────────────────────────────────────────────────────────────────

function downloadBlob(base64, filename) {
  const url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ─── input de filtro según tipo ───────────────────────────────────────────────

function FilterInput({ filter, value, onChange, distinctOptions, onFocus }) {
  const { field, label, type, placeholder } = filter;

  if (type === FILTER_TYPES.MULTI_SELECT) {
    return (
      <MultiSelectDropdown
        label={label}
        value={value || []}
        options={distinctOptions || []}
        onChange={onChange}
        onFocus={onFocus}
        placeholder="Seleccionar..."
      />
    );
  }

  if (type === FILTER_TYPES.NUMBER_RANGE) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <div className="flex gap-1">
          <input
            type="number"
            value={value?.min ?? ''}
            onChange={(e) => onChange({ ...(value || {}), min: e.target.value })}
            placeholder="Min"
            className="form-input text-sm w-full"
          />
          <input
            type="number"
            value={value?.max ?? ''}
            onChange={(e) => onChange({ ...(value || {}), max: e.target.value })}
            placeholder="Max"
            className="form-input text-sm w-full"
          />
        </div>
      </div>
    );
  }

  if (type === FILTER_TYPES.DATE_RANGE) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <div className="flex gap-1">
          <input
            type="date"
            value={value?.desde ?? ''}
            onChange={(e) => onChange({ ...(value || {}), desde: e.target.value })}
            className="form-input text-sm w-full"
          />
          <input
            type="date"
            value={value?.hasta ?? ''}
            onChange={(e) => onChange({ ...(value || {}), hasta: e.target.value })}
            className="form-input text-sm w-full"
          />
        </div>
      </div>
    );
  }

  // TEXT, LIKE, NUMBER
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type === FILTER_TYPES.NUMBER ? 'number' : 'text'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Buscar...'}
        className="form-input text-sm w-full"
      />
    </div>
  );
}

// ─── tabla memoizada ──────────────────────────────────────────────────────────

const DataTable = memo(({ columns, rows, sortBy, sortDir, onSort, tableRef }) => (
  <div
    ref={tableRef}
    className="overflow-auto rounded-lg border border-gray-200 flex-1"
    style={{ maxHeight: 'calc(100vh - 360px)', minHeight: '280px' }}
  >
    <table className="min-w-full text-sm border-collapse">
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          {columns.map((col) => (
            <th
              key={col}
              onClick={() => onSort(col)}
              className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none border-b border-gray-200"
            >
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
          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
            {columns.map((col) => (
              <td key={col} className="px-3 py-1.5 whitespace-nowrap text-gray-800 border-b border-gray-100 text-sm">
                {row[col] != null ? String(row[col]) : ''}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length || 1} className="px-3 py-10 text-center text-gray-400">
              Sin registros para los filtros seleccionados
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
));
DataTable.displayName = 'DataTable';

// ─── componente principal ─────────────────────────────────────────────────────

/**
 * GenericTablaPage — tabla full genérica para cualquier tableKey.
 * Props:
 *   tableKey {string}  'personas' | 'cargos' | 'roles' | 'siglas' | 'bajas'
 */
export default function GenericTablaPage({ tableKey }) {
  const config = useMemo(() => getTableConfig(tableKey), [tableKey]);

  const buildEmptyFilters = useCallback(() => {
    if (!config) return {};
    const empty = {};
    config.filters.forEach(({ field, type }) => {
      if (type === FILTER_TYPES.MULTI_SELECT) empty[field] = [];
      else if (type === FILTER_TYPES.NUMBER_RANGE) empty[field] = { min: '', max: '' };
      else if (type === FILTER_TYPES.DATE_RANGE) empty[field] = { desde: '', hasta: '' };
      else empty[field] = '';
    });
    return empty;
  }, [config]);

  // estado principal
  const [tableState, setTableState] = useState({
    loading: true, columns: [], rows: [], error: null,
    page: 1, perPage: config?.defaultPerPage || 50, total: 0,
    sortBy: undefined, sortDir: undefined,
  });
  const [filters, setFilters] = useState(() => buildEmptyFilters());
  const [distinctOptions, setDistinctOptions] = useState({});
  const [showFilters, setShowFilters] = useState(true);
  const [periodo, setPeriodo] = useState('');
  const [periodos, setPeriodos] = useState([]);
  const [periodosMetadata, setPeriodosMetadata] = useState([]);

  // refs
  const tableStateRef = useRef(tableState);
  useEffect(() => { tableStateRef.current = tableState; }, [tableState]);
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  const periodoRef = useRef(periodo);
  useEffect(() => { periodoRef.current = periodo; }, [periodo]);
  const tableRef = useRef(null);

  // construir query params desde filtros actuales
  const buildQueryParams = useCallback((filtersSnapshot) => {
    if (!config) return {};
    const params = {};
    if (periodoRef.current) params.periodo = periodoRef.current;
    config.filters.forEach(({ field, type }) => {
      const val = filtersSnapshot[field];
      if (type === FILTER_TYPES.MULTI_SELECT) {
        if (val?.length) params[field] = val.join(',');
      } else if (type === FILTER_TYPES.NUMBER_RANGE) {
        if (val?.min) params[`${field}Min`] = val.min;
        if (val?.max) params[`${field}Max`] = val.max;
      } else if (type === FILTER_TYPES.DATE_RANGE) {
        if (val?.desde) params[`${field}Desde`] = val.desde;
        if (val?.hasta) params[`${field}Hasta`] = val.hasta;
      } else {
        if (val?.toString().trim()) params[field] = val.toString().trim();
      }
    });
    return params;
  }, [config]);

  const fetchData = useCallback(async (overrides = {}) => {
    const cur = tableStateRef.current;
    const page = overrides.page ?? cur.page;
    const perPage = overrides.perPage ?? cur.perPage;
    const sortBy = overrides.sortBy ?? cur.sortBy;
    const sortDir = overrides.sortDir ?? cur.sortDir;

    if (!overrides.skipLoading) {
      setTableState((s) => ({ ...s, loading: true, error: null }));
    }
    try {
      const params = {
        page, perPage,
        ...(sortBy ? { sortBy } : {}),
        ...(sortDir ? { sortDir } : {}),
        ...buildQueryParams(filtersRef.current),
      };
      const data = await apiGet(`/api/tablas/${tableKey}`, params);
      setTableState((s) => ({
        ...s, loading: false,
        columns: data.columns || [], rows: data.rows || [],
        total: data.total || 0, error: null,
        page, perPage, sortBy, sortDir,
      }));
    } catch (e) {
      const msg = e instanceof ApiError ? `Error ${e.status}: ${e.message}` : (e.message || 'Error al cargar datos');
      setTableState((s) => ({ ...s, loading: false, error: msg }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, buildQueryParams]);

  // carga inicial
  useEffect(() => {
    setFilters(buildEmptyFilters());
    setDistinctOptions({});
    setPeriodo('');
    setPeriodos([]);
    setPeriodosMetadata([]);
    fetchData({ page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  // cargar períodos cuando la tabla los soporta
  useEffect(() => {
    if (!config?.hasPeriodo) return;
    apiGet('/api/periodos', { limit: 12 })
      .then((d) => {
        const list = d?.items || [];
        setPeriodos(list);
        setPeriodosMetadata(d?.periodsMetadata || []);
        if (d?.recommended) {
          setPeriodo(d.recommended);
          periodoRef.current = d.recommended;
          // re-fetch con el período recomendado
          fetchData({ page: 1 });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey]);

  // recarga al cambiar período
  useEffect(() => {
    if (periodo) fetchData({ page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  // recarga con debounce al cambiar filtros
  useEffect(() => {
    const t = setTimeout(() => fetchData({ page: 1 }), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // cargar opciones distinct para un campo
  const loadDistinct = useCallback(async (field) => {
    if (distinctOptions[field]?.length) return; // ya cargado
    try {
      const params = {
        distinct: field,
        ...buildQueryParams(filtersRef.current),
      };
      const data = await apiGet(`/api/tablas/${tableKey}`, params);
      const values = data.distinct?.values ?? data.values;
      if (Array.isArray(values)) {
        setDistinctOptions((prev) => ({ ...prev, [field]: values }));
      }
    } catch { /* silencioso */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, buildQueryParams, distinctOptions]);

  // callbacks
  const handleSort = useCallback((col) => {
    const s = tableStateRef.current;
    const nextDir = s.sortBy === col && s.sortDir === 'ASC' ? 'DESC' : 'ASC';
    fetchData({ page: 1, sortBy: col, sortDir: nextDir, skipLoading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = useCallback((page) => {
    fetchData({ page, skipLoading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePerPageChange = useCallback((e) => {
    fetchData({ page: 1, perPage: Number(e.target.value) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(buildEmptyFilters());
    setDistinctOptions({});
  }, [buildEmptyFilters]);

  const exportPage = useCallback(async () => {
    const s = tableStateRef.current;
    try {
      const params = {
        page: s.page, perPage: s.perPage, export: 'xlsx',
        ...(s.sortBy ? { sortBy: s.sortBy } : {}),
        ...(s.sortDir ? { sortDir: s.sortDir } : {}),
        ...buildQueryParams(filtersRef.current),
      };
      const data = await apiGet(`/api/tablas/${tableKey}`, params);
      if (data.xlsxBase64) downloadBlob(data.xlsxBase64, data.filename || `${tableKey}_pag${s.page}.xlsx`);
    } catch { /* silencioso */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, buildQueryParams]);

  const exportFull = useCallback(() => {
    const s = tableStateRef.current;
    const params = new URLSearchParams({
      ...(s.sortBy ? { sortBy: s.sortBy } : {}),
      ...(s.sortDir ? { sortDir: s.sortDir } : {}),
      ...buildQueryParams(filtersRef.current),
    });
    const a = document.createElement('a');
    a.href = `/api/tablas/${tableKey}/export?${params}`;
    a.download = `${tableKey}_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, buildQueryParams]);

  // valores derivados
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(tableState.total / tableState.perPage)),
    [tableState.total, tableState.perPage]
  );

  const hasActiveFilters = useMemo(() => {
    if (!config) return false;
    return config.filters.some(({ field, type }) => {
      const v = filters[field];
      if (type === FILTER_TYPES.MULTI_SELECT) return v?.length > 0;
      if (type === FILTER_TYPES.NUMBER_RANGE || type === FILTER_TYPES.DATE_RANGE) {
        return Object.values(v || {}).some((x) => x?.toString().trim());
      }
      return v?.toString().trim();
    });
  }, [filters, config]);

  if (!config) {
    return (
      <div className="p-6 text-red-600">
        Tabla desconocida: <code>{tableKey}</code>
      </div>
    );
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{config.label}</h1>
            <p className="text-xs text-gray-400">{config.description}</p>
          </div>
          <div className="flex-1" />
          {config.hasPeriodo && periodos.length > 0 && (
            <PeriodoSelect
              value={periodo}
              onChange={(p) => { setPeriodo(p); }}
              items={periodos}
              metadata={periodosMetadata}
            />
          )}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-secondary flex items-center gap-1.5 text-sm ${hasActiveFilters ? 'border-primary-500 text-primary-700' : ''}`}
          >
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
        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {config.filters.map((filter) => (
              <FilterInput
                key={filter.field}
                filter={filter}
                value={filters[filter.field]}
                onChange={(v) => setFilters((f) => ({ ...f, [filter.field]: v }))}
                distinctOptions={distinctOptions[filter.field]}
                onFocus={filter.fetchDistinct ? () => loadDistinct(filter.field) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
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
            {/* Controles */}
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {tableState.loading && <Spinner size="sm" />}
                <span>{tableState.total.toLocaleString('es-AR')} registro{tableState.total !== 1 ? 's' : ''}</span>
                <span className="text-gray-300">|</span>
                <span>{tableState.columns.length} columnas</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-gray-500">
                  Mostrar
                  <select value={tableState.perPage} onChange={handlePerPageChange} className="form-input text-sm py-1 w-20">
                    {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  por página
                </label>
                <button onClick={exportPage} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <ArrowDownTrayIcon className="w-4 h-4" />Página
                </button>
                <button onClick={exportFull} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <ArrowDownTrayIcon className="w-4 h-4" />Completo
                </button>
              </div>
            </div>

            <DataTable
              columns={tableState.columns}
              rows={tableState.rows}
              sortBy={tableState.sortBy}
              sortDir={tableState.sortDir}
              onSort={handleSort}
              tableRef={tableRef}
            />

            <div className="flex-shrink-0">
              <Pagination
                currentPage={tableState.page}
                totalPages={totalPages}
                totalRecords={tableState.total}
                onPageChange={handlePageChange}
                loading={tableState.loading}
                tableRef={tableRef}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
