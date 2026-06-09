import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, XMarkIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * MultiSelectDropdown — versión Tailwind del original
 * Props:
 *   label       {string}    Etiqueta del campo
 *   value       {string[]}  Valores seleccionados
 *   options     {string[]}  Opciones disponibles
 *   onChange    {Function}  Callback (newValues: string[])
 *   onFocus     {Function}  Callback al abrir dropdown (útil para cargar opciones)
 *   placeholder {string}    Texto cuando no hay selección
 *   disabled    {boolean}
 */
export default function MultiSelectDropdown({
  label,
  value = [],
  options = [],
  onChange,
  onFocus,
  placeholder = 'Seleccionar...',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  // Cierra al hacer clic fuera
  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Foco en buscador al abrir
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const toggle = () => {
    if (disabled) return;
    if (!open && onFocus) onFocus();
    setOpen((v) => !v);
    setSearch('');
  };

  const filtered = options.filter((opt) =>
    String(opt).toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = useCallback(
    (opt) => {
      const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
      onChange(next);
    },
    [value, onChange]
  );

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  const displayText =
    value.length === 0
      ? placeholder
      : value.length === 1
      ? value[0]
      : `${value.length} seleccionados`;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        className={[
          'w-full flex items-center justify-between gap-1 px-3 py-2 rounded-md border text-sm text-left transition-colors',
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : open
            ? 'border-primary-600 ring-1 ring-primary-600 bg-white'
            : 'border-gray-300 bg-white hover:border-gray-400',
          value.length > 0 ? 'text-gray-900' : 'text-gray-400',
        ].join(' ')}
      >
        <span className="truncate">{displayText}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), clearAll())}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Limpiar selección"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-md shadow-lg">
          {/* Buscador */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-7 pr-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Acciones globales */}
          <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-100">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary-700 hover:underline"
            >
              Todos
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-gray-500 hover:underline"
            >
              Ninguno
            </button>
          </div>

          {/* Lista */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400 text-center">Sin resultados</li>
            ) : (
              filtered.map((opt) => {
                const selected = value.includes(opt);
                return (
                  <li key={opt}>
                    <button
                      type="button"
                      onClick={() => toggleOption(opt)}
                      className={[
                        'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-gray-50 transition-colors',
                        selected ? 'font-medium text-primary-700' : 'text-gray-700',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex items-center justify-center w-4 h-4 rounded border shrink-0',
                          selected
                            ? 'bg-primary-700 border-primary-700 text-white'
                            : 'border-gray-300',
                        ].join(' ')}
                      >
                        {selected && <CheckIcon className="w-3 h-3" />}
                      </span>
                      <span className="truncate">{opt}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
