import { useRef } from 'react';
import { XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Pagination from './Pagination';
import { formatCellValue } from '../../utils/formatValue';

export default function TablaAmpliadaModal({ isOpen, onClose, columns, rows, state, toggleSort, totalPages, fetchData }) {
  const tableRef = useRef(null);
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 p-2 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full sm:w-[96%] max-w-[1900px] h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 rounded-t-xl bg-gradient-to-r from-primary-700 to-primary-600 border-b-2 border-primary-800">
          <span className="text-white font-bold text-base tracking-wide">Tabla Ampliada</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-white text-sm font-semibold px-3 py-1.5 rounded border border-white/25 bg-white/15 hover:bg-white/25 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
            Cerrar
          </button>
        </div>

        {/* Table body */}
        <div ref={tableRef} className="flex-1 overflow-auto p-2 sm:p-5 bg-gray-50">
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto overflow-y-auto" style={{ maxHeight: '100%' }}>
            <table className="min-w-max text-sm">
              <thead>
                <tr className="bg-primary-700">
                  {columns.map(col => (
                    <th
                      key={col}
                      className="px-4 py-3.5 text-center text-white font-bold text-xs whitespace-nowrap sticky top-0 bg-primary-700 z-10 border-r border-white/10 cursor-pointer hover:bg-primary-600 transition-colors select-none"
                      onClick={() => toggleSort(col)}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        {col}
                        {state.sortBy === col && (
                          state.sortDir === 'ASC'
                            ? <ChevronUpIcon className="w-3.5 h-3.5" />
                            : <ChevronDownIcon className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-16 text-center text-gray-400">Sin resultados</td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`transition-colors ${
                        row.nombre_apellido === 'TOTAL DE REGISTROS'
                          ? 'bg-yellow-50'
                          : idx % 2 === 0
                            ? 'bg-white hover:bg-primary-50'
                            : 'bg-gray-50 hover:bg-primary-50'
                      }`}
                    >
                      {columns.map(col => (
                        <td key={col} className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-800 border-r border-gray-100">
                          {formatCellValue(row[col], col)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center flex-wrap px-3 sm:px-6 py-2.5 border-t-2 border-gray-200 bg-white rounded-b-xl gap-3 sm:gap-6">
          <span className="text-sm text-gray-600 font-medium">
            Mostrando {rows.length} de {state.total} registros
          </span>
          <div className="ml-auto">
            <Pagination
              currentPage={state.page}
              totalPages={totalPages}
              totalRecords={state.total}
              onPageChange={p => fetchData({ page: p })}
              loading={false}
              tableRef={tableRef}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
