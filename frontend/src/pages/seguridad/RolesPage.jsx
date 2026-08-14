import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TagIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon,
  ArrowLeftIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import RoleBadge from '../../components/ui/RoleBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import BaseModal from '../../components/ui/modals/BaseModal';

const SYSTEM_ROLES = ['admin', 'editor', 'viewer', 'director', 'gerencia', 'concursales', 'autoridades'];

const COLOR_OPTIONS = [
  { value: 'gray',   label: 'Gris',    cls: 'bg-gray-100 text-gray-600' },
  { value: 'blue',   label: 'Azul',    cls: 'bg-blue-100 text-blue-700' },
  { value: 'teal',   label: 'Verde',   cls: 'bg-teal-100 text-teal-700' },
  { value: 'purple', label: 'Violeta', cls: 'bg-purple-100 text-purple-700' },
  { value: 'amber',  label: 'Naranja', cls: 'bg-amber-100 text-amber-700' },
  { value: 'indigo', label: 'Índigo',  cls: 'bg-indigo-100 text-indigo-700' },
  { value: 'pink',   label: 'Rosa',    cls: 'bg-pink-100 text-pink-700' },
];

const EMPTY_FORM = { key: '', label: '', description: '', color: 'gray' };

function RolModal({ open, rol, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!rol;

  useEffect(() => {
    if (open) {
      setForm(rol
        ? { key: rol.key, label: rol.label, description: rol.description || '', color: rol.color || 'gray' }
        : EMPTY_FORM
      );
      setError('');
    }
  }, [open, rol]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.key.trim() || !form.label.trim()) { setError('Clave y nombre son requeridos'); return; }
    if (!/^[a-z0-9_]+$/.test(form.key)) { setError('La clave solo puede tener letras minúsculas, números y _'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await apiPut(`/api/seguridad/roles/${rol.key}`, { label: form.label, description: form.description, color: form.color });
      } else {
        await apiPost('/api/seguridad/roles', form);
      }
      onSave();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const colorCls = COLOR_OPTIONS.find(c => c.value === form.color)?.cls || 'bg-gray-100 text-gray-600';

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar rol' : 'Nuevo rol'}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button form="rol-form" type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Spinner size="sm" /> : <CheckIcon className="w-4 h-4" />}
            {isEdit ? 'Guardar' : 'Crear'}
          </button>
        </>
      }
    >
      <form id="rol-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clave (key) *</label>
          <input
            type="text" required value={form.key}
            onChange={e => setForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
            disabled={isEdit}
            className="form-input w-full disabled:bg-gray-50 disabled:text-gray-400"
            placeholder="ej: supervisor"
            autoFocus
          />
          {isEdit && <p className="text-xs text-gray-400 mt-1">La clave no puede modificarse.</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre visible *</label>
          <input
            type="text" required value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="form-input w-full"
            placeholder="ej: Supervisor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <input
            type="text" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="form-input w-full"
            placeholder="Descripción breve del rol..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color del badge</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.value} type="button"
                onClick={() => setForm(f => ({ ...f, color: c.value }))}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-all ${c.cls} ${
                  form.color === c.value ? 'border-primary-500 ring-1 ring-primary-400' : 'border-transparent'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Vista previa:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorCls}`}>
              {form.label || 'Rol'}
            </span>
          </div>
        </div>
      </form>
    </BaseModal>
  );
}

export default function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState({ open: false, rol: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/seguridad/roles');
      setRoles(data.roles || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const handleDelete = async () => {
    const rol = confirmDelete;
    setConfirmDelete(null);
    try {
      await apiDelete(`/api/seguridad/roles/${rol.key}`);
      setRoles(rs => rs.filter(r => r.key !== rol.key));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <RolModal
        open={modal.open}
        rol={modal.rol}
        onClose={() => setModal({ open: false, rol: null })}
        onSave={fetchRoles}
      />
      <ConfirmModal
        open={!!confirmDelete}
        title={`¿Eliminar el rol "${confirmDelete?.label}"?`}
        message="Los usuarios con este rol quedarán sin acceso. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/seguridad/permisos')}
                className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                title="Volver a Permisos"
              >
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <TagIcon className="w-5 h-5 text-primary-700" />
              <h1 className="text-lg font-bold text-gray-900">Gestión de Roles</h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/seguridad/permisos')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors"
              >
                <ShieldCheckIcon className="w-4 h-4" />
                Ver Permisos
              </button>
              <button
                onClick={() => setModal({ open: true, rol: null })}
                className="btn-primary flex items-center gap-1.5 text-sm"
              >
                <PlusIcon className="w-4 h-4" />
                Nuevo rol
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {error && (
            <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
          ) : (
            <div className="max-w-2xl space-y-2">
              {roles.map(rol => {
                const isSystem = SYSTEM_ROLES.includes(rol.key);
                const colorCls = COLOR_OPTIONS.find(c => c.value === rol.color)?.cls || 'bg-gray-100 text-gray-600';
                return (
                  <div
                    key={rol.key}
                    className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium min-w-[80px] text-center ${colorCls}`}>
                      {rol.label}
                    </span>

                    <code className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded font-mono">
                      {rol.key}
                    </code>

                    {rol.description && (
                      <span className="text-sm text-gray-500 flex-1 truncate">{rol.description}</span>
                    )}

                    {isSystem && (
                      <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        sistema
                      </span>
                    )}

                    <div className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => setModal({ open: true, rol })}
                        className="p-1.5 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {!isSystem && (
                        <button
                          onClick={() => setConfirmDelete(rol)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {roles.length === 0 && (
                <p className="text-center text-gray-400 py-10">No hay roles definidos.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
