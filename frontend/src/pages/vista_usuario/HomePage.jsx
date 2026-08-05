import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiGet, ApiError } from '../../api/client.js';
import Spinner from '../../components/ui/Spinner.jsx';
import PeriodoSelect from '../../components/ui/PeriodoSelect.jsx';
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

// ─── constantes ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'planta',     label: 'Planta General' },
  { key: 'cph',        label: 'CPH por Especialidad' },
  { key: 'jefaturas',  label: 'Jefaturas' },
];

const CATEGORIA_DEFS = [
  { key: 'enfermeros',      label: 'Enfermeros' },
  { key: 'administrativos', label: 'Administrativos' },
  { key: 'tecnicos',        label: 'Técnicos' },
];

const EMPTY_CATEGORIAS = { enfermeros: true, administrativos: true, tecnicos: true };

// Restricciones estructurales de cada categoría (las mismas que aplica el backend
// de /api/dotacion-activa) — se usan para el drill-down hacia Dotación Total
// cuando el click no fija un valor puntual (ej. un total general).
const ENFERMEROS_PUESTOS = [
  'Auxiliar de Enfermería', 'Enfermero profesional', 'ENFERMERO/A', 'Licenciado en Enfermería',
];
const CPH_AGRUPADORES = ['MEDICO', 'NO MEDICO', 'JEFES CPH'];
const CPH_UNIFICADORES = ['CPH de Guardia', 'CPH de Planta'];

// ─── helpers genéricos ────────────────────────────────────────────────────────

function fmtCount(n) {
  return n ? Number(n).toLocaleString('es-AR') : '–';
}

function distinctValues(rows, field) {
  const set = new Set();
  rows.forEach(r => { if (r[field]) set.add(r[field]); });
  return [...set].sort();
}

function applyFilter(rows, field, selected) {
  if (!selected?.length) return rows;
  return rows.filter(r => selected.includes(r[field]));
}

// Serializa el estado de filtros del Panel a query params — se usa al hacer
// drill-down hacia Dotación Total, para que el botón "Volver" pueda restaurarlos.
function buildPanelParams({
  periodo, activeTab, hospitalFilter, categoriasVisibles, situacionPlanta,
  agrupadorCph, unificadorCph, especialidadCph, situacionCph,
  agrupadorJefes, unificadorJefes, reparticionJefes, situacionJefes,
}) {
  const params = {};
  if (periodo) params.periodo = periodo;
  if (activeTab !== 'planta') params.tab = activeTab;
  if (hospitalFilter.length) params.hospital = hospitalFilter.join(',');
  const categoriasOff = CATEGORIA_DEFS.filter(c => !categoriasVisibles[c.key]).map(c => c.key);
  if (categoriasOff.length) params.categorias_off = categoriasOff.join(',');
  if (situacionPlanta.length) params.situacion_planta = situacionPlanta.join(',');
  if (agrupadorCph.length) params.agrupador_cph = agrupadorCph.join(',');
  if (unificadorCph.length) params.unificador_cph = unificadorCph.join(',');
  if (especialidadCph.length) params.especialidad_cph = especialidadCph.join(',');
  if (situacionCph.length) params.situacion_cph = situacionCph.join(',');
  if (agrupadorJefes.length) params.agrupador_jefes = agrupadorJefes.join(',');
  if (unificadorJefes.length) params.unificador_jefes = unificadorJefes.join(',');
  if (reparticionJefes.length) params.reparticion_jefes = reparticionJefes.join(',');
  if (situacionJefes.length) params.situacion_jefes = situacionJefes.join(',');
  return params;
}

// ─── helpers Tab 1: pivot simple ─────────────────────────────────────────────

function buildPivot(rows) {
  if (!rows?.length) return { situaciones: [], rowKeys: [], matrix: {}, totals: {} };

  const situacionSet = new Set();
  const rowKeySet = new Set();
  rows.forEach(r => {
    if (r.situacion_revista) situacionSet.add(r.situacion_revista);
    if (r.row_key) rowKeySet.add(r.row_key);
  });

  const situaciones = [...situacionSet].sort();
  const rowKeys     = [...rowKeySet].sort();
  const matrix = {};
  rows.forEach(r => {
    if (!r.row_key || !r.situacion_revista) return;
    if (!matrix[r.row_key]) matrix[r.row_key] = {};
    // Puede haber varias filas por la misma combinación row_key+situación
    // (una por hospital) — hay que sumarlas, no pisarlas.
    matrix[r.row_key][r.situacion_revista] = (matrix[r.row_key][r.situacion_revista] || 0) + (Number(r.cnt) || 0);
  });

  const totals = { __grand: 0 };
  situaciones.forEach(s => {
    totals[s] = rowKeys.reduce((sum, k) => sum + (matrix[k]?.[s] || 0), 0);
    totals.__grand += totals[s];
  });

  return { situaciones, rowKeys, matrix, totals };
}

