import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { hospitals, hospitalsByCategory, CATEGORY_ORDER } from '../../data/hospitals-data';
import PageHeader from '../../components/shared/PageHeader';

export default function DotacionPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? hospitals.filter(h =>
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.id.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const handleSelect = (sigla) => {
    navigate(`/hospitales/${sigla}`);
  };

  return (
    <div className="flex flex-col">
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <PageHeader
          icon={ChartBarIcon}
          title="Dotación Total"
          subtitle="Seleccioná un hospital para ver su dotación completa"
        />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar hospital..." className="form-input text-sm w-72 py-1.5" autoFocus
        />
      </div>

      <div className="overflow-auto px-4 py-4">
        {filtered ? (
          /* Resultado de búsqueda */
          <div className="space-y-1.5">
            {filtered.map(h => (
              <button key={h.id} onClick={() => handleSelect(h.id)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-primary-50 hover:border-primary-200 transition-colors text-left">
                <div>
                  <span className="font-mono text-xs font-semibold text-primary-700 mr-2">{h.id}</span>
                  <span className="font-medium text-gray-900">{h.name}</span>
                </div>
                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center py-10 text-gray-400">Sin resultados</p>
            )}
          </div>
        ) : (
          /* Vista por categoría */
          <div className="space-y-6">
            {CATEGORY_ORDER.filter(cat => hospitalsByCategory[cat]).map(cat => (
              <div key={cat}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{cat}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {hospitalsByCategory[cat].map(h => (
                    <button key={h.id} onClick={() => handleSelect(h.id)}
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
