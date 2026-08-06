import { CloudArrowUpIcon } from '@heroicons/react/24/outline'
import Spinner from '../../../components/ui/Spinner'

export default function CargaMasivaUploader({ periodo, onPeriodoChange, onFileChange, onAnalizar, loading, fileInputRef }) {
  return (
    <div className="max-w-lg bg-white border border-gray-200 rounded-lg p-5">
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Período (AAAA-MM)</label>
        <input
          type="text"
          value={periodo}
          onChange={(e) => onPeriodoChange(e.target.value.trim())}
          placeholder="2026-07"
          className="form-input text-sm w-40 py-1.5"
        />
      </div>
      <div className="mb-5">
        <label className="block text-xs font-medium text-gray-500 mb-1">Archivo (.xlsx)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="text-sm"
        />
      </div>
      <button onClick={onAnalizar} disabled={loading} className="btn-primary flex items-center gap-2">
        {loading ? <Spinner size="sm" /> : <CloudArrowUpIcon className="w-4 h-4" />}
        Analizar archivo
      </button>
    </div>
  )
}
