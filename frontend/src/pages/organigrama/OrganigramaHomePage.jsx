import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBarSquareIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { hospitals, hospitalsByCategory, CATEGORY_ORDER } from '../../data/hospitals-data';

const SECCIONES = [
  { id: 'nivel-central',     name: 'Nivel Central',     path: '/organigrama/nivel-central' },
  { id: 'atencion-primaria', name: 'Atención Primaria', path: '/organigrama/atencion-primaria' },
];

export default function OrganigramaHomePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filteredSecciones = q ? SECCIONES.filter(s => s.name.toLowerCase().includes(q)) : SECCIONES;
  const filteredHospitals = q
    ? hospitals.filter(h => h.name.toLowerCase().includes(q) || h.id.toLowerCase().includes(q))
    : null;

  const go = sigla => navigate(`/organigrama/${sigla.toUpperCase()}`);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-3">
          <ChartBarSquareIcon className="w-5 h-5 text-primary-700" />
          <h1 className="text-lg font-bold text-gray-900">Organigrama</h1>
        </div>
        <p className="text-sm text-gray-500 mb-3">Seleccioná una sección o un hospital para ver su estructura jerárquica</p>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar sección u hospital..." className="form-input text-sm w-full sm:w-72 py-1.5" autoFocus
        />
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {q ? (
          <div className="space-y-1.5">
            {filteredSecciones.map(s => (
              <button key={s.id} onClick={() => navigate(s.path)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-primary-100 bg-primary-50 hover:bg-primary-100 transition-colors text-left">
                <span className="font-semibold text-primary-800">{s.name}</span>
                <ArrowRightIcon className="w-4 h-4 text-primary-400" />
              </button>
            ))}
            {filteredHospitals?.map(h => (
              <button key={h.id} onClick={() => go(h.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-primary-50 hover:border-primary-200 transition-colors text-left">
                <div>
                  <span className="font-mono text-xs font-semibold text-primary-700 mr-2">{h.id}</span>
                  <span className="font-medium text-gray-900">{h.name}</span>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
              </button>
            ))}
            {filteredSecciones.length === 0 && filteredHospitals?.length === 0 && (
              <p className="text-center py-10 text-gray-400">Sin resultados</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Administración Central</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SECCIONES.map(s => (
                  <button key={s.id} onClick={() => navigate(s.path)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary-100 bg-primary-50 hover:bg-primary-100 hover:border-primary-200 transition-colors text-left">
                    <span className="text-sm font-semibold text-primary-800 flex-1">{s.name}</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {CATEGORY_ORDER.filter(cat => hospitalsByCategory[cat]).map(cat => (
              <div key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{cat}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {hospitalsByCategory[cat].map(h => (
                    <button key={h.id} onClick={() => go(h.id)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-primary-50 hover:border-primary-200 transition-colors text-left">
                      <span className="font-mono text-xs font-bold text-primary-700 w-16 flex-shrink-0">{h.id}</span>
                      <span className="text-sm font-medium text-gray-800 flex-1">{h.name}</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
