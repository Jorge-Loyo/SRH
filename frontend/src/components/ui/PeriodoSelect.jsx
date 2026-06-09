/**
 * PeriodoSelect
 *
 * Selector de período reutilizable. Muestra hasta `limit` períodos (desc),
 * marca con ⚠ los que no tienen datos cargados y selecciona automáticamente
 * el período recomendado (último con datos) al montarse.
 *
 * Props:
 *   value        {string}   - período actualmente seleccionado (YYYY-MM)
 *   onChange     {fn}       - (periodoString) => void
 *   items        {string[]} - lista de períodos (YYYY-MM), desc
 *   metadata     {Object[]} - [{ periodo, hasData, isCurrent }]  (opcional)
 *   className    {string}   - clases extra para el <select>
 */
export default function PeriodoSelect({ value, onChange, items = [], metadata = [], className = '' }) {
  const metaMap = Object.fromEntries(metadata.map(m => [m.periodo, m]));

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`form-input text-sm py-1.5 w-40 ${className}`}
    >
      {items.map(p => {
        const meta = metaMap[p];
        const sinDatos = meta && !meta.hasData;
        return (
          <option key={p} value={p}>
            {sinDatos ? `⚠ ${p}` : p}
          </option>
        );
      })}
    </select>
  );
}