// ─── helpers Tabs 2 y 3: pivot jerárquico (3 niveles) ────────────────────────

/**
 * level3Key: campo del row que se usa como tercer nivel
 *   Tab 2 → 'especialidad'
 *   Tab 3 → 'descripcion_reparticion'
 */
function buildHierarchicalRows(rows, level3Key) {
  if (!rows?.length) return { tableRows: [], situaciones: [], grandTotals: {} };

  const situacionSet = new Set();
  rows.forEach(r => { if (r.situacion_revista) situacionSet.add(r.situacion_revista); });
  const situaciones = [...situacionSet].sort();

  const grouped = {};
  rows.forEach(r => {
    const ag  = r.agrupador         || '';
    const un  = r.unificador_puesto || '';
    const lv3 = r[level3Key]        || '(Sin dato)';
    const sit = r.situacion_revista || '';
    if (!grouped[ag])           grouped[ag]           = {};
    if (!grouped[ag][un])       grouped[ag][un]       = {};
    if (!grouped[ag][un][lv3])  grouped[ag][un][lv3]  = {};
    grouped[ag][un][lv3][sit] = (grouped[ag][un][lv3][sit] || 0) + (Number(r.cnt) || 0);
  });

  const agrupadores = Object.keys(grouped).sort();
  const tableRows   = [];
  const grandTotals = { __grand: 0 };
  situaciones.forEach(s => { grandTotals[s] = 0; });

  agrupadores.forEach(ag => {
    const unificadores = Object.keys(grouped[ag]).sort();
    const agTotals = { __grand: 0 };
    situaciones.forEach(s => { agTotals[s] = 0; });

    const agStartIdx = tableRows.length;
    let agSpan = 0;

    unificadores.forEach(un => {
      const level3Values = Object.keys(grouped[ag][un]).sort();
      const unTotals = { __grand: 0 };
      situaciones.forEach(s => { unTotals[s] = 0; });

      const unStartIdx = tableRows.length;
      const unSpan = level3Values.length + 1; // filas de datos + subtotal
      agSpan += unSpan;

      level3Values.forEach((lv3, lv3Idx) => {
        const counts   = grouped[ag][un][lv3];
        const rowTotal = situaciones.reduce((sum, s) => sum + (counts[s] || 0), 0);
        situaciones.forEach(s => { unTotals[s] += counts[s] || 0; });

        tableRows.push({
          type: 'data',
          agrupador: ag, unificador: un, level3: lv3,
          counts, rowTotal,
          isFirstInAg: false,
          isFirstInUn: lv3Idx === 0,
          unSpan, agSpan: 0,
        });
      });

      const unTotal = situaciones.reduce((sum, s) => sum + (unTotals[s] || 0), 0);
      tableRows.push({ type: 'subtotal-un', label: `Total ${un}`, agrupador: ag, unificador: un, counts: unTotals, rowTotal: unTotal });
      situaciones.forEach(s => { agTotals[s] += unTotals[s] || 0; });
    });

    agSpan++;
    const agTotal = situaciones.reduce((sum, s) => sum + (agTotals[s] || 0), 0);
    tableRows.push({ type: 'subtotal-ag', label: `Total ${ag}`, agrupador: ag, counts: agTotals, rowTotal: agTotal });

    if (tableRows[agStartIdx]) {
      tableRows[agStartIdx].isFirstInAg = true;
      tableRows[agStartIdx].agSpan = agSpan;
    }

    situaciones.forEach(s => { grandTotals[s] += agTotals[s] || 0; });
    grandTotals.__grand += agTotal;
  });

  return { tableRows, situaciones, grandTotals };
}

// ─── componentes de tabla ─────────────────────────────────────────────────────

// Celda clickeable: lleva a Dotación Total filtrada con los datos que componen
// ese número exacto (estilo "Mostrar detalle" de una tabla dinámica de Excel).
// Sin valor (0 / sin dato) → no clickeable.
const DrillCell = memo(({ value, onClick, bold }) => (
  <button
    type="button"
    disabled={!value}
    onClick={onClick}
    title={value ? 'Ver el detalle en Dotación Total' : undefined}
    className={[
      'w-full text-center',
      bold ? 'font-medium text-gray-900' : 'text-gray-800',
      value ? 'cursor-pointer hover:underline hover:text-primary-700' : 'cursor-default',
    ].join(' ')}
  >
    {fmtCount(value)}
  </button>
));
DrillCell.displayName = 'DrillCell';

