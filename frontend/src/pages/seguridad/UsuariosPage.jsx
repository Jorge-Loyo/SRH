import { useState, useEffect, useCallback } from 'react';
import { UsersIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import RoleBadge from '../../components/ui/RoleBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import BaseModal from '../../components/ui/modals/BaseModal';
import PageHeader from '../../components/shared/PageHeader';

const ROLES = ['admin', 'editor', 'viewer', 'director', 'gerencia', 'concursales', 'autoridades'];

const EMPTY_FORM = { username: '', email: '', password: '', role: 'viewer', hospital_code: '', role_alias: '', is_active: true };

function UserModal({ open, user, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!user;

  useEffect(() => {
    if (open) {
      setForm(user ? { username: user.username, email: user.email || '', password: '', role: user.role, hospital_code: user.hospital_code || '', role_alias: user.role_alias || '', is_active: user.is_active } : EMPTY_FORM);
      setError('');
    }
  }, [open, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        const body = { username: form.username, email: form.email, role: form.role, hospital_code: form.hospital_code, role_alias: form.role_alias || null };
        if (form.password) body.password = form.password;
        await apiPut(`/api/users/${user.id}`, body);
      } else {
        if (!form.password) { setError('Contraseña requerida'); setSaving(false); return; }
        await apiPost('/api/users', form);
      }
      onSave();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button form="user-form" type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Spinner size="sm" /> : <CheckIcon className="w-4 h-4" />}
            {isEdit ? 'Guardar' : 'Crear'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
          <input type="text" required value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            className="form-input w-full" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="form-input w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {isEdit ? '(dejar vacío para no cambiar)' : '*'}</label>
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            className="form-input w-full" minLength={isEdit ? 0 : 6} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="form-input w-full">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código hospital</label>
            <input type="text" value={form.hospital_code} onChange={e => setForm(f => ({ ...f, hospital_code: e.target.value }))}
              className="form-input w-full" placeholder="ej: HGACA" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alias del rol <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input type="text" maxLength={50} value={form.role_alias}
            onChange={e => setForm(f => ({ ...f, role_alias: e.target.value }))}
            className="form-input w-full" placeholder="ej: Jefa de Concursales..." />
        </div>
      </form>
    </BaseModal>
  );
}

export default function UsuariosPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState({ open: false, user: null });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/users');
      setUsers(data.data || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, []);

  const handleToggle = async (user) => {
    try {
      await apiPatch(`/api/users/${user.id}/toggle`);
      setUsers(us => us.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    } catch { /* silencioso */ }
  };

  const handleDelete = (user) => setConfirmDelete(user);

  const executeDelete = async () => {
    const user = confirmDelete;
    setConfirmDelete(null);
    setDeleteError('');
    try {
      await apiDelete(`/api/users/${user.id}`);
      setUsers(us => us.filter(u => u.id !== user.id));
    } catch (e) {
      setDeleteError(e.message);
      setTimeout(() => setDeleteError(''), 5000);
    }
  };

  const filtered = users.filter(u =>
    !search || u.username.toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <UserModal open={modal.open} user={modal.user} onClose={() => setModal({ open: false, user: null })} onSave={fetchUsers} />
      <ConfirmModal
        open={!!confirmDelete}
        title={`¿Eliminar al usuario "${confirmDelete?.username}"?`}
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        danger
        onConfirm={executeDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <div className="flex flex-col">
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
          <PageHeader
            icon={UsersIcon}
            title="Usuarios"
            actions={
              <button onClick={() => setModal({ open: true, user: null })}
                className="btn-primary flex items-center gap-1.5 text-sm">
                <PlusIcon className="w-4 h-4" />Nuevo usuario
              </button>
            }
          />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por usuario o email..." className="form-input text-sm w-full sm:w-72 py-1.5" />
        </div>

        <div className="overflow-auto px-4 py-3">
          {error && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
          {deleteError && <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{deleteError}</div>}

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['ID', 'Usuario', 'Email', 'Rol', 'Hospital', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, idx) => (
                    <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2 text-gray-400 text-xs">{u.id}</td>
                      <td className="px-3 py-2 font-semibold">{u.username}</td>
                      <td className="px-3 py-2 text-gray-600">{u.email || '-'}</td>
                      <td className="px-3 py-2"><RoleBadge role={u.role} /></td>
                      <td className="px-3 py-2 text-gray-500">{u.hospital_code || '-'}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => handleToggle(u)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer border ${
                            u.is_active ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setModal({ open: true, user: u })}
                            className="text-primary-600 hover:text-primary-800">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-700">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-gray-400">Sin resultados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
