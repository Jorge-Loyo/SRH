import React, { useRef, useState } from 'react'
import { ArrowUpTrayIcon, DocumentIcon, SparklesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'

export default function UploadStep({ file, busy, onPick, onClear, onExample, pendienteValidacion, hayPendienteExterno }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const handle = (f) => {
    if (!f) return
    if (!f.name.match(/\.xlsx?$/i)) return
    onPick(f)
  }

  // Bloqueo por validación pendiente
  if (hayPendienteExterno) {
    return (
      <section className="bg-white rounded-2xl border border-amber-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Archivo de Cargos Salud</h2>
        <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
          <span className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Hay una validación pendiente</p>
            <p className="text-xs text-gray-500 mt-1">
              El archivo <span className="font-medium text-gray-700">{pendienteValidacion?.filename ?? 'anterior'}</span> fue
              procesado y está esperando aprobación. Validá los cambios antes de subir un nuevo archivo.
            </p>
          </div>
          <button
            onClick={() => navigate('/seguridad/validacion')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary-700 text-white hover:bg-primary-800 font-medium"
          >
            Ir a Validación
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">Archivo de Cargos Salud</h2>

      {file ? (
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <DocumentIcon className="w-5 h-5 text-primary-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            {file.rows != null && (
              <p className="text-xs text-gray-400">{file.rows.toLocaleString('es-AR')} filas</p>
            )}
          </div>
          <button
            onClick={onClear}
            disabled={busy}
            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!busy) handle(e.dataTransfer.files[0]) }}
          onClick={() => !busy && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed text-center transition-colors
            ${busy ? 'opacity-40 cursor-not-allowed'
              : dragging ? 'border-primary-400 bg-primary-50'
              : 'border-gray-200 bg-gray-50 hover:border-gray-300 cursor-pointer'}`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={(e) => handle(e.target.files[0])} />
          <span className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-3">
            <ArrowUpTrayIcon className="w-5 h-5 text-gray-400" />
          </span>
          <p className="text-sm text-gray-500">
            Arrastrá el archivo o{' '}
            <span className="text-primary-600 font-medium">hacé click para seleccionar</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Solo .xlsx</p>
        </div>
      )}

      {!file && onExample && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={onExample}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-40"
          >
            <SparklesIcon className="w-3.5 h-3.5" />
            o cargá un archivo de ejemplo
          </button>
        </div>
      )}
    </section>
  )
}
