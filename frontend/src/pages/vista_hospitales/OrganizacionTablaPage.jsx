import {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon, ChevronUpIcon, ChevronDownIcon,
  ArrowDownTrayIcon, FunnelIcon, XMarkIcon,
  ChartBarSquareIcon, ClipboardDocumentListIcon,
  TableCellsIcon, CheckIcon, TrashIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import BaseModal from '../../components/ui/modals/BaseModal';
import KpiCard, { KPI_DEFS_DOTACION } from '../../components/ui/tables/KpiCard';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '../../api/client';
import { hospitalsMap } from '../../data/hospitals-data';
import { useAuth } from '../../auth/AuthContext';
import Pagination from '../../components/ui/Pagination';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown';
import Spinner from '../../components/ui/Spinner';
import RichTextEditor from '../../components/ui/RichTextEditor';
import TablaAmpliadaModal from '../../components/ui/TablaAmpliadaModal';
import PeriodoSelect from '../../components/ui/PeriodoSelect';
import { formatCellValue } from '../../utils/formatValue';

// ─── constantes ─────────────────────────────────────────────────────────────

const MULTI_FILTERS = [
  { key: 'unificador_puesto',        label: 'Unificador Puesto' },
  { key: 'especialidad',             label: 'Especialidad' },
  { key: 'agrupador',                label: 'Agrupamiento' },
  { key: 'literal_puesto',           label: 'Puesto' },
  { key: 'literal_codigo_registro',  label: 'Código de Registro' },
  { key: 'escalafon',                label: 'Escalafón' },
  { key: 'sexo',                     label: 'Sexo' },
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
};
const EMPTY_QUICK = {
  codigo_cargo: '', nombre_apellido: '', cuil: '', codigo_rol: '',
};

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

// ─── sub-componentes memoizados ──────────────────────────────────────────────


const DataTable = memo(({ columns, rows, sortBy, sortDir, onSort, tableRef }) => (
  <div
    ref={tableRef}
    className="overflow-auto rounded-lg border border-gray-200 flex-1"
    style={{ minHeight: '250px' }}
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
          <tr
            key={idx}
            className={
              row.nombre_apellido === 'TOTAL DE REGISTROS'
                ? 'bg-yellow-50 font-medium'
                : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
            }
          >
            {columns.map((col) => (
              <td key={col} className="px-3 py-1.5 whitespace-nowrap text-gray-800 border-b border-gray-100">
                {formatCellValue(row[col], col)}
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

// ─── Modal editor de recorrida (centrado, estado persistente en padre) ────────
function RecorridaEditorModal({
  open, hospital, hospitalName, existingRecorrida,
  draftTitulo, draftContent, onDraftChange,
  onSaved, onDelete, onClose, canEdit,
}) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Pre-llenar desde servidor solo si el draft está vacío (primera apertura)
  useEffect(() => {
    if (open && existingRecorrida?.id && !draftTitulo && !draftContent) {
      onDraftChange(existingRecorrida.titulo || '', existingRecorrida.contenido_html || '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingRecorrida?.id]);

  const handleSave = async () => {
    if (!draftTitulo.trim()) { setSaveError('El título es requerido'); return; }
    setSaving(true); setSaveError('');
    try {
      if (existingRecorrida?.id) {
        await apiPut(`/api/recorridas/${existingRecorrida.id}`, {
          hospital_code: hospital, titulo: draftTitulo, contenido_html: draftContent,
        });
      } else {
        await apiPost('/api/recorridas', {
          hospital_code: hospital, titulo: draftTitulo, contenido_html: draftContent,
        });
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000); onSaved();
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const isNew = !existingRecorrida?.id;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Recorrida"
      subtitle={`${hospitalName} (${hospital})`}
      size="lg"
      footer={canEdit && (
        <>
          {saveError && <p className="text-sm text-red-600 mr-auto">{saveError}</p>}
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium mr-auto">
              <CheckIcon className="w-4 h-4" />Guardado con éxito
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm">
            {saving && <Spinner size="sm" />}
            {isNew ? 'Crear Recorrida' : 'Guardar cambios'}
          </button>
        </>
      )}
    >
      <div className="flex flex-col gap-4">
        {isNew && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
            No hay recorrida para este hospital todavía.
          </div>
        )}
        {!isNew && canEdit && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Modificado: {existingRecorrida.updated_at
                ? new Date(existingRecorrida.updated_at).toLocaleDateString('es-AR')
                : new Date(existingRecorrida.created_at).toLocaleDateString('es-AR')}
            </p>
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <TrashIcon className="w-3.5 h-3.5" />Eliminar
            </button>
          </div>
        )}
        {canEdit ? (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
              <input
                type="text"
                value={draftTitulo}
                onChange={e => onDraftChange(e.target.value, draftContent)}
                className="form-input w-full"
                placeholder="Título de la recorrida"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contenido</label>
              <RichTextEditor
                value={draftContent}
                onChange={html => onDraftChange(draftTitulo, html)}
                placeholder="Escribí el contenido de la recorrida..."
                minHeight={320}
              />
            </div>
          </>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
            <h2 className="font-semibold text-gray-900 mb-3">{existingRecorrida?.titulo}</h2>
            <RichTextEditor value={draftContent || ''} readOnly minHeight={120} />
          </div>
        )}
      </div>
    </BaseModal>
  );
}

// ─── componente principal ────────────────────────────────────────────────────

export default function OrganizacionTablaPage() {
  const { code } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const hospitalName = hospitalsMap[code] || code;
  const { user } = useAuth();
  // Director solo puede ver dotación y organigrama (igual que el sistema anterior)
  const isDirector = user?.role === 'director';

  // estado principal
  const [periodo, setPeriodo] = useState(searchParams.get('periodo') || '');
  const [periodos, setPeriodos] = useState([]);
  const [periodosMetadata, setPeriodosMetadata] = useState([]);
  const [tableState, setTableState] = useState({
    loading: true, columns: [], rows: [], error: null,
    page: 1, perPage: 50, total: 0,
    sortBy: undefined, sortDir: undefined,
    kpis: { total: 0, activos: 0, vacantes: 0, bloqueados: 0, comision: 0, retencion: 0 },
  });
  const [filters, setFilters] = useState(EMPTY_MULTI);
  const [quickSearch, setQuickSearch] = useState(EMPTY_QUICK);
  const [rangoEdad, setRangoEdad] = useState({ min: '', max: '' });
  const [antiguedad, setAntiguedad] = useState({ min: '', max: '' });
  const [estadoFilter, setEstadoFilter] = useState('');
  const [distinctValues, setDistinctValues] = useState({ ...EMPTY_MULTI });
  const [showFilters, setShowFilters] = useState(true);
  const [tablaAmpliada, setTablaAmpliada] = useState(false);
  const [recorridaOpen, setRecorridaOpen] = useState(false);
  const [recorridaData, setRecorridaData] = useState(null);
  const [recorridaLoading, setRecorridaLoading] = useState(false);
  // Draft persistente: no se borra al cerrar el modal
  const [draftTitulo, setDraftTitulo] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const draftInitRef = useRef(false); // indica si el draft fue inicializado desde el servidor

  const openRecorridaModal = useCallback(async () => {
    setRecorridaOpen(true);
    setRecorridaLoading(true);
    try {
      const data = await apiGet('/api/recorridas', { hospital_code: code, limit: 1, page: 1 });
      const rows = data.rows || data.data || [];
      const rec = rows[0] || null;
      setRecorridaData(rec);
      // Solo inicializar draft si no hay contenido escrito todavía y hay datos del servidor
      if (!draftInitRef.current && rec) {
        setDraftTitulo(rec.titulo || '');
        setDraftContent(rec.contenido_html || '');
        draftInitRef.current = true;
      }
      if (!draftInitRef.current && !rec) {
        setDraftTitulo(`Recorrida ${code}`);
        setDraftContent('');
        draftInitRef.current = true;
      }
    } catch { setRecorridaData(null); }
    finally { setRecorridaLoading(false); }
  }, [code]);

  const reloadRecorrida = useCallback(async () => {
    setRecorridaLoading(true);
    try {
      const data = await apiGet('/api/recorridas', { hospital_code: code, limit: 1, page: 1 });
      const rows = data.rows || data.data || [];
      setRecorridaData(rows[0] || null);
    } catch { setRecorridaData(null); }
    finally { setRecorridaLoading(false); }
  }, [code]);

  // refs para acceder al estado actual desde callbacks sin dependencias
  const tableStateRef = useRef(tableState);
  useEffect(() => { tableStateRef.current = tableState; }, [tableState]);
  const periodoRef = useRef(periodo);
  useEffect(() => { periodoRef.current = periodo; }, [periodo]);
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  const quickSearchRef = useRef(quickSearch);
  useEffect(() => { quickSearchRef.current = quickSearch; }, [quickSearch]);
  const rangoEdadRef = useRef(rangoEdad);
  useEffect(() => { rangoEdadRef.current = rangoEdad; }, [rangoEdad]);
  const antiguedadRef = useRef(antiguedad);
  useEffect(() => { antiguedadRef.current = antiguedad; }, [antiguedad]);
  const estadoFilterRef = useRef(estadoFilter);
  useEffect(() => { estadoFilterRef.current = estadoFilter; }, [estadoFilter]);
  const tableRef = useRef(null);

  // construir filtros activos desde refs
  const buildActiveFilters = useCallback(() => {
    const active = {};
    Object.entries(filtersRef.current).forEach(([k, v]) => { if (v.length) active[k] = v.join(','); });
    Object.entries(quickSearchRef.current).forEach(([k, v]) => { if (v?.trim()) active[k] = v.trim(); });
    if (rangoEdadRef.current.min) active.edad_min = rangoEdadRef.current.min;
    if (rangoEdadRef.current.max) active.edad_max = rangoEdadRef.current.max;
    if (antiguedadRef.current.min) active.antiguedad_min = antiguedadRef.current.min;
    if (antiguedadRef.current.max) active.antiguedad_max = antiguedadRef.current.max;
    if (estadoFilterRef.current) active.estado = estadoFilterRef.current;
    return active;
  }, []);

  // fetch principal — usa refs, sin dependencias de estado
  const fetchData = useCallback(async (overrides = {}) => {
    const cur = tableStateRef.current;
    const page = overrides.page ?? cur.page;
    const perPage = overrides.perPage ?? cur.perPage;
    const sortBy = overrides.sortBy ?? cur.sortBy;
    const sortDir = overrides.sortDir ?? cur.sortDir;
    const skipDistinct = overrides.skipDistinct === true;

    if (!overrides.skipLoading) {
      setTableState((s) => ({ ...s, loading: true, error: null }));
    }
    try {
      const params = {
        periodo: periodoRef.current, page, perPage,
        ...(sortBy ? { sortBy } : {}),
        ...(sortDir ? { sortDir } : {}),
        ...(skipDistinct ? { skipDistinct: 'true' } : {}),
        ...buildActiveFilters(),
      };
      const data = await apiGet(`/api/hospitales/${code}/organizacion-tabla`, params);
      setTableState((s) => ({
        ...s, loading: false,
        columns: data.columns || [], rows: data.rows || [],
        total: data.total || 0, kpis: data.kpis || s.kpis,
        error: null, page, perPage, sortBy, sortDir,
      }));
      if (data.distinctValues) setDistinctValues(data.distinctValues);
    } catch (e) {
      const msg = e instanceof ApiError ? `Error ${e.status}: ${e.message}` : (e.message || 'Error al cargar datos');
      setTableState((s) => ({ ...s, loading: false, error: msg }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, buildActiveFilters]);

  // carga de períodos al montar
  useEffect(() => {
    apiGet('/api/periodos', { hospital: code, limit: 12 })
      .then((d) => {
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
  }, [code]);

  // carga inicial de tabla cuando hay período
  useEffect(() => {
    if (periodo) fetchData({ page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, periodo]);

  // recarga con debounce al cambiar filtros
  useEffect(() => {
    const t = setTimeout(() => fetchData({ page: 1 }), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, quickSearch, rangoEdad, antiguedad, estadoFilter]);

  // callbacks de UI
  const handleSort = useCallback((col) => {
    const s = tableStateRef.current;
    const nextDir = s.sortBy === col && s.sortDir === 'ASC' ? 'DESC' : 'ASC';
    fetchData({ page: 1, sortBy: col, sortDir: nextDir, skipDistinct: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = useCallback((page) => {
    fetchData({ page, skipDistinct: true, skipLoading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePerPageChange = useCallback((e) => {
    fetchData({ page: 1, perPage: Number(e.target.value), skipDistinct: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKpiClick = useCallback((estadoValue) => {
    setEstadoFilter((cur) => (cur === estadoValue ? '' : estadoValue));
  }, []);

  const handlePeriodoChange = useCallback((e) => {
    const p = e.target.value;
    setPeriodo(p);
    setSearchParams({ periodo: p }, { replace: true });
  }, [setSearchParams]);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_MULTI);
    setQuickSearch(EMPTY_QUICK);
    setRangoEdad({ min: '', max: '' });
    setAntiguedad({ min: '', max: '' });
    setEstadoFilter('');
  }, []);

  // exports
  const exportPage = useCallback(async () => {
    const s = tableStateRef.current;
    try {
      const params = {
        periodo: periodoRef.current, page: s.page, perPage: s.perPage, export: 'xlsx',
        ...(s.sortBy ? { sortBy: s.sortBy } : {}),
        ...(s.sortDir ? { sortDir: s.sortDir } : {}),
        ...buildActiveFilters(),
      };
      const data = await apiGet(`/api/hospitales/${code}/organizacion-tabla`, params);
      if (data.xlsxBase64) downloadBlob(data.xlsxBase64, data.filename || `dotacion_${code}_pag${s.page}.xlsx`);
    } catch { /* silencioso */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, buildActiveFilters]);

  const exportFull = useCallback(() => {
    const s = tableStateRef.current;
    const tipo = 'dotacion-total';
    const params = new URLSearchParams({ periodo: periodoRef.current });
    if (s.sortBy) params.append('sortBy', s.sortBy);
    if (s.sortDir) params.append('sortDir', s.sortDir);
    Object.entries(buildActiveFilters()).forEach(([k, v]) => params.append(k, v));
    const a = document.createElement('a');
    a.href = `/api/hospitales/${code}/export/${tipo}?${params}`;
    a.download = `${tipo}_${code}_${periodoRef.current}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, buildActiveFilters]);

  // valores derivados
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(tableState.total / tableState.perPage)),
    [tableState.total, tableState.perPage]
  );
  const hasActiveFilters = useMemo(() => (
    Object.values(filters).some((v) => v.length > 0) ||
    Object.values(quickSearch).some((v) => v.trim()) ||
    rangoEdad.min || rangoEdad.max || antiguedad.min || antiguedad.max || estadoFilter
  ), [filters, quickSearch, rangoEdad, antiguedad, estadoFilter]);

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full ${showFilters ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      {/* Modal de Recorrida */}
      {recorridaOpen && (
        recorridaLoading ? (
          <BaseModal open onClose={() => setRecorridaOpen(false)} size="sm">
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          </BaseModal>
        ) : (
          <RecorridaEditorModal
            open
            hospital={code}
            hospitalName={hospitalName}
            existingRecorrida={recorridaData}
            draftTitulo={draftTitulo}
            draftContent={draftContent}
            onDraftChange={(t, c) => { setDraftTitulo(t); setDraftContent(c); }}
            onSaved={() => { reloadRecorrida(); }}
            onDelete={async () => {
              if (recorridaData?.id) {
                try { await apiDelete(`/api/recorridas/${recorridaData.id}`); } catch { /* silencioso */ }
              }
              draftInitRef.current = false;
              setDraftTitulo(`Recorrida ${code}`);
              setDraftContent('');
              await reloadRecorrida();
            }}
            onClose={() => setRecorridaOpen(false)}
            canEdit={!isDirector}
          />
        )
      )}
      {/* Barra superior */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            Volver
          </button>
          <span className="text-gray-300">/</span>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{hospitalName}</h1>
            <p className="text-xs text-gray-400 font-mono">{code}</p>
          </div>
          <div className="flex-1" />

          {/* Accesos rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              to={`/organigrama/${code}`}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
              title="Ver organigrama"
            >
              <ChartBarSquareIcon className="w-3.5 h-3.5" />
              Organigrama
            </Link>
            {!isDirector && (
              <button
                onClick={openRecorridaModal}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
                title="Ver/editar recorrida del hospital"
              >
                <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                Recorrida
              </button>
            )}
            {!isDirector && (
              <Link
                to={`/recorridas?hospital=${code}`}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
                title="Ver recorridas y minutas del hospital"
              >
                <BookOpenIcon className="w-3.5 h-3.5" />
                Seguimiento
              </Link>
            )}
            {!isDirector && (
              <Link
                to={`/pou/${code}`}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-colors"
                title="Ver POU"
              >
                <TableCellsIcon className="w-3.5 h-3.5" />
                POU
              </Link>
            )}
          </div>

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
          <button onClick={() => setShowFilters((v) => !v)}
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
        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-3">
            {MULTI_FILTERS.map(({ key, label }) => (
              <MultiSelectDropdown key={key} label={label}
                value={filters[key]} options={distinctValues[key] || []}
                onChange={(v) => setFilters((f) => ({ ...f, [key]: v }))} />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {QUICK_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="text" value={quickSearch[key]} placeholder={placeholder} className="form-input text-sm w-full"
                  onChange={(e) => setQuickSearch((q) => ({ ...q, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Edad</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={rangoEdad.min} min="0" max="120" placeholder="Mín."
                      className="form-input text-sm w-full"
                      onChange={(e) => setRangoEdad((r) => ({ ...r, min: e.target.value }))} />
                    <span className="text-gray-400 text-xs flex-shrink-0">–</span>
                    <input type="number" value={rangoEdad.max} min="0" max="120" placeholder="Máx."
                      className="form-input text-sm w-full"
                      onChange={(e) => setRangoEdad((r) => ({ ...r, max: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Antigüedad</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={antiguedad.min} min="0" placeholder="Mín."
                      className="form-input text-sm w-full"
                      onChange={(e) => setAntiguedad((a) => ({ ...a, min: e.target.value }))} />
                    <span className="text-gray-400 text-xs flex-shrink-0">–</span>
                    <input type="number" value={antiguedad.max} min="0" placeholder="Máx."
                      className="form-input text-sm w-full"
                      onChange={(e) => setAntiguedad((a) => ({ ...a, max: e.target.value }))} />
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
            {KPI_DEFS_DOTACION.map((def) => (
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
            {/* Controles de tabla */}
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {tableState.loading && <Spinner size="sm" />}
                <span>{tableState.columns.length} columnas</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-sm text-gray-500">
                  Mostrar
                  <select value={tableState.perPage} onChange={handlePerPageChange} className="form-input text-sm py-1 w-20">
                    {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  por página
                </label>
                <button onClick={() => setTablaAmpliada(true)} className="btn-secondary flex items-center gap-1.5 text-sm" title="Ver tabla ampliada">
                  <TableCellsIcon className="w-4 h-4" />Ampliar
                </button>
                <button onClick={exportPage} className="btn-secondary flex items-center gap-1.5 text-sm" title="Exportar página actual">
                  <ArrowDownTrayIcon className="w-4 h-4" />Página
                </button>
                <button onClick={exportFull} className="btn-secondary flex items-center gap-1.5 text-sm" title="Exportar todos los registros">
                  <ArrowDownTrayIcon className="w-4 h-4" />Completo
                </button>
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
