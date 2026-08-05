import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ClipboardDocumentListIcon, TableCellsIcon,
  PlusIcon, PencilIcon, TrashIcon, XMarkIcon,
  CheckIcon, ChevronDownIcon, ChevronRightIcon, ArrowsPointingOutIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import RichTextEditor from '../../components/ui/RichTextEditor';
import MinutaModal from '../../components/ui/MinutaModal';
import { useAuth } from '../../auth/AuthContext';
import { hospitals } from '../../data/hospitals-data';

// ─── Permisos ────────────────────────────────────────────────────────────────
// viewer: solo lectura (no puede crear, editar ni borrar — igual que en el sistema anterior)
const CAN_EDIT_ROLES   = ['admin', 'editor', 'gerencia'];
const CAN_DELETE_ROLES = ['admin', 'editor', 'gerencia'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Modal de Recorrida ───────────────────────────────────────────────────────
function RecorridaModal({ open, item, hospitalCode, onClose, onSave }) {
  const [form, setForm] = useState({ hospital_code: '', titulo: '', contenido_html: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!item;

  useEffect(() => {
    if (open) {
      setForm(item
        ? { hospital_code: item.hospital_code, titulo: item.titulo, contenido_html: item.contenido_html || '' }
        : { hospital_code: hospitalCode || '', titulo: '', contenido_html: '' });
      setError('');
    }
  }, [open, item, hospitalCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hospital_code || !form.titulo.trim()) { setError('Hospital y título son requeridos'); return; }
    setSaving(true);
    try {
      if (isEdit) await apiPut(`/api/recorridas/${item.id}`, form);
      else await apiPost('/api/recorridas', form);
      onSave();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/30 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 mb-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Editar recorrida' : 'Nueva recorrida'}</h2>
          <button onClick={onClose}><XMarkIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital *</label>
              <select value={form.hospital_code}
                onChange={e => setForm(f => ({ ...f, hospital_code: e.target.value }))}
                className="form-input w-full" required>
                <option value="">Seleccionar...</option>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.id} – {h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
              <input type="text" value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                className="form-input w-full" required maxLength={200} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
            <RichTextEditor
              value={form.contenido_html}
              onChange={html => setForm(f => ({ ...f, contenido_html: html }))}
              placeholder="Escribí el contenido de la recorrida..."
              minHeight={260}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <Spinner size="sm" /> : <CheckIcon className="w-4 h-4" />}
              {isEdit ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Editor inline de Recorrida ──────────────────────────────────────────────
function RecorridaEditor({ hospital, existingRecorrida, onSaved, onDelete, canEdit, canDelete }) {
  const [titulo, setTitulo] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitulo(existingRecorrida?.titulo || `Recorrida ${hospital}`);
    setContent(existingRecorrida?.contenido_html || '');
    setSaveError('');
    setSaved(false);
  }, [existingRecorrida?.id, hospital]);

  const handleSave = async () => {
    if (!titulo.trim()) { setSaveError('El título es requerido'); return; }
    setSaving(true);
    setSaveError('');
    try {
      if (existingRecorrida?.id) {
        await apiPut(`/api/recorridas/${existingRecorrida.id}`, {
          hospital_code: hospital, titulo, contenido_html: content,
        });
      } else {
        await apiPost('/api/recorridas', { hospital_code: hospital, titulo, contenido_html: content });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved();
    } catch (e) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const isNew = !existingRecorrida?.id;

  return (
    <div className="w-full space-y-4">
      {!isNew && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Última modificación: {fmtDate(existingRecorrida.updated_at || existingRecorrida.created_at)}
            {existingRecorrida.user?.username && ` · ${existingRecorrida.user.username}`}
          </p>
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
              <TrashIcon className="w-3.5 h-3.5" />Eliminar
            </button>
          )}
        </div>
      )}
      {isNew && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
          No hay recorrida para este hospital. Escribí el contenido y hace clic en “Crear Recorrida”.
        </div>
      )}
      {canEdit ? (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)}
              className="form-input w-full" placeholder="Título de la recorrida" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Contenido</label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Escribí el contenido de la recorrida..."
              minHeight={380}
            />
          </div>
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          {saved && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <CheckIcon className="w-4 h-4 flex-shrink-0" />Guardado con éxito
            </div>
          )}
          <div>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm">
              {saving && <Spinner size="sm" />}
              {isNew ? 'Crear Recorrida' : 'Guardar cambios'}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="font-semibold text-gray-900 mb-3">{existingRecorrida?.titulo}</h2>
          <RichTextEditor
            value={content || ''}
            readOnly
            minHeight={120}
          />
        </div>
      )}
    </div>
  );
}