const PivotTable = memo(({ title, rowLabel, pivot, onDrill }) => {
  const { situaciones, rowKeys, matrix, totals } = pivot;
  return (
    <div className="mb-6">
      <div className="overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">
                {title}
              </th>
              <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" colSpan={situaciones.length + 1}>
                SITUACIÓN DE REVISTA
              </th>
            </tr>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-r border-gray-200 min-w-[220px]">
                {rowLabel}
              </th>
              {situaciones.map(s => (
                <th key={s} className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-r border-gray-200">
                  {s}
                </th>
              ))}
              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-gray-200">
                Suma total
              </th>
            </tr>
          </thead>
          <tbody>
            {rowKeys.length === 0 ? (
              <tr>
                <td colSpan={situaciones.length + 2} className="px-3 py-6 text-center text-sm text-gray-400">
                  Sin datos para los filtros seleccionados
                </td>
              </tr>
            ) : rowKeys.map((rowKey, idx) => {
              const rowTotal = situaciones.reduce((sum, s) => sum + (matrix[rowKey]?.[s] || 0), 0);
              return (
                <tr key={rowKey} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-1.5 whitespace-nowrap text-gray-800 border-b border-r border-gray-100 text-xs">
                    {rowKey}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-1.5 text-center border-b border-r border-gray-100">
                      <DrillCell value={matrix[rowKey]?.[s]} onClick={() => onDrill(rowKey, s)} />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center border-b border-gray-100">
                    <DrillCell value={rowTotal} onClick={() => onDrill(rowKey, undefined)} bold />
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-200 font-semibold">
              <td className="px-3 py-2 text-xs text-gray-800 border-r border-gray-300">Suma total</td>
              {situaciones.map(s => (
                <td key={s} className="px-3 py-2 text-center border-r border-gray-300">
                  <DrillCell value={totals[s]} onClick={() => onDrill(undefined, s)} bold />
                </td>
              ))}
              <td className="px-3 py-2 text-center">
                <DrillCell value={totals.__grand} onClick={() => onDrill(undefined, undefined)} bold />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});
PivotTable.displayName = 'PivotTable';

const HierarchicalTable = memo(({ hier, level3Label, onDrill }) => {
  const { tableRows, situaciones, grandTotals } = hier;

  if (!tableRows.length) {
    return (
      <div className="rounded-lg border border-gray-200 px-3 py-6 text-center text-sm text-gray-400">
        Sin datos para los filtros seleccionados
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-700 text-white">
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">AGRUPADOR</th>
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">UNIFICADOR DE PUESTOS</th>
            <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">{level3Label}</th>
            <th className="px-3 py-2 text-center font-semibold whitespace-nowrap" colSpan={situaciones.length + 1}>
              SITUACIÓN DE REVISTA
            </th>
          </tr>
          <tr className="bg-gray-100">
            <th className="px-3 py-2 border-b border-r border-gray-200" />
            <th className="px-3 py-2 border-b border-r border-gray-200" />
            <th className="px-3 py-2 border-b border-r border-gray-200 min-w-[200px]" />
            {situaciones.map(s => (
              <th key={s} className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-r border-gray-200">
                {s}
              </th>
            ))}
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 whitespace-nowrap border-b border-gray-200">
              Suma total
            </th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, idx) => {
            if (row.type === 'data') {
              return (
                <tr key={idx} className="bg-white">
                  {row.isFirstInAg && (
                    <td rowSpan={row.agSpan} className="px-3 py-1.5 align-middle text-xs font-semibold text-gray-900 border-b border-r border-gray-200 bg-gray-50 whitespace-nowrap">
                      {row.agrupador}
                    </td>
                  )}
                  {row.isFirstInUn && (
                    <td rowSpan={row.unSpan} className="px-3 py-1.5 align-middle text-xs text-gray-700 border-b border-r border-gray-200 whitespace-nowrap">
                      {row.unificador}
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-xs text-gray-800 border-b border-r border-gray-100 whitespace-nowrap">
                    {row.level3}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-1.5 text-center border-b border-r border-gray-100">
                      <DrillCell
                        value={row.counts[s]}
                        onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador, level3: row.level3, situacion: s })}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center border-b border-gray-100">
                    <DrillCell
                      value={row.rowTotal}
                      onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador, level3: row.level3 })}
                      bold
                    />
                  </td>
                </tr>
              );
            }

            if (row.type === 'subtotal-un') {
              return (
                <tr key={idx} className="bg-gray-100">
                  {/* cols AGRUPADOR y UNIFICADOR cubiertas por sus rowspan */}
                  <td colSpan={1} className="px-3 py-1.5 text-xs font-medium text-gray-700 border-b border-r border-gray-200 italic">
                    {row.label}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-1.5 text-center border-b border-r border-gray-200">
                      <DrillCell
                        value={row.counts[s]}
                        onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador, situacion: s })}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-center border-b border-gray-200">
                    <DrillCell
                      value={row.rowTotal}
                      onClick={() => onDrill({ agrupador: row.agrupador, unificador: row.unificador })}
                      bold
                    />
                  </td>
                </tr>
              );
            }

            if (row.type === 'subtotal-ag') {
              return (
                <tr key={idx} className="bg-gray-300">
                  {/* col AGRUPADOR cubierta por rowspan */}
                  <td colSpan={2} className="px-3 py-2 text-xs font-bold text-gray-900 border-b border-r border-gray-400">
                    {row.label}
                  </td>
                  {situaciones.map(s => (
                    <td key={s} className="px-3 py-2 text-center border-b border-r border-gray-400">
                      <DrillCell
                        value={row.counts[s]}
                        onClick={() => onDrill({ agrupador: row.agrupador, situacion: s })}
                        bold
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center border-b border-gray-400">
                    <DrillCell value={row.rowTotal} onClick={() => onDrill({ agrupador: row.agrupador })} bold />
                  </td>
                </tr>
              );
            }

            return null;
          })}

          <tr className="bg-gray-700 text-white font-bold">
            <td colSpan={3} className="px-3 py-2 text-xs border-r border-gray-600">Suma total</td>
            {situaciones.map(s => (
              <td key={s} className="px-3 py-2 text-center border-r border-gray-600">
                <DrillCell value={grandTotals[s]} onClick={() => onDrill({ situacion: s })} bold />
              </td>
            ))}
            <td className="px-3 py-2 text-center">
              <DrillCell value={grandTotals.__grand} onClick={() => onDrill({})} bold />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
HierarchicalTable.displayName = 'HierarchicalTable';

// ─── HomePage ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Lee un filtro multi-valor desde la URL — se usa para restaurar el estado
  // del Panel cuando se vuelve desde Dotación Total con el botón "Volver".
  const initListParam = (key) => {
    const v = searchParams.get(key);
    return v ? v.split(',') : [];
  };

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'planta');
  const [periodo, setPeriodo] = useState(searchParams.get('periodo') || '');
  const [periodos, setPeriodos] = useState([]);
  const [periodosMetadata, setPeriodosMetadata] = useState([]);
  const [data, setData] = useState({ enfermeros: [], administrativos: [], tecnicos: [], cph: [], jefes: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  // Filtro global (las 3 solapas comparten la misma dimensión "hospital")
  const [hospitalFilter, setHospitalFilter] = useState(() => initListParam('hospital'));

  // Filtros — solapa "Planta General"
  const [categoriasVisibles, setCategoriasVisibles] = useState(() => {
    const off = new Set(initListParam('categorias_off'));
    const init = { ...EMPTY_CATEGORIAS };
    off.forEach(k => { if (k in init) init[k] = false; });
    return init;
  });
  const [situacionPlanta, setSituacionPlanta] = useState(() => initListParam('situacion_planta'));

  // Filtros — solapa "CPH por Especialidad"
  const [agrupadorCph, setAgrupadorCph] = useState(() => initListParam('agrupador_cph'));
  const [unificadorCph, setUnificadorCph] = useState(() => initListParam('unificador_cph'));
  const [especialidadCph, setEspecialidadCph] = useState(() => initListParam('especialidad_cph'));
  const [situacionCph, setSituacionCph] = useState(() => initListParam('situacion_cph'));

  // Filtros — solapa "Jefaturas"
  const [agrupadorJefes, setAgrupadorJefes] = useState(() => initListParam('agrupador_jefes'));
  const [unificadorJefes, setUnificadorJefes] = useState(() => initListParam('unificador_jefes'));
  const [reparticionJefes, setReparticionJefes] = useState(() => initListParam('reparticion_jefes'));
  const [situacionJefes, setSituacionJefes] = useState(() => initListParam('situacion_jefes'));

  const periodoRef = useRef(periodo);
  useEffect(() => { periodoRef.current = periodo; }, [periodo]);

  const fetchData = useCallback(async () => {
    const p = periodoRef.current;
    if (!p) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet('/api/dotacion-activa', { periodo: p });
      if (result.error) throw new Error(result.error);
      setData({
        enfermeros:      result.enfermeros      || [],
        administrativos: result.administrativos || [],
        tecnicos:        result.tecnicos        || [],
        cph:             result.cph             || [],
        jefes:           result.jefes           || [],
      });
    } catch (e) {
      const msg = e instanceof ApiError ? `Error ${e.status}: ${e.message}` : (e.message || 'Error al cargar datos');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiGet('/api/periodos', { limit: 12 })
      .then(d => {
        const list = d?.items || [];
        setPeriodos(list);
        setPeriodosMetadata(d?.periodsMetadata || []);
        if (!periodoRef.current && d?.recommended) {
          setPeriodo(d.recommended);
          periodoRef.current = d.recommended;
          setSearchParams({ periodo: d.recommended }, { replace: true });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (periodo) fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo]);

  const handlePeriodoChange = useCallback(p => {
    setPeriodo(p);
    setSearchParams({ periodo: p }, { replace: true });
  }, [setSearchParams]);

  // ── Hospital: opciones + datos ya acotados por el filtro global ───────────
  const hospitalOptions = useMemo(() => {
    const set = new Set();
    [...data.enfermeros, ...data.administrativos, ...data.tecnicos, ...data.cph, ...data.jefes]
      .forEach(r => { if (r.hospital) set.add(r.hospital); });
    return [...set].sort();
  }, [data]);

  const dataByHospital = useMemo(() => {
    if (!hospitalFilter.length) return data;
    return {
      enfermeros:      applyFilter(data.enfermeros,      'hospital', hospitalFilter),
      administrativos: applyFilter(data.administrativos, 'hospital', hospitalFilter),
      tecnicos:        applyFilter(data.tecnicos,         'hospital', hospitalFilter),
      cph:             applyFilter(data.cph,              'hospital', hospitalFilter),
      jefes:           applyFilter(data.jefes,            'hospital', hospitalFilter),
    };
  }, [data, hospitalFilter]);

  // ── Solapa "Planta General" ────────────────────────────────────────────────
  const situacionPlantaOptions = useMemo(() => distinctValues(
    [...dataByHospital.enfermeros, ...dataByHospital.administrativos, ...dataByHospital.tecnicos],
    'situacion_revista'
  ), [dataByHospital]);

  const pivotEnf = useMemo(
    () => buildPivot(applyFilter(dataByHospital.enfermeros, 'situacion_revista', situacionPlanta)),
    [dataByHospital, situacionPlanta]
  );
  const pivotAdm = useMemo(
    () => buildPivot(applyFilter(dataByHospital.administrativos, 'situacion_revista', situacionPlanta)),
    [dataByHospital, situacionPlanta]
  );
  const pivotTec = useMemo(
    () => buildPivot(applyFilter(dataByHospital.tecnicos, 'situacion_revista', situacionPlanta)),
    [dataByHospital, situacionPlanta]
  );

  const totalPlanta =
    (categoriasVisibles.enfermeros      ? pivotEnf.totals.__grand : 0) +
    (categoriasVisibles.administrativos ? pivotAdm.totals.__grand : 0) +
    (categoriasVisibles.tecnicos        ? pivotTec.totals.__grand : 0);

  const hasFiltersPlanta = situacionPlanta.length > 0 || CATEGORIA_DEFS.some(c => !categoriasVisibles[c.key]);
  const clearPlantaFilters = useCallback(() => {
    setSituacionPlanta([]);
    setCategoriasVisibles({ ...EMPTY_CATEGORIAS });
  }, []);

  // ── Solapa "CPH por Especialidad" ──────────────────────────────────────────
  const agrupadorCphOptions    = useMemo(() => distinctValues(dataByHospital.cph, 'agrupador'), [dataByHospital]);
  const unificadorCphOptions   = useMemo(() => distinctValues(dataByHospital.cph, 'unificador_puesto'), [dataByHospital]);
  const especialidadCphOptions = useMemo(() => distinctValues(dataByHospital.cph, 'especialidad'), [dataByHospital]);
  const situacionCphOptions    = useMemo(() => distinctValues(dataByHospital.cph, 'situacion_revista'), [dataByHospital]);

  const cphFiltered = useMemo(() => {
    let rows = dataByHospital.cph;
    rows = applyFilter(rows, 'agrupador', agrupadorCph);
    rows = applyFilter(rows, 'unificador_puesto', unificadorCph);
    rows = applyFilter(rows, 'especialidad', especialidadCph);
    rows = applyFilter(rows, 'situacion_revista', situacionCph);
    return rows;
  }, [dataByHospital, agrupadorCph, unificadorCph, especialidadCph, situacionCph]);

  const hierCph = useMemo(() => buildHierarchicalRows(cphFiltered, 'especialidad'), [cphFiltered]);

  const hasFiltersCph = agrupadorCph.length > 0 || unificadorCph.length > 0 || especialidadCph.length > 0 || situacionCph.length > 0;
  const clearCphFilters = useCallback(() => {
    setAgrupadorCph([]); setUnificadorCph([]); setEspecialidadCph([]); setSituacionCph([]);
  }, []);

  // ── Solapa "Jefaturas" ──────────────────────────────────────────────────────
  const agrupadorJefesOptions   = useMemo(() => distinctValues(dataByHospital.jefes, 'agrupador'), [dataByHospital]);
  const unificadorJefesOptions  = useMemo(() => distinctValues(dataByHospital.jefes, 'unificador_puesto'), [dataByHospital]);
  const reparticionJefesOptions = useMemo(() => distinctValues(dataByHospital.jefes, 'descripcion_reparticion'), [dataByHospital]);
  const situacionJefesOptions   = useMemo(() => distinctValues(dataByHospital.jefes, 'situacion_revista'), [dataByHospital]);

  const jefesFiltered = useMemo(() => {
    let rows = dataByHospital.jefes;
    rows = applyFilter(rows, 'agrupador', agrupadorJefes);
    rows = applyFilter(rows, 'unificador_puesto', unificadorJefes);
    rows = applyFilter(rows, 'descripcion_reparticion', reparticionJefes);
    rows = applyFilter(rows, 'situacion_revista', situacionJefes);
    return rows;
  }, [dataByHospital, agrupadorJefes, unificadorJefes, reparticionJefes, situacionJefes]);

  const hierJefes = useMemo(() => buildHierarchicalRows(jefesFiltered, 'descripcion_reparticion'), [jefesFiltered]);

  const hasFiltersJefes = agrupadorJefes.length > 0 || unificadorJefes.length > 0 || reparticionJefes.length > 0 || situacionJefes.length > 0;
  const clearJefesFilters = useCallback(() => {
    setAgrupadorJefes([]); setUnificadorJefes([]); setReparticionJefes([]); setSituacionJefes([]);
  }, []);

  // ── Drill-down hacia Dotación Total ("Mostrar detalle" estilo Excel) ──────
  // Regla: 1) valor fijado por la celda clickeada, 2) si no, el filtro que el
  // Panel ya tenía activo para esa dimensión, 3) si no, la restricción
  // estructural de la categoría (la que el backend aplica pero no es un
  // filtro visible). Si nada aplica, se omite el parámetro = "todos los valores".
  const goToDotacion = useCallback((extra) => {
    // Deja el estado actual del Panel guardado en su propia URL, así el botón
    // "Volver" de Dotación Total (navigate(-1)) lo restaura tal como estaba.
    setSearchParams(buildPanelParams({
      periodo, activeTab, hospitalFilter, categoriasVisibles, situacionPlanta,
      agrupadorCph, unificadorCph, especialidadCph, situacionCph,
      agrupadorJefes, unificadorJefes, reparticionJefes, situacionJefes,
    }), { replace: true });

    const params = { periodo };
    if (hospitalFilter.length) params.sigla = hospitalFilter.join(',');
    Object.entries(extra).forEach(([k, v]) => { if (v) params[k] = v; });
    navigate(`/dotacion?${new URLSearchParams(params).toString()}`, { state: { fromPanel: true } });
  }, [
    periodo, hospitalFilter, navigate, setSearchParams, activeTab, categoriasVisibles, situacionPlanta,
    agrupadorCph, unificadorCph, especialidadCph, situacionCph,
    agrupadorJefes, unificadorJefes, reparticionJefes, situacionJefes,
  ]);

  const drillPlanta = useCallback((category, rowKey, situacion) => {
    const extra = {};
    if (category === 'administrativos') {
      extra.codigo_registro = '83';
      if (rowKey) extra.agrupador = rowKey;
    } else if (rowKey) {
      extra.literal_puesto = rowKey;
    } else if (category === 'enfermeros') {
      extra.literal_puesto = ENFERMEROS_PUESTOS.join(',');
    } else {
      extra.escalafon = 'CEETPS';
    }
    extra.situacion_revista = situacion || (situacionPlanta.length ? situacionPlanta.join(',') : undefined);
    goToDotacion(extra);
  }, [goToDotacion, situacionPlanta]);

  const drillCph = useCallback(({ agrupador, unificador, especialidad, situacion }) => {
    goToDotacion({
      agrupador: agrupador || (agrupadorCph.length ? agrupadorCph.join(',') : CPH_AGRUPADORES.join(',')),
      unificador_puesto: unificador || (unificadorCph.length ? unificadorCph.join(',') : CPH_UNIFICADORES.join(',')),
      especialidad: especialidad || (especialidadCph.length ? especialidadCph.join(',') : undefined),
      situacion_revista: situacion || (situacionCph.length ? situacionCph.join(',') : undefined),
    });
  }, [goToDotacion, agrupadorCph, unificadorCph, especialidadCph, situacionCph]);

  // Lista de unificador_puesto "tipo jefe" presentes en los datos ya cargados —
  // el backend de Dotación Total no soporta un filtro LIKE, así que cuando el
  // click no fija un unificador puntual hace falta la lista explícita.
  const jefeUnificadorFallback = useMemo(
    () => distinctValues(jefesFiltered, 'unificador_puesto').join(','),
    [jefesFiltered]
  );

  const drillJefes = useCallback(({ agrupador, unificador, reparticion, situacion }) => {
    goToDotacion({
      agrupador: agrupador || (agrupadorJefes.length ? agrupadorJefes.join(',') : CPH_AGRUPADORES.join(',')),
      unificador_puesto: unificador || (unificadorJefes.length ? unificadorJefes.join(',') : jefeUnificadorFallback),
      reparticion: reparticion || (reparticionJefes.length ? reparticionJefes.join(',') : undefined),
      situacion_revista: situacion || (situacionJefes.length ? situacionJefes.join(',') : undefined),
    });
  }, [goToDotacion, agrupadorJefes, unificadorJefes, reparticionJefes, situacionJefes, jefeUnificadorFallback]);

  const onDrillCph = useCallback(({ agrupador, unificador, level3, situacion }) =>
    drillCph({ agrupador, unificador, especialidad: level3, situacion }), [drillCph]);

  const onDrillJefes = useCallback(({ agrupador, unificador, level3, situacion }) =>
    drillJefes({ agrupador, unificador, reparticion: level3, situacion }), [drillJefes]);

  // ── Generales ───────────────────────────────────────────────────────────────
  const activeTotal = activeTab === 'planta' ? totalPlanta
    : activeTab === 'cph' ? hierCph.grandTotals.__grand
    : hierJefes.grandTotals.__grand;

  const hasActiveTabFilters = activeTab === 'planta' ? hasFiltersPlanta
    : activeTab === 'cph' ? hasFiltersCph
    : hasFiltersJefes;

  const clearActiveTabFilters = activeTab === 'planta' ? clearPlantaFilters
    : activeTab === 'cph' ? clearCphFilters
    : clearJefesFilters;

  const hasAnyActiveFilters = hospitalFilter.length > 0 || hasFiltersPlanta || hasFiltersCph || hasFiltersJefes;

  const hospitalLabel = user?.hospital_code
    ? `Hospital ${user.hospital_code}`
    : hospitalFilter.length === 0
      ? 'Todos los hospitales'
      : hospitalFilter.length === 1
        ? `Hospital ${hospitalFilter[0]}`
        : `${hospitalFilter.length} hospitales seleccionados`;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Barra superior */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dotación Actual Activa</h1>
            <p className="text-xs text-gray-400">{hospitalLabel}</p>
          </div>
          <div className="flex-1" />

          <button onClick={() => setShowFilters(v => !v)}
            className={`btn-secondary flex items-center gap-1.5 text-sm ${hasAnyActiveFilters ? 'border-primary-500 text-primary-700' : ''}`}>
            <FunnelIcon className="w-4 h-4" />
            Filtros
            {hasAnyActiveFilters && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-xs">!</span>
            )}
          </button>

          {periodos.length > 0 && (
            <PeriodoSelect
              value={periodo}
              onChange={handlePeriodoChange}
              items={periodos}
              metadata={periodosMetadata}
            />
          )}
        </div>

        {/* Solapas */}
        <div className="flex flex-wrap items-end gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                'px-3 sm:px-5 py-1.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap',
                activeTab === t.key
                  ? 'border-primary-600 text-primary-700 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
          <div className="flex-1 hidden sm:block" />
          {periodo && !loading && !error && (
            <p className="text-xs text-gray-400 pb-2 pr-1 w-full sm:w-auto">
              {fmtCount(activeTotal)} {activeTotal === 1 ? 'persona' : 'personas'} con los filtros actuales
            </p>
          )}
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
          {/* Hospital — compartido por las 3 solapas */}
          {hospitalOptions.length > 1 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Hospital</p>
              <div className="max-w-xs">
                <MultiSelectDropdown
                  value={hospitalFilter}
                  options={hospitalOptions}
                  onChange={setHospitalFilter}
                  placeholder="Todos los hospitales"
                />
              </div>
            </div>
          )}

          {/* Filtros propios de la solapa activa */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Filtros — {TABS.find(t => t.key === activeTab)?.label}
              </p>
              {hasActiveTabFilters && (
                <button onClick={clearActiveTabFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <XMarkIcon className="w-3.5 h-3.5" />Limpiar
                </button>
              )}
            </div>

            {activeTab === 'planta' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORIA_DEFS.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setCategoriasVisibles(v => ({ ...v, [c.key]: !v[c.key] }))}
                      className={[
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                        categoriasVisibles[c.key]
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400',
                      ].join(' ')}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <div className="max-w-xs">
                  <MultiSelectDropdown
                    label="Situación de Revista"
                    value={situacionPlanta}
                    options={situacionPlantaOptions}
                    onChange={setSituacionPlanta}
                  />
                </div>
              </div>
            )}

            {activeTab === 'cph' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MultiSelectDropdown label="Agrupador" value={agrupadorCph} options={agrupadorCphOptions} onChange={setAgrupadorCph} />
                <MultiSelectDropdown label="Unificador de Puestos" value={unificadorCph} options={unificadorCphOptions} onChange={setUnificadorCph} />
                <MultiSelectDropdown label="Especialidad" value={especialidadCph} options={especialidadCphOptions} onChange={setEspecialidadCph} />
                <MultiSelectDropdown label="Situación de Revista" value={situacionCph} options={situacionCphOptions} onChange={setSituacionCph} />
              </div>
            )}

            {activeTab === 'jefaturas' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <MultiSelectDropdown label="Agrupador" value={agrupadorJefes} options={agrupadorJefesOptions} onChange={setAgrupadorJefes} />
                <MultiSelectDropdown label="Unificador de Puestos" value={unificadorJefes} options={unificadorJefesOptions} onChange={setUnificadorJefes} />
                <MultiSelectDropdown label="Repartición" value={reparticionJefes} options={reparticionJefesOptions} onChange={setReparticionJefes} />
                <MultiSelectDropdown label="Situación de Revista" value={situacionJefes} options={situacionJefesOptions} onChange={setSituacionJefes} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 px-4 py-4">
        {!periodo && (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Seleccioná un período para ver los datos.
          </div>
        )}

        {periodo && loading && (
          <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
            <Spinner size="lg" />
            <span className="text-sm">Cargando...</span>
          </div>
        )}

        {periodo && error && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {periodo && !loading && !error && (
          <>
            {activeTab === 'planta' && (
              <>
                {categoriasVisibles.enfermeros && (
                  <PivotTable title="ENFERMEROS" rowLabel="LITERAL PUESTO" pivot={pivotEnf}
                    onDrill={(rowKey, situacion) => drillPlanta('enfermeros', rowKey, situacion)} />
                )}
                {categoriasVisibles.administrativos && (
                  <PivotTable title="ADMINISTRATIVOS" rowLabel="AGRUPAMIENTO" pivot={pivotAdm}
                    onDrill={(rowKey, situacion) => drillPlanta('administrativos', rowKey, situacion)} />
                )}
                {categoriasVisibles.tecnicos && (
                  <PivotTable title="TÉCNICOS" rowLabel="LITERAL PUESTO" pivot={pivotTec}
                    onDrill={(rowKey, situacion) => drillPlanta('tecnicos', rowKey, situacion)} />
                )}
                {!categoriasVisibles.enfermeros && !categoriasVisibles.administrativos && !categoriasVisibles.tecnicos && (
                  <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
                    Activá al menos una categoría en los filtros para ver datos.
                  </div>
                )}
              </>
            )}
            {activeTab === 'cph' && (
              <HierarchicalTable hier={hierCph} level3Label="ESPECIALIDAD" onDrill={onDrillCph} />
            )}
            {activeTab === 'jefaturas' && (
              <HierarchicalTable hier={hierJefes} level3Label="DESCRIPCIÓN REPARTICIÓN" onDrill={onDrillJefes} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
