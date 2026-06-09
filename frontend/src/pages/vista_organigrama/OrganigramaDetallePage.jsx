import { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChartBarSquareIcon, ArrowLeftIcon, UserIcon,
  ChevronRightIcon, ChevronDownIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { apiGet } from '../../api/client';
import Spinner from '../../components/ui/Spinner';
import PeriodoSelect from '../../components/ui/PeriodoSelect';
import OrganigramaFlowView from './OrganigramaFlowView';

// Paleta de colores por tipo de nodo
const TIPO_COLOR = {
  Ministerio:           'bg-gray-700 text-white',
  AREA:                 'bg-gray-600 text-white',
  'SSEC/DIREJE':        'bg-gray-500 text-white',
  GO:                   'bg-primary-700 text-white',
  SGO:                  'bg-primary-600 text-white',
  DG:                   'bg-primary-500 text-white',
  DHOS:                 'bg-teal-600 text-white',
  SDHOS:                'bg-teal-500 text-white',
  REGIMEN:              'bg-amber-500 text-white',
  DEPT:                 'bg-indigo-600 text-white',
  'DEPT CA':            'bg-indigo-500 text-white',
  DIV:                  'bg-purple-600 text-white',
  'DIV CA':             'bg-purple-500 text-white',
  UNID:                 'bg-sky-600 text-white',
  SECCION:              'bg-sky-500 text-white',
  SECC:                 'bg-sky-500 text-white',
};
function tipoColor(tipo) {
  return TIPO_COLOR[tipo] || 'bg-gray-200 text-gray-700';
}

// Un nodo del árbol (recursivo)
const TreeNode = memo(function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 3);
  const hasChildren = node.children && node.children.length > 0;
  const indent = depth * 20;

  return (
    <div>
      <div
        className={`flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 transition-colors
          ${depth === 0 ? 'mb-1' : ''}`}
        style={{ marginLeft: indent }}>
        {/* Toggle / Spacer */}
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center rounded ${hasChildren ? 'text-gray-500 hover:text-gray-800' : 'text-transparent cursor-default'}`}>
          {hasChildren
            ? (open ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />)
            : null}
        </button>

        {/* Tipo badge */}
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 mt-0.5 ${tipoColor(node.title)}`}>
          {node.title}
        </span>

        {/* Nombre + persona */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-tight">{node.name}</p>
          {node.persona ? (
            <p className="text-xs text-primary-700 flex items-center gap-1 mt-0.5">
              <UserIcon className="w-3 h-3 flex-shrink-0" />
              {node.persona.nombre}
              {node.persona.cargo && <span className="text-gray-400 ml-1">· {node.persona.cargo}</span>}
            </p>
          ) : (
            <p className="text-xs text-gray-300 mt-0.5 italic">Vacante</p>
          )}
          {node.id && (
            <p className="text-[10px] text-gray-300 font-mono mt-0.5">{node.id}</p>
          )}
        </div>
      </div>

      {/* Hijos */}
      {hasChildren && open && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
});

export default function OrganigramaDetallePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [periodos, setPeriodos] = useState([]);
  const [periodosMetadata, setPeriodosMetadata] = useState([]);
  const [periodo, setPeriodo] = useState('');
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [viewMode, setViewMode] = useState('arbol'); // 'arbol' | 'diagrama'
  const [resetKey, setResetKey] = useState(0);

  const sigla = code?.toUpperCase() || '';

  // Cargar períodos disponibles (usando pou o periodos del hospital)
  useEffect(() => {
    if (!sigla) return;
    apiGet('/api/periodos', { hospital: sigla, limit: 12 })
      .then(d => {
        const list = d?.items || [];
        setPeriodos([...new Set(list)]);
        setPeriodosMetadata(d?.periodsMetadata || []);
        const initial = d?.recommended || (list.length > 0 ? list[0] : '');
        if (initial) setPeriodo(initial);
      })
      .catch(() => {});
  }, [sigla]);

  const fetchData = useCallback(async () => {
    if (!sigla) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const params = { sigla };
      if (periodo) params.periodo = periodo;
      const data = await apiGet('/api/organigrama', params);
      if (data.error && !data.data) {
        setState({ loading: false, data: null, error: data.error });
      } else {
        setState({ loading: false, data: data.data || data, error: null });
      }
    } catch (e) {
      setState({ loading: false, data: null, error: e.message });
    }
  }, [sigla, periodo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeftIcon className="w-4 h-4" />Volver
          </button>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ChartBarSquareIcon className="w-5 h-5 text-primary-700" />
            <h1 className="text-lg font-bold text-gray-900">Organigrama – {sigla}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Switcher de vistas */}
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {[{ key: 'arbol', label: 'Árbol' }, { key: 'diagrama', label: 'Diagrama' }].map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    viewMode === v.key
                      ? 'bg-white shadow font-semibold text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {v.label}
                </button>
              ))}
            </div>
            {/* Botón Reiniciar */}
            <button
              onClick={() => setResetKey(k => k + 1)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
              title="Reiniciar vista">
              <ArrowPathIcon className="w-3.5 h-3.5" />
              Reiniciar
            </button>
            <label className="text-sm font-medium text-gray-600">Período</label>
            <PeriodoSelect
              value={periodo}
              onChange={setPeriodo}
              items={periodos}
              metadata={periodosMetadata}
            />
          </div>
        </div>
      </div>

      {/* Contenido — cambia según viewMode */}
      <div className={`flex-1 ${
        viewMode === 'diagrama' ? 'overflow-hidden' : 'overflow-auto'
      }`}>
        {state.error && (
          <div className="m-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">{state.error}</div>
        )}
        {state.loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : state.data ? (
          viewMode === 'diagrama' ? (
            <OrganigramaFlowView data={state.data} resetKey={resetKey} />
          ) : (
            <div className="px-4 py-4 max-w-4xl">
              <TreeNode key={resetKey} node={state.data} depth={0} />
            </div>
          )
        ) : (
          <div className="text-center py-16 text-gray-400">
            <ChartBarSquareIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>No se encontró organigrama para <span className="font-mono font-bold">{sigla}</span></p>
          </div>
        )}
      </div>
    </div>
  );
}
