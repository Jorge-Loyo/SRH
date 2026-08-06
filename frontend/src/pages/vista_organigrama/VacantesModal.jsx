import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { tipoColor } from '../../utils/organigramaHelpers';
import BaseModal from '../../components/ui/modals/BaseModal';

// Agrupa las vacantes por régimen de empleo, orden alfabético de grupo.
function groupByRegimen(vacantes) {
  const map = new Map();
  vacantes.forEach(v => {
    const key = v.regimen_empleo || 'Sin Régimen';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(v);
  });
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'));
}

// Lista de todos los puestos sin persona asignada ("Vacante") del
// organigrama actual, agrupados por régimen de empleo, cada uno con su
// camino jerárquico para dar contexto (el nombre del puesto solo no
// alcanza para saber en qué área está).
export default function VacantesModal({ open, onClose, vacantes, sigla, onSelect }) {
  if (!open) return null;

  const handleSelect = (v) => {
    onSelect?.(v);
    onClose();
  };

  const groups = groupByRegimen(vacantes);
  return (
    <BaseModal open={open} onClose={onClose} size="xl">
      {/* Header custom con gradiente */}
      <div className="-mx-4 -mt-4 mb-4 flex items-center justify-between px-4 sm:px-6 py-3 rounded-t-xl bg-gradient-to-r from-amber-600 to-amber-500 border-b-2 border-amber-700">
        <span className="text-white font-bold text-base tracking-wide flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          Vacantes — {sigla} ({vacantes.length})
        </span>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1.5 rounded border border-white/25 bg-white/15 hover:bg-white/25 transition-colors"
        >
          Cerrar
        </button>
      </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-5 bg-gray-50">
          {vacantes.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No hay vacantes para este hospital.</p>
          ) : (
            <div className="space-y-5">
              {groups.map(([regimen, items]) => (
                <div key={regimen}>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    {regimen} <span className="text-gray-400 font-semibold normal-case">({items.length})</span>
                  </h3>
                  <ul className="space-y-2.5">
                    {items.map(v => (
                      <li
                        key={v.id}
                        onClick={() => handleSelect(v)}
                        className="bg-white border border-gray-200 rounded-lg px-4 py-3 cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
                      >
                        {v.path.length > 0 && (
                          <p className="text-xs text-gray-600 font-medium leading-snug mb-1.5">
                            {v.path.join(' › ')}
                          </p>
                        )}
                        <div className="flex items-start gap-2.5">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 mt-0.5 ${tipoColor(v.title)}`}>
                            {v.title}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-tight">{v.name}</p>
                            {v.id && (
                              <span className="inline-block text-[11px] font-mono font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded mt-1">
                                {v.id}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
