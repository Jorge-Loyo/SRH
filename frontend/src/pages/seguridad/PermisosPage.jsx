import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon, CheckIcon, ChevronRightIcon, TagIcon } from '@heroicons/react/24/outline';
import { apiGet, apiPut } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import RoleBadge from '../../components/ui/RoleBadge';

const TREE = [
  {
    key: 'general',
    label: 'General',
    items: [
      { key: 'Panel', label: 'Panel' },
    ],
  },
  {
    key: 'hospitales',
    label: 'Hospitales',
    items: [
      { key: 'Hospitales',          label: 'Lista de Hospitales' },
      { key: 'OrganizacionTabla',   label: 'Organización / Dotación' },
      { key: 'TablaAmpliada',       label: 'Tabla Ampliada' },
    ],
  },
  {
    key: 'organigrama',
    label: 'Organigrama',
    items: [
      { key: 'OrganigramaHome',     label: 'Inicio Organigrama' },
      { key: 'OrganigramaDetalle',  label: 'Detalle por Hospital' },
    ],
  },
  {
    key: 'tablas',
    label: 'Tablas BD',
    items: [
      { key: 'PersonasFull',        label: 'Personas' },
      { key: 'CargosFull',          label: 'Cargos' },
      { key: 'RolesFull',           label: 'Roles' },
      { key: 'SiglasFull',          label: 'Siglas' },
    ],
  },
  {
    key: 'recorridas',
    label: 'Recorridas',
    items: [
      { key: 'RecorridasHospitales', label: 'Lista de Recorridas' },
      { key: 'RecorridasDetalle',    label: 'Detalle / Minutas' },
    ],
  },
  {
    key: 'dotacion',
    label: 'Dotación y POU',
    items: [
      { key: 'DotacionTotal',       label: 'Dotación Total' },
      { key: 'POUDetalle',          label: 'POU por Hospital' },
      { key: 'POUComparativa',      label: 'POU Comparativa' },
    ],
  },
  {
    key: 'concursales',
    label: 'Concursales',
    items: [
      { key: 'BajasConsolidadas',   label: 'Bajas Consolidadas' },
      { key: 'SeguimientoCph',      label: 'Seguimiento CPH' },
      { key: 'SeguimientoCeetps',   label: 'Seguimiento CEETPS' },
      { key: 'TableroKpis',         label: 'Tablero KPIs' },
      { key: 'AltasCargo',          label: 'Altas de Cargo' },
      { key: 'ListaCargos',         label: 'Lista de Cargos' },
      { key: 'SubirData',           label: 'Importar Data' },
    ],
  },
  {
    key: 'director',
    label: 'Director',
    items: [
      { key: 'Director',            label: 'Mi Hospital' },
    ],
  },
];

const ROLES = [
  { value: 'admin',       label: 'Admin' },
  { value: 'editor',      label: 'Editor' },
  { value: 'viewer',      label: 'Viewer' },
  { value: 'director',    label: 'Director' },
  { value: 'concursales', label: 'Concursales' },
  { value: 'gerencia',    label: 'Gerencia' },
  { value: 'autoridades', label: 'Autoridades' },
];

