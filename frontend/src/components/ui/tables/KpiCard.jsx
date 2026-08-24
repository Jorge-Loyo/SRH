import { memo } from 'react';

export const KPI_DEFS_DOTACION = [
  { key: 'total',      label: 'Total',             color: 'bg-gray-100',   textColor: 'text-gray-800',   estadoValue: '' },
  { key: 'activos',    label: 'Activos',            color: 'bg-teal-100',   textColor: 'text-teal-800',   estadoValue: 'activo' },
  { key: 'comision',   label: 'Comisión',           color: 'bg-yellow-100', textColor: 'text-yellow-800', estadoValue: 'comision' },
  { key: 'retencion',  label: 'Retención de Cargo', color: 'bg-indigo-100', textColor: 'text-indigo-800', estadoValue: 'retencion de cargo' },
  { key: 'bloqueados', label: 'Bloqueo de Haberes', color: 'bg-gray-800',   textColor: 'text-white',      estadoValue: 'bloqueado' },
];

const KpiCard = memo(({ def, value, active, onClick }) => (
  <button
    onClick={() => def.estadoValue && onClick(def.estadoValue)}
    className={[
      'flex flex-col items-center justify-center rounded-lg px-3 py-2 flex-1 min-w-0 transition-all',
      def.color,
      def.estadoValue
        ? active
          ? 'ring-2 ring-primary-600 shadow-md cursor-pointer scale-105'
          : 'hover:shadow cursor-pointer'
        : 'cursor-default',
    ].join(' ')}
  >
    <span className={`text-xl sm:text-2xl font-bold ${def.textColor}`}>{(value ?? 0).toLocaleString('es-AR')}</span>
    <span className={`text-[10px] sm:text-xs mt-0.5 text-center leading-tight ${def.key === 'bloqueados' ? 'text-gray-300' : 'text-gray-500'}`}>{def.label}</span>
  </button>
));
KpiCard.displayName = 'KpiCard';

export default KpiCard;
