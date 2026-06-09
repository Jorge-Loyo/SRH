import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheckIcon, XMarkIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { apiGet, apiPost, ApiError } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import { useAuth } from '../../auth/AuthContext';
import ConfirmModal from '../../components/ui/ConfirmModal';

const METHODS = ['', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const SOURCES = ['', 'api', 'admin', 'scheduler'];
const STATUS_OPTS = [
  { value: '', label: 'Todos' },
  { value: '200', label: '2xx OK' },
  { value: '400', label: '4xx Error cliente' },
  { value: '500', label: '5xx Error servidor' },
];

const STATUS_COLOR = {
  2: 'bg-green-100 text-green-700',
  4: 'bg-yellow-100 text-yellow-700',
  5: 'bg-red-100 text-red-700',
};

function statusColor(code) {
  const c = Math.floor(code / 100);
  return STATUS_COLOR[c] || 'bg-gray-100 text-gray-600';
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_INFO = {
  login_success: { emoji: '✅', label: 'Login OK',        bg: '#dcfce7', color: '#166534' },
  login_fail:    { emoji: '❌', label: 'Login fallido',    bg: '#fee2e2', color: '#991b1b' },
  login:         { emoji: '✅', label: 'Login',            bg: '#dcfce7', color: '#166534' }, // registros legacy
  logout:        { emoji: '🚪', label: 'Logout',           bg: '#f3f4f6', color: '#374151' },
  refresh:       { emoji: '🔄', label: 'Refresh',          bg: '#f3f4f6', color: '#6b7280' },
  create:        { emoji: '➕', label: 'Crear',            bg: '#dcfce7', color: '#166534' },
  update:        { emoji: '📝', label: 'Actualizar',       bg: '#dbeafe', color: '#1e40af' },
  delete:        { emoji: '🗑️', label: 'Eliminar',        bg: '#fee2e2', color: '#991b1b' },
  export:        { emoji: '📤', label: 'Exportar',         bg: '#f3e8ff', color: '#6b21a8' },
  purge:         { emoji: '🧹', label: 'Purgar',           bg: '#fef3c7', color: '#92400e' },
  token_revoke:  { emoji: '🔒', label: 'Revocar token',   bg: '#fce7f3', color: '#9f1239' },
};

const RESOURCE_MAP = {
  '/api/personas':    'Personas',
  '/api/cargos':      'Cargos',
  '/api/roles':       'Roles',
  '/api/siglas':      'Siglas',
  '/api/concursos':   'Concursos',
  '/api/concursales/bajas': 'Bajas Consolidadas',
  '/api/concursales/seguimiento-cph': 'Seguimiento CPH',
  '/api/recorridas':  'Recorridas',
  '/api/periodos':    'Períodos',
  '/api/bajas':       'Bajas de concursos',
  '/api/usuarios':    'Usuarios',
  '/api/audit':       'Auditoría',
  '/api/auth':        'Autenticación',
  '/api/seguridad':   'Seguridad',
  '/api/pou':         'POU',
  '/api/dotacion':    'Dotación',
  '/api/minutas':     'Minutas',
  '/admin':           'Panel Admin',
};

function resolveResource(resource, path) {
  if (resource) {
    const key = Object.keys(RESOURCE_MAP).find(k => resource.startsWith(k));
    if (key) return RESOURCE_MAP[key];
    return resource;
  }
  if (path) {
    const key = Object.keys(RESOURCE_MAP).find(k => path.startsWith(k));
    if (key) return RESOURCE_MAP[key];
  }
  return '-';
}

function ActionBadge({ action }) {
  const info = ACTION_INFO[action] || { emoji: '•', label: action || '-', bg: '#f3f4f6', color: '#374151' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: info.bg, color: info.color }}>
      <span>{info.emoji}</span>{info.label}
    </span>
  );
}

function RoleBadge({ role }) {
  const COLORS = {
    admin:    { bg: '#dbeafe', color: '#1e40af' },
    editor:   { bg: '#dcfce7', color: '#166534' },
    viewer:   { bg: '#f3e8ff', color: '#6b21a8' },
    director: { bg: '#fce7f3', color: '#9f1239' },
    gerencia: { bg: '#fef3c7', color: '#92400e' },
  };
  const c = COLORS[role] || { bg: '#f3f4f6', color: '#374151' };
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ background: c.bg, color: c.color }}>{role}</span>
  );
}

