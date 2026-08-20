import React from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { ModalShell } from './ui'

const LIMIT = 50

export default function PreviewModal({ preview, loading, page, onPage, onClose }) {
  const totalPages = Math.max(1, Math.ceil((preview?.total ?? 0) / LIMIT))

  return (
    <ModalShell onClose={onClose} maxW="max-w-4xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900">Registros procesados</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {preview ? `${preview.total.toLocaleString('es-AR')} filas` : 'Cargando...'}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100 shrink-0">
        <span className="text-xs text-gray-400">Vista previa — hasta 50 filas por página</span>
        <div className="flex items-center gap-1">
          <button disabled={page === 1} onClick={() => onPage(1)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">«</button>
          <button disabled={page === 1} onClick={() => onPage(page - 1)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">‹</button>
          <span className="px-2 text-xs text-gray-500">{page}/{totalPages}</span>
          <button disabled={page === totalPages} onClick={() => onPage(page + 1)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">›</button>
          <button disabled={page === totalPages} onClick={() => onPage(totalPages)}
            className="px-2 py-0.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50">»</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading && !preview && <p className="text-xs text-gray-400 text-center py-10">Cargando...</p>}
        {preview && (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr>
                {preview.cols.map((c) => (
                  <th key={c} className="px-3 py-2 text-left font-semibold text-gray-500 whitespace-nowrap border-b border-gray-200">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className={i % 2 ? 'bg-gray-50/50' : ''}>
                  {preview.cols.map((c) => (
                    <td key={c} className="px-3 py-1.5 text-gray-700 whitespace-nowrap border-b border-gray-50 max-w-[200px] truncate">
                      {row[c] === null || row[c] === undefined ? <span className="text-gray-300">—</span> : String(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </ModalShell>
  )
}