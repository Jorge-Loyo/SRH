import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * Pagination
 * Props:
 *   currentPage   {number}    Página actual (1-based)
 *   totalPages    {number}    Total de páginas
 *   totalRecords  {number}    Total de registros
 *   onPageChange  {Function}  Callback (page: number)
 *   loading       {boolean}   Deshabilita controles durante carga
 *   tableRef      {Ref}       Si se pasa, hace scroll al tope al cambiar página
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  onPageChange,
  loading = false,
  tableRef = null,
}) {
  if (totalPages <= 1) return null;

  const goTo = (page) => {
    if (page < 1 || page > totalPages || loading) return;
    if (tableRef?.current) tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onPageChange(page);
  };

  // Genera la secuencia de botones con elipsis
  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const btnBase =
    'inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors';
  const btnActive = `${btnBase} bg-primary-700 text-white`;
  const btnInactive = `${btnBase} text-gray-600 hover:bg-gray-100`;
  const btnDisabled = `${btnBase} text-gray-300 cursor-not-allowed`;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-3 text-sm text-gray-600">
      <span>
        {totalRecords.toLocaleString('es-AR')} registro{totalRecords !== 1 ? 's' : ''}
      </span>

      <div className="flex items-center gap-1">
        {/* Anterior */}
        <button
          className={currentPage === 1 || loading ? btnDisabled : btnInactive}
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          aria-label="Página anterior"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>

        {/* Números */}
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              className={p === currentPage ? btnActive : loading ? btnDisabled : btnInactive}
              onClick={() => goTo(p)}
              disabled={loading}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Siguiente */}
        <button
          className={currentPage === totalPages || loading ? btnDisabled : btnInactive}
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          aria-label="Página siguiente"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
