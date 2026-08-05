import { XMarkIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { tipoColor } from '../../utils/organigramaHelpers';

function formatFecha(d) {
  if (!d) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [y, m, dd] = d.split('T')[0].split('-');
    return `${dd}/${m}/${y}`;
  }
  return d;
}

function formatCuil(cuil) {
  const digits = String(cuil ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return cuil ? String(cuil) : '—';
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

// Ficha rápida de una persona asignada a un puesto del organigrama,
// con los datos que ya vienen embebidos en /api/organigrama (sin
// pedir nada nuevo al backend al hacer click).
export default function PersonaModal({ open, onClose, data }) {
  if (!open || !data) return null;
  const { persona, nodeName, nodeTitle } = data;

  const campos = [
    { label: 'CUIL', value: formatCuil(persona.cuil) },
    { label: 'Fecha de nacimiento', value: formatFecha(persona.fecha_nacimiento) },
    { label: 'Edad', value: persona.edad ?? '—' },
    { label: 'Antigüedad', value: persona.antiguedad || '—' },
    { label: 'En el cargo desde', value: formatFecha(persona.cargo_desde) },
    { label: 'En el cargo hasta', value: persona.cargo_hasta ? formatFecha(persona.cargo_hasta) : 'Actual' },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-2 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full sm:w-[480px] max-w-[95vw] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 rounded-t-xl bg-gradient-to-r from-primary-700 to-primary-600 border-b-2 border-primary-800">
          <span className="text-white font-bold text-base tracking-wide flex items-center gap-2 min-w-0">
            <UserCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{persona.nombre}</span>
          </span>
          <button
            onClick={onClose}
            className="flex-shrink-0 flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1.5 rounded border border-white/25 bg-white/15 hover:bg-white/25 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
            Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5">
          {nodeName && (
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              {nodeTitle && (
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${tipoColor(nodeTitle)}`}>
                  {nodeTitle}
                </span>
              )}
              <span className="text-sm text-gray-600 font-medium">
                {persona.cargo ? `${persona.cargo} · ` : ''}{nodeName}
              </span>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-4">
            {campos.map(c => (
              <div key={c.label}>
                <dt className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">{c.label}</dt>
                <dd className="text-sm text-gray-900 font-semibold mt-0.5">{c.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