function renderValue(v) {
  if (v === null || v === undefined) return <span className="text-gray-400 italic">null</span>;
  if (typeof v === 'boolean') return <span className={v ? 'text-green-600' : 'text-red-500'}>{v ? 'true' : 'false'}</span>;
  if (typeof v === 'object') return <span className="font-mono text-xs text-gray-600">{JSON.stringify(v)}</span>;
  return <span>{String(v)}</span>;
}

function ChangesDetail({ changes }) {
  if (!changes) return null;
  let obj;
  try { obj = typeof changes === 'string' ? JSON.parse(changes) : changes; } catch { return <pre className="text-xs bg-white border rounded p-2 overflow-auto max-h-32 text-gray-700">{String(changes)}</pre>; }
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return <pre className="text-xs bg-white border rounded p-2 overflow-auto max-h-32 text-gray-700">{JSON.stringify(obj, null, 2)}</pre>;
  }
  const entries = Object.entries(obj);
  if (entries.length === 0) return null;
  return (
    <table className="text-xs w-full border-collapse mt-1">
      <thead>
        <tr className="bg-gray-100">
          <th className="px-2 py-1 text-left text-gray-500 font-medium border border-gray-200 w-1/4">Campo</th>
          <th className="px-2 py-1 text-left text-gray-500 font-medium border border-gray-200 w-3/8">Anterior</th>
          <th className="px-2 py-1 text-left text-gray-500 font-medium border border-gray-200 w-3/8">Nuevo</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, val]) => {
          const hasOldNew = val && typeof val === 'object' && ('old' in val || 'new' in val);
          return (
            <tr key={key} className="border-b border-gray-100">
              <td className="px-2 py-1 font-mono text-gray-600 border border-gray-200">{key}</td>
              {hasOldNew ? (
                <>
                  <td className="px-2 py-1 text-red-600 border border-gray-200">{renderValue(val.old)}</td>
                  <td className="px-2 py-1 text-green-700 border border-gray-200">{renderValue(val.new)}</td>
                </>
              ) : (
                <td colSpan={2} className="px-2 py-1 text-gray-700 border border-gray-200">{renderValue(val)}</td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AuditRow({ row, idx }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className={`cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-primary-50/30`}
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-3 py-1.5 text-gray-400 font-mono">{row.id}</td>
        <td className="px-3 py-1.5 whitespace-nowrap">{formatDate(row.created_at)}</td>
        <td className="px-3 py-1.5 font-medium">
          {row.user_username
            ? <span className="font-semibold text-gray-800">{row.user_username}</span>
            : <span className="text-gray-400 italic">sistema</span>}
          {row.user_role && <span className="ml-1.5"><RoleBadge role={row.user_role} /></span>}
        </td>
        <td className="px-3 py-1.5">
          {row.action ? <ActionBadge action={row.action} /> : <span className="text-gray-400">-</span>}
        </td>
        <td className="px-3 py-1.5 text-gray-700">{resolveResource(row.resource, row.path)}</td>
        <td className="px-3 py-1.5">
          {row.status ? (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(row.status)}`}>
              {row.status}
            </span>
          ) : '-'}
        </td>
        <td className="px-3 py-1.5 text-gray-400">
          {expanded ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-200">
          <td colSpan={7} className="px-6 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs mb-2">
              <div><span className="font-medium text-gray-500">Usuario: </span><span className="text-gray-800">{row.user_username || <span className="italic text-gray-400">sistema</span>}</span></div>
              {row.user_role && <div><span className="font-medium text-gray-500">Rol: </span><RoleBadge role={row.user_role} /></div>}
              {row.record_id && <div><span className="font-medium text-gray-500">ID registro: </span><span className="font-mono text-gray-700">{row.record_id}</span></div>}
              {row.ip && <div><span className="font-medium text-gray-500">IP: </span><span className="font-mono text-gray-700">{row.ip}</span></div>}
              {row.path && <div className="sm:col-span-2"><span className="font-medium text-gray-500">Ruta: </span><span className="font-mono text-gray-600 break-all">{row.method && <strong>{row.method} </strong>}{row.path}</span></div>}
            </div>
            {row.changes && (
              <div className="mt-2">
                <p className="text-xs font-medium text-gray-500 mb-1">Datos enviados / cambios:</p>
                <ChangesDetail changes={row.changes} />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditoriaPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, rows: [], total: 0, page: 1, error: null });
  const [filters, setFilters] = useState({ source: '', action: '', user: '', method: '', status: '', path: '', from: '', to: '' });
  const [pageSize, setPageSize] = useState(20);
  const [purging, setPurging] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState('');
  const tableRef = useRef(null);
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const fetchData = useCallback(async (overrides = {}) => {
    const page = overrides.page ?? stateRef.current.page;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const params = { page, pageSize, ...filtersRef.current };
      // Quitar campos vacíos
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const data = await apiGet('/api/audit', params);
      setState((s) => ({ ...s, loading: false, rows: data.rows || [], total: data.total || 0, page, error: null }));
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e.message }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  useEffect(() => { fetchData({ page: 1 }); }, []);
  useEffect(() => {
    const t = setTimeout(() => fetchData({ page: 1 }), 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pageSize]);

  const handlePurge = () => setConfirmPurge(true);

  const executePurge = async () => {
    setConfirmPurge(false);
    setPurging(true);
    setPurgeMsg('');
    try {
      const r = await apiPost('/api/audit/purge');
      setPurgeMsg(`Se eliminaron ${r.deleted} registros`);
      setTimeout(() => setPurgeMsg(''), 5000);
      fetchData({ page: 1 });
    } catch (e) {
      setPurgeMsg(`Error: ${e.message}`);
      setTimeout(() => setPurgeMsg(''), 5000);
    } finally {
      setPurging(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(state.total / pageSize));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ConfirmModal
        open={confirmPurge}
        title="¿Purgar logs de auditoría?"
        message="Se eliminarán los registros más antiguos. Esta acción no se puede deshacer."
        confirmLabel="Purgar"
        danger
        onConfirm={executePurge}
        onCancel={() => setConfirmPurge(false)}
      />
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-primary-700" />
            <h1 className="text-lg font-bold text-gray-900">Auditoría</h1>
          </div>
          <div className="flex items-center gap-3">
            {purgeMsg && (
              <span className={`text-xs px-2 py-1 rounded ${purgeMsg.startsWith('Error') ? 'text-red-600 bg-red-50' : 'text-green-700 bg-green-50'}`}>
                {purgeMsg}
              </span>
            )}
            {user?.role === 'admin' && (
              <button onClick={handlePurge} disabled={purging}
                className="btn-danger flex items-center gap-1.5 text-sm">
                {purging ? <Spinner size="sm" /> : <TrashIcon className="w-4 h-4" />}
                Purgar logs
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-3">
          {[
            { key: 'source', label: 'Fuente', type: 'select', opts: SOURCES.map(v => ({ v, l: v || 'Todas' })) },
            { key: 'method', label: 'Método', type: 'select', opts: METHODS.map(v => ({ v, l: v || 'Todos' })) },
          ].map(({ key, label, opts }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <select value={filters[key]} onChange={(e) => setFilters(f => ({ ...f, [key]: e.target.value }))}
                className="form-input text-sm w-full py-1.5">
                {opts.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          ))}
          {['action', 'user', 'path'].map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-1 capitalize">{key === 'user' ? 'Usuario' : key === 'path' ? 'Ruta' : 'Acción'}</label>
              <input type="text" value={filters[key]} onChange={(e) => setFilters(f => ({ ...f, [key]: e.target.value }))}
                className="form-input text-sm w-full py-1.5" placeholder="Buscar..." />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
            <input type="datetime-local" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))}
              className="form-input text-sm w-full py-1.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
            <input type="datetime-local" value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))}
              className="form-input text-sm w-full py-1.5" />
          </div>
          {Object.values(filters).some(Boolean) && (
            <div className="flex items-end">
              <button onClick={() => setFilters({ source: '', action: '', user: '', method: '', status: '', path: '', from: '', to: '' })}
                className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
                <XMarkIcon className="w-3.5 h-3.5" />Limpiar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 min-h-0">
        {state.error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700 flex-shrink-0">{state.error}</div>
        )}

        {state.loading && state.rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Spinner size="lg" /><span className="text-sm">Cargando logs...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 flex-shrink-0 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                {state.loading && <Spinner size="sm" />}
                <span>{state.total.toLocaleString('es-AR')} eventos</span>
              </div>
              <label className="flex items-center gap-1.5">
                Mostrar
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="form-input text-sm py-1 w-16">
                  {[20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>

            <div ref={tableRef} className="overflow-auto rounded-lg border border-gray-200 flex-1" style={{ minHeight: '200px' }}>
              <table className="min-w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['ID', 'Fecha', 'Usuario', 'Acción', 'Recurso', 'Status', ''].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((row, idx) => (
                    <AuditRow key={row.id} row={row} idx={idx} />
                  ))}
                  {state.rows.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">Sin eventos</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex-shrink-0">
              <Pagination currentPage={state.page} totalPages={totalPages} totalRecords={state.total}
                onPageChange={(p) => fetchData({ page: p })} loading={state.loading} tableRef={tableRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
