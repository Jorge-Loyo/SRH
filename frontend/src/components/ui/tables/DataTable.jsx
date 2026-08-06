import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import EmptyState from '../feedback/EmptyState.jsx'

/**
 * DataTable — tabla responsiva base.
 * Siempre con overflow-x-auto para scroll horizontal en mobile.
 */
export default function DataTable({
  columns,        // [{ key, label, className, hidden }]
  rows,           // array de objetos
  renderCell,     // (row, col) => ReactNode — opcional, por defecto row[col.key]
  sortBy,
  sortDir,
  onSort,
  loading = false,
  emptyTitle = 'Sin registros',
  emptyDescription,
  stickyHeader = true,
  tableRef,
}) {
  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div
      ref={tableRef}
      className="overflow-x-auto rounded-lg border border-gray-200"
    >
      <table className="min-w-full text-sm border-collapse">
        <thead className={stickyHeader ? 'sticky top-0 z-10 bg-gray-50' : 'bg-gray-50'}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort?.(col.key)}
                className={`
                  px-3 py-2.5 text-left text-xs font-semibold text-gray-600
                  whitespace-nowrap border-b border-gray-200
                  ${onSort ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                  ${col.hidden ? 'hidden sm:table-cell' : ''}
                  ${col.className ?? ''}
                `}
              >
                <div className="flex items-center gap-1">
                  {col.label}
                  {onSort && (
                    sortBy === col.key
                      ? sortDir === 'ASC'
                        ? <ChevronUpIcon className="w-3 h-3 text-primary-600" />
                        : <ChevronDownIcon className="w-3 h-3 text-primary-600" />
                      : <span className="w-3 h-3 inline-block" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`
                    px-3 py-1.5 whitespace-nowrap text-gray-800 border-b border-gray-100
                    ${col.hidden ? 'hidden sm:table-cell' : ''}
                    ${col.className ?? ''}
                  `}
                >
                  {renderCell ? renderCell(row, col) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
