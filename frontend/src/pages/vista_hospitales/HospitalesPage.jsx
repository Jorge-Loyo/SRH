import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BuildingOffice2Icon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { apiGet } from '../../api/client';
import { hospitals, hospitalsByCategory, CATEGORY_ORDER } from '../../data/hospitals-data';
import Spinner from '../../components/ui/Spinner';

// Caché en memoria para los períodos (TTL 5 minutos)
const _periodoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getPeriodo(hospitalId) {
  const cached = _periodoCache.get(hospitalId);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.periodo;
  try {
    const data = await apiGet('/api/periodos', { hospital: hospitalId, limit: 1 });
    const periodo = data?.recommended || data?.periodos?.[0] || null;
    if (periodo) _periodoCache.set(hospitalId, { periodo, ts: Date.now() });
    return periodo;
  } catch {
    return null;
  }
}

function HospitalCard({ hospital, onClick, loading }) {
  return (
    <button
      onClick={() => onClick(hospital)}
      disabled={loading}
      className={[
        'group flex flex-col gap-1 p-4 rounded-lg border text-left transition-all',
        loading
          ? 'bg-gray-50 border-gray-200 cursor-wait opacity-60'
          : 'bg-white border-gray-200 hover:border-primary-500 hover:shadow-md hover:bg-primary-50 cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-start gap-2">
        <BuildingOffice2Icon
          className={`w-5 h-5 mt-0.5 shrink-0 ${loading ? 'text-gray-400' : 'text-primary-700 group-hover:text-primary-800'}`}
        />
        <span className="text-sm font-semibold text-gray-800 group-hover:text-primary-800 leading-snug">
          {hospital.name}
        </span>
      </div>
      <span className="ml-7 text-xs font-mono text-gray-400">{hospital.id}</span>
    </button>
  );
}

function CategorySection({ category, hospitalList, onHospitalClick, loadingId }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 w-full text-left mb-3 group"
      >
        {collapsed ? (
          <ChevronRightIcon className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-400" />
        )}
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-gray-700">
          {category}
        </h2>
        <span className="text-xs text-gray-400">({hospitalList.length})</span>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {hospitalList.map((h) => (
            <HospitalCard
              key={h.id}
              hospital={h}
              onClick={onHospitalClick}
              loading={loadingId === h.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HospitalesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  // Pre-cargar períodos en background para los primeros hospitales
  useEffect(() => {
    const first = hospitals.slice(0, 10);
    first.forEach((h) => getPeriodo(h.id).catch(() => {}));
  }, []);

  const handleHospitalClick = useCallback(
    async (hospital) => {
      setLoadingId(hospital.id);
      setError(null);
      try {
        const periodo = await getPeriodo(hospital.id);
        const query = periodo ? `?periodo=${encodeURIComponent(periodo)}` : '';
        navigate(`/hospitales/${hospital.id}${query}`);
      } catch {
        setError('No se pudo cargar el período. Intente de nuevo.');
      } finally {
        setLoadingId(null);
      }
    },
    [navigate]
  );

  // Filtrado por búsqueda
  const searchLower = search.trim().toLowerCase();
  const filteredByCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    const list = (hospitalsByCategory[cat] || []).filter(
      (h) =>
        !searchLower ||
        h.name.toLowerCase().includes(searchLower) ||
        h.id.toLowerCase().includes(searchLower)
    );
    if (list.length > 0) acc[cat] = list;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hospitales</h1>
        <p className="text-sm text-gray-500 mt-1">
          Seleccioná un hospital para ver su organización de dotación
        </p>
      </div>

      {/* Buscador */}
      <div className="mb-6 max-w-sm">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar hospital..."
          className="form-input w-full"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loadingId && (
        <div className="mb-4 flex items-center gap-2 text-sm text-primary-700">
          <Spinner size="sm" />
          Cargando período más reciente...
        </div>
      )}

      {/* Categorías con hospitales */}
      {Object.keys(filteredByCategory).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron hospitales</p>
        </div>
      ) : (
        CATEGORY_ORDER.filter((c) => filteredByCategory[c]).map((cat) => (
          <CategorySection
            key={cat}
            category={cat}
            hospitalList={filteredByCategory[cat]}
            onHospitalClick={handleHospitalClick}
            loadingId={loadingId}
          />
        ))
      )}
    </div>
  );
}