function RecorridaCard({ r, expanded, onToggle, onEdit, onDelete, canEdit, canDelete }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <button className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 font-mono">
              {r.hospital_code}
            </span>
            <span className="font-medium text-gray-900 truncate">{r.titulo}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {fmtDate(r.created_at)} · {r.user?.username || `#${r.user_id}`}
            {r.updated_at && r.updated_at !== r.created_at && (
              <span className="ml-2 text-gray-300">· editado {fmtDate(r.updated_at)}</span>
            )}
          </div>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
            {canEdit && (
              <button onClick={onEdit} className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded">
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded">
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      {expanded && (
        <div
          className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-sm leading-relaxed recorrida-content"
          dangerouslySetInnerHTML={{ __html: r.contenido_html || '<em class="text-gray-400">Sin contenido</em>' }}
        />
      )}
    </div>
  );
}

// ─── Card de Minuta ───────────────────────────────────────────────────────────
function MinutaCard({ m, expanded, onToggle, onEdit, onDelete, onFullscreen, canEdit, canDelete }) {
  const rows = m.datos_tabla?.rows?.length ?? 0;
  const cols = m.datos_tabla?.columns?.length ?? 0;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <button className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700 font-mono">
              {m.hospital_code}
            </span>
            <span className="font-medium text-gray-900 truncate">{m.titulo}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {fmtDate(m.created_at)} · {m.user?.username || `#${m.user_id}`}
            <span className="ml-2">{rows} filas × {cols} columnas</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onFullscreen} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Pantalla completa">
            <ArrowsPointingOutIcon className="w-4 h-4" />
          </button>
          {canEdit && (
            <button onClick={onEdit} className="p-1.5 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded">
              <PencilIcon className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded">
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {expanded && m.datos_tabla && (
        <div className="border-t border-gray-100 overflow-auto bg-white" style={{ maxHeight: 320 }}>
          <MinutaTable datos={m.datos_tabla} />
        </div>
      )}
    </div>
  );
}

function MinutaTable({ datos }) {
  const { columns = [], rows = [] } = datos;
  return (
    <table className="min-w-full text-xs border-collapse">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          {columns.map(col => (
            <th key={col.id} className="px-3 py-2 text-left font-semibold text-gray-600 border-b border-r border-gray-200 whitespace-pre-wrap min-w-[140px]">
              {col.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
            {columns.map(col => (
              <td key={col.id} className="px-3 py-1.5 border-b border-r border-gray-100 whitespace-pre-wrap align-top min-w-[140px]">
                {row[col.id] || <span className="text-gray-300">—</span>}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={columns.length || 1} className="px-3 py-6 text-center text-gray-400">Sin filas</td></tr>
        )}
      </tbody>
    </table>
  );
}

// ─── Fullscreen de Minuta ─────────────────────────────────────────────────────
function MinutaFullscreen({ minuta, onClose }) {
  if (!minuta) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-6 md:p-12">
      <div className="bg-white rounded-xl shadow-2xl flex flex-col w-full h-full max-w-7xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-primary-800 text-white flex-shrink-0">
          <div>
            <p className="font-bold text-sm">{minuta.titulo}</p>
            <p className="text-xs text-primary-200 font-mono">
              {minuta.hospital_code} · {minuta.datos_tabla?.rows?.length ?? 0} filas × {minuta.datos_tabla?.columns?.length ?? 0} cols
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-primary-200 hover:text-white">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {minuta.datos_tabla && <MinutaTable datos={minuta.datos_tabla} />}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RecorridasPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const canEdit = CAN_EDIT_ROLES.includes(user?.role);
  const canDelete = CAN_DELETE_ROLES.includes(user?.role);

  // Tab activa
  const [tab, setTab] = useState('recorridas'); // 'recorridas' | 'minutas'

  // Filtro de hospital (pre-aplicado desde URL si viene de OrganizacionTabla)
  const initialHospital = searchParams.get('hospital') || '';
  const [hospitalFilter, setHospitalFilter] = useState(initialHospital);

  // ── Estado Recorridas ───────────────────────────────────────────────────────
  const [recState, setRecState] = useState({ loading: true, rows: [], total: 0, page: 1, error: null });
  const [recExpanded, setRecExpanded] = useState({});
  const [recModal, setRecModal] = useState({ open: false, item: null });
  const [recDel, setRecDel] = useState(null);
  const [recDeleteError, setRecDeleteError] = useState('');

  // ── Estado Minutas ──────────────────────────────────────────────────────────
  const [minState, setMinState] = useState({ loading: true, rows: [], total: 0, page: 1, error: null });
  const [minExpanded, setMinExpanded] = useState({});
  const [minModal, setMinModal] = useState({ open: false, item: null });
  const [minInlineEdit, setMinInlineEdit] = useState(null); // minuta que se está editando inline (null = modo crear)
  const [minDel, setMinDel] = useState(null);
  const [minFullscreen, setMinFullscreen] = useState(null);
  const minStateRef = useRef(minState);
  useEffect(() => { minStateRef.current = minState; }, [minState]);

  // ── Fetch Recorridas ────────────────────────────────────────────────────────
  const fetchRecorridas = useCallback(async () => {
    setRecState(s => ({ ...s, loading: true, error: null }));
    try {
      // Con hospital: limit 1 (solo hay una por hospital)
      // Sin hospital: limit 200 para ver todas
      const params = hospitalFilter
        ? { page: 1, limit: 1, hospital_code: hospitalFilter }
        : { page: 1, limit: 200 };
      const data = await apiGet('/api/recorridas', params);
      setRecState(s => ({ ...s, loading: false, rows: data.rows || data.data || [], total: data.total || 0, page: 1, error: null }));
    } catch (e) {
      setRecState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, [hospitalFilter]);

  // ── Fetch Minutas ───────────────────────────────────────────────────────────
  const fetchMinutas = useCallback(async (overrides = {}) => {
    const page = overrides.page ?? minStateRef.current.page;
    setMinState(s => ({ ...s, loading: true, error: null }));
    try {
      const params = { page, limit: 20 };
      if (hospitalFilter) params.hospital_code = hospitalFilter;
      const data = await apiGet('/api/minutas', params);
      setMinState(s => ({ ...s, loading: false, rows: data.rows || data.data || [], total: data.total || 0, page, error: null }));
    } catch (e) {
      setMinState(s => ({ ...s, loading: false, error: e.message }));
    }
  }, [hospitalFilter]);

  // Cargar ambos al montar o cambiar hospital
  useEffect(() => { fetchRecorridas(); }, [hospitalFilter, fetchRecorridas]);
  useEffect(() => { fetchMinutas({ page: 1 }); }, [hospitalFilter, fetchMinutas]);

  // ── Handlers Recorridas ─────────────────────────────────────────────────────
  const handleDeleteRec = async () => {
    if (!recDel) return;
    try {
      await apiDelete(`/api/recorridas/${recDel.id}`);
      setRecDel(null);
      fetchRecorridas();
    } catch (e) {
      setRecDel(null);
      setRecDeleteError(e.message);
      setTimeout(() => setRecDeleteError(''), 5000);
    }
  };

  // ── Handlers Minutas ────────────────────────────────────────────────────────
  const [minDeleteError, setMinDeleteError] = useState('');
  const handleDeleteMin = async () => {
    if (!minDel) return;
    try {
      await apiDelete(`/api/minutas/${minDel.id}`);
      setMinDel(null);
      fetchMinutas({ page: minStateRef.current.page });
    } catch (e) {
      setMinDel(null);
      setMinDeleteError(e.message);
      setTimeout(() => setMinDeleteError(''), 5000);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Modales */}
      <RecorridaModal
        open={recModal.open}
        item={recModal.item}
        hospitalCode={hospitalFilter || ''}
        onClose={() => setRecModal({ open: false, item: null })}
        onSave={() => { setRecModal({ open: false, item: null }); fetchRecorridas(); }}
      />
      <MinutaModal
        open={minModal.open}
        editData={minModal.item}
        hospitalCode={hospitalFilter || ''}
        onClose={() => setMinModal({ open: false, item: null })}
        onSave={() => fetchMinutas({ page: 1 })}
      />
      <MinutaFullscreen minuta={minFullscreen} onClose={() => setMinFullscreen(null)} />

      {/* Confirmación eliminar recorrida */}
      {recDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <p className="font-bold text-gray-900 mb-2">¿Eliminar recorrida?</p>
            <p className="text-sm text-gray-500 mb-5">"{recDel.titulo}" — esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRecDel(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDeleteRec} className="btn-primary bg-red-600 hover:bg-red-700 border-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación eliminar minuta */}
      {minDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <p className="font-bold text-gray-900 mb-2">¿Eliminar minuta?</p>
            <p className="text-sm text-gray-500 mb-5">"{minDel.titulo}" — esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setMinDel(null)} className="btn-secondary">Cancelar</button>
              <button onClick={handleDeleteMin} className="btn-primary bg-red-600 hover:bg-red-700 border-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-0 border-b border-gray-200 bg-white">
          {/* Título + filtro + botón */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              {initialHospital && (
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-700 transition-colors mr-1">
                  <ArrowLeftIcon className="w-4 h-4" />
                </button>
              )}
              {tab === 'recorridas'
                ? <ClipboardDocumentListIcon className="w-5 h-5 text-primary-700" />
                : <TableCellsIcon className="w-5 h-5 text-teal-700" />}
              <h1 className="text-lg font-bold text-gray-900">
                {tab === 'recorridas' ? 'Recorridas' : 'Minutas'}
              </h1>
              {tab === 'recorridas' && recState.total > 0 && (
                <span className="text-sm text-gray-400">({recState.total})</span>
              )}
              {tab === 'minutas' && minState.total > 0 && (
                <span className="text-sm text-gray-400">({minState.total})</span>
              )}
            </div>
          </div>

          {/* Filtro hospital */}
          <div className="mb-3">
            <select
              value={hospitalFilter}
              onChange={e => setHospitalFilter(e.target.value)}
              className="form-input text-sm w-full sm:w-64 py-1.5"
            >
              <option value="">Todos los hospitales</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.id} – {h.name}</option>)}
            </select>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 -mb-px">
            <button
              onClick={() => setTab('recorridas')}
              className={[
                'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
                tab === 'recorridas'
                  ? 'border-primary-600 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              Recorridas
              {recState.rows.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">({recState.rows.length})</span>
              )}
            </button>
            <button
              onClick={() => setTab('minutas')}
              className={[
                'px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors',
                tab === 'minutas'
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              Minutas
              {minState.rows.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">({minState.rows.length})</span>
              )}
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-4 py-3">
          {/* ── Tab Recorridas ── */}
          {tab === 'recorridas' && (
            <>
              {recState.error && (
                <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{recState.error}</div>
              )}
              {recDeleteError && (
                <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{recDeleteError}</div>
              )}
              {!hospitalFilter ? (
                // ── Lista de todas las recorridas ──
                recState.loading ? (
                  <div className="flex justify-center py-16"><Spinner size="lg" /></div>
                ) : (
                  <div className="space-y-2">
                    {recState.rows.map(r => (
                      <RecorridaCard
                        key={r.id}
                        r={r}
                        expanded={!!recExpanded[r.id]}
                        onToggle={() => setRecExpanded(p => ({ ...p, [r.id]: !p[r.id] }))}
                        onEdit={() => setRecModal({ open: true, item: r })}
                        onDelete={() => setRecDel(r)}
                        canEdit={canEdit}
                        canDelete={canDelete}
                      />
                    ))}
                    {recState.rows.length === 0 && (
                      <div className="text-center py-16 text-gray-400">
                        <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                        <p>No hay recorridas cargadas</p>
                      </div>
                    )}
                  </div>
                )
              ) : recState.loading ? (
                <div className="flex justify-center py-16"><Spinner size="lg" /></div>
              ) : (
                <RecorridaEditor
                  hospital={hospitalFilter}
                  existingRecorrida={recState.rows[0] || null}
                  onSaved={() => fetchRecorridas()}
                  onDelete={() => setRecDel(recState.rows[0] || null)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              )}
            </>
          )}

          {/* ── Tab Minutas ── */}
          {tab === 'minutas' && (
            <>
              {minState.error && (
                <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{minState.error}</div>
              )}
              {minState.loading && minState.rows.length === 0 ? (
                <div className="flex justify-center py-16"><Spinner size="lg" /></div>
              ) : hospitalFilter && canEdit ? (
                /* ── Con hospital seleccionado y permisos: lista + editor inline ── */
                <div className="space-y-4">
                  {/* Lista de minutas existentes */}
                  {minState.rows.length > 0 && (
                    <div className="space-y-2">
                      {minState.rows.map(m => (
                        <MinutaCard
                          key={m.id}
                          m={m}
                          expanded={!!minExpanded[m.id]}
                          onToggle={() => setMinExpanded(p => ({ ...p, [m.id]: !p[m.id] }))}
                          onEdit={() => setMinInlineEdit(m)}
                          onDelete={() => setMinDel(m)}
                          onFullscreen={() => setMinFullscreen(m)}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      ))}
                    </div>
                  )}
                  {minState.loading && <div className="flex justify-center py-2"><Spinner /></div>}
                  {/* Editor inline (crear / editar) */}
                  <MinutaModal
                    inline
                    open={true}
                    editData={minInlineEdit}
                    hospitalCode={hospitalFilter}
                    onClose={() => setMinInlineEdit(null)}
                    onSave={() => { fetchMinutas({ page: 1 }); setMinInlineEdit(null); }}
                  />
                </div>
              ) : (
                /* ── Sin hospital o sin permisos: lista simple ── */
                <div className="space-y-2">
                  {minState.rows.map(m => (
                    <MinutaCard
                      key={m.id}
                      m={m}
                      expanded={!!minExpanded[m.id]}
                      onToggle={() => setMinExpanded(p => ({ ...p, [m.id]: !p[m.id] }))}
                      onEdit={() => setMinModal({ open: true, item: m })}
                      onDelete={() => setMinDel(m)}
                      onFullscreen={() => setMinFullscreen(m)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  ))}
                  {minState.rows.length === 0 && !minState.loading && (
                    <div className="text-center py-16 text-gray-400">
                      Sin minutas{hospitalFilter ? ' para este hospital' : ''}
                    </div>
                  )}
                  {minState.loading && <div className="flex justify-center py-4"><Spinner /></div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
