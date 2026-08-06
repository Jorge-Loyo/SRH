import { useState, useRef } from 'react'
import { altaCargoApi } from '../../api/altaCargoApi'
import { ArrowUpTrayIcon, DocumentIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

export default function SubirDataPage() {
  const [file,     setFile]     = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.match(/\.xlsx?$/i)) { setError('Solo se aceptan archivos .xlsx'); return }
    setFile(f); setResult(null); setError(null)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await altaCargoApi.uploadDotacion(file)
      setResult(r)
      setFile(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700">Subir dotación</h2>
        <p className="text-xs text-gray-400 mt-0.5">Cargá el Excel de dotación MSGC. Los registros existentes se actualizan por ID SIAL, los nuevos se insertan.</p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => handleFile(e.target.files[0])} />
        <ArrowUpTrayIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">Arrastrá el archivo acá o <span className="text-primary-600 font-medium">hacé click para seleccionar</span></p>
        <p className="text-xs text-gray-400 mt-1">Solo archivos .xlsx</p>
      </div>

      {/* Archivo seleccionado */}
      {file && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
          <DocumentIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button type="button" onClick={handleUpload} disabled={loading}
            className="btn-primary text-xs px-4 py-1.5 flex-shrink-0">
            {loading ? 'Procesando...' : 'Subir'}
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
          Procesando el archivo, esto puede tardar unos minutos...
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-800">Carga completada</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total',       value: result.total },
              { label: 'Insertados',  value: result.inserted },
              { label: 'Actualizados', value: result.updated },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-white border border-green-100 p-3 text-center">
                <p className="text-xl font-bold text-gray-800">{s.value?.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-start gap-2 p-4 rounded-lg bg-red-50 border border-red-200">
          <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
