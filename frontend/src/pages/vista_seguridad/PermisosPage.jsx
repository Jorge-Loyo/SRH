import { useState, useEffect, useCallback } from 'react';
import { LockClosedIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiGet, apiPut } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import RoleBadge from '../../components/ui/RoleBadge';

const BOOL_FIELDS = [
  { key: 'can_read_all', label: 'Leer todo' },
  { key: 'can_create', label: 'Crear' },
  { key: 'can_update', label: 'Editar' },
  { key: 'can_delete', label: 'Eliminar' },
  { key: 'can_alter_structure', label: 'Modificar estructura' },
  { key: 'can_manage_users', label: 'Gestionar usuarios' },
  { key: 'can_view_audit', label: 'Ver auditoría' },
  { key: 'filter_by_hospital', label: 'Filtrar por hospital' },
];

function BoolCell({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
        value ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      }`}>
      {value ? <CheckIcon className="w-4 h-4" /> : <XMarkIcon className="w-4 h-4" />}
    </button>
  );
}

export default function PermisosPage() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState({});
  const [dirty, setDirty] = useState({});

  const fetchPermisos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/seguridad/permisos');
      setPermissions(data.permissions || []);
      setDirty({});
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPermisos(); }, []);

  const handleChange = (id, field, value) => {
    setPermissions(ps => ps.map(p => p.id === id ? { ...p, [field]: value } : p));
    setDirty(d => ({ ...d, [id]: true }));
  };

  const handleSave = async (perm) => {
    setSaving(perm.id);
    setSaveError(e => ({ ...e, [perm.id]: '' }));
    try {
      await apiPut(`/api/seguridad/permisos/${perm.id}`, perm);
      setDirty(d => { const n = { ...d }; delete n[perm.id]; return n; });
    } catch (e) {
      setSaveError(prev => ({ ...prev, [perm.id]: e.message }));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <LockClosedIcon className="w-5 h-5 text-primary-700" />
          <h1 className="text-lg font-bold text-gray-900">Permisos por Rol</h1>
        </div>
        <p className="text-sm text-gray-500 mt-1">Haz clic en cada celda para cambiar el permiso. Guarda cada fila por separado.</p>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Rol</th>
                  {BOOL_FIELDS.map(f => (
                    <th key={f.key} className="px-3 py-3 text-center text-xs font-semibold text-gray-600 whitespace-nowrap">{f.label}</th>
                  ))}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">Guardar</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm, idx) => (
                  <tr key={perm.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${dirty[perm.id] ? 'outline outline-2 outline-primary-200 outline-offset-[-2px]' : ''}`}>
                    <td className="px-4 py-2.5"><RoleBadge role={perm.role} /></td>
                    {BOOL_FIELDS.map(f => (
                      <td key={f.key} className="px-3 py-2.5 text-center">
                        <div className="flex justify-center">
                          <BoolCell value={!!perm[f.key]} onChange={(v) => handleChange(perm.id, f.key, v)} />
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center">
                      {dirty[perm.id] && (
                        <button onClick={() => handleSave(perm)} disabled={saving === perm.id}
                          className="btn-primary text-xs py-1 px-3 flex items-center gap-1 mx-auto">
                          {saving === perm.id ? <Spinner size="sm" /> : <CheckIcon className="w-3.5 h-3.5" />}
                          Guardar
                        </button>
                      )}
                      {saveError[perm.id] && (
                        <p className="text-xs text-red-600 mt-1">{saveError[perm.id]}</p>
                      )}
                    </td>
                  </tr>
                ))}
                {permissions.length === 0 && (
                  <tr><td colSpan={BOOL_FIELDS.length + 2} className="px-4 py-10 text-center text-gray-400">Sin permisos configurados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