function IndeterminateCheckbox({ checked, indeterminate, onChange, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="w-4 h-4 rounded accent-primary-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

function GrupoRow({ grupo, modulos, isAdmin, onToggleGrupo, onToggleItem }) {
  const [open, setOpen] = useState(false);
  const keys = grupo.items.map(i => i.key);
  const allOn  = isAdmin || keys.every(k => modulos.includes(k));
  const someOn = !isAdmin && keys.some(k => modulos.includes(k));

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Cabecera del grupo — clickeable para expandir */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${
          open ? 'bg-primary-50 border-b border-primary-100' : 'bg-gray-50 hover:bg-gray-100'
        }`}
        onClick={() => setOpen(v => !v)}
      >
        {/* Checkbox del grupo — stopPropagation para no colapsar al hacer click */}
        <div onClick={e => e.stopPropagation()}>
          <IndeterminateCheckbox
            checked={allOn}
            indeterminate={someOn && !allOn}
            onChange={() => onToggleGrupo(grupo)}
            disabled={isAdmin}
          />
        </div>

        <span className="flex-1 text-sm font-semibold text-gray-700">{grupo.label}</span>

        {/* Contador de activos */}
        <span className="text-xs text-gray-400 mr-1">
          {isAdmin ? keys.length : keys.filter(k => modulos.includes(k)).length}/{keys.length}
        </span>

        <ChevronRightIcon
          className={`w-4 h-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        />
      </div>

      {/* Items desplegables */}
      {open && (
        <div className="divide-y divide-gray-100">
          {grupo.items.map((item) => {
            const checked = isAdmin || modulos.includes(item.key);
            return (
              <label
                key={item.key}
                className={`flex items-center gap-3 px-4 py-2.5 pl-10 transition-colors ${
                  isAdmin ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-primary-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleItem(item.key)}
                  disabled={isAdmin}
                  className="w-4 h-4 rounded accent-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <span className={`text-sm ${checked ? 'text-gray-800' : 'text-gray-400'}`}>
                  {item.label}
                </span>
                {checked && !isAdmin && (
                  <span className="ml-auto text-xs text-primary-500 font-medium">Activo</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PermisosPage() {
  const navigate = useNavigate();
  const [permisos, setPermisos]     = useState({});
  const [loading, setLoading]       = useState(true);
  const [selectedRole, setSelectedRole] = useState('editor');
  const [dirty, setDirty]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');

  const fetchPermisos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/seguridad/permisos/modulos');
      setPermisos(data.permisos || {});
      setDirty(false);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPermisos(); }, [fetchPermisos]);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setDirty(false);
    setSaved(false);
  };

  const isAdmin = selectedRole === 'admin';
  const current = permisos[selectedRole] || [];

  const toggleItem = (key) => {
    if (isAdmin) return;
    setPermisos(prev => {
      const cur = prev[selectedRole] || [];
      const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];
      return { ...prev, [selectedRole]: next };
    });
    setDirty(true);
    setSaved(false);
  };

  const toggleGrupo = (grupo) => {
    if (isAdmin) return;
    const keys = grupo.items.map(i => i.key);
    const cur  = permisos[selectedRole] || [];
    const allOn = keys.every(k => cur.includes(k));
    setPermisos(prev => {
      const next = allOn
        ? cur.filter(k => !keys.includes(k))
        : [...new Set([...cur, ...keys])];
      return { ...prev, [selectedRole]: next };
    });
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut('/api/seguridad/permisos/modulos', {
        role: selectedRole,
        modulos: permisos[selectedRole] || [],
      });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalActivos = isAdmin
    ? TREE.flatMap(g => g.items).length
    : current.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-primary-700" />
            <h1 className="text-lg font-bold text-gray-900">Permisos por Rol</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate('/seguridad/roles')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TagIcon className="w-4 h-4" />
              Gestionar roles
            </button>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Rol:</label>
              <select
                value={selectedRole}
                onChange={e => handleRoleChange(e.target.value)}
                className="form-input text-sm py-1.5 w-40"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <RoleBadge role={selectedRole} />

            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {totalActivos} módulos activos
            </span>

            {!isAdmin && (
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <Spinner size="sm" /> : <CheckIcon className="w-4 h-4" />}
                Guardar cambios
              </button>
            )}

            {saved && (
              <span className="text-sm text-green-600 font-medium">✓ Guardado</span>
            )}
          </div>
        </div>

        {isAdmin && (
          <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
            El rol <strong>Admin</strong> tiene acceso total y no puede modificarse.
          </p>
        )}
        {dirty && (
          <p className="text-xs text-primary-600 mt-1.5">● Hay cambios sin guardar.</p>
        )}
      </div>

      {/* Árbol */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="max-w-lg space-y-2">
            {TREE.map(grupo => (
              <GrupoRow
                key={grupo.key}
                grupo={grupo}
                modulos={current}
                isAdmin={isAdmin}
                onToggleGrupo={toggleGrupo}
                onToggleItem={toggleItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
