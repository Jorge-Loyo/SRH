import { useState, useEffect, useCallback } from 'react'
import { MagnifyingGlassIcon, ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { altaCargoApi } from '../../api/altaCargoApi'
import Spinner from '../../components/ui/Spinner'
import Pagination from '../../components/ui/Pagination'

const PAGE_SIZE = 50

function descargarAlta(row) {
  const fecha = new Date().toLocaleDateString('es-AR')
  const lineas = []
  lineas.push('ALTA DE CARGOS')
  lineas.push(`Fecha de descarga: ${fecha}`)
  lineas.push(`Fecha de registro: ${row.fecha_registro ? String(row.fecha_registro).slice(0, 10) : '—'}`)
  lineas.push(`${row.tipo_alta === 'estructura' ? 'Decreto' : 'Expediente'}: ${row.documento || '—'}`)
  lineas.push(`Tipo: ${row.tipo_alta === 'estructura' ? 'Estructura' : 'Ejecución'}`)
  if (row.norma_referencia) lineas.push(`Norma: ${row.norma_referencia}`)
  lineas.push(`Total de cargos: ${row.total_cargos}`)
  lineas.push('')
  if (row.siglas?.length)       lineas.push(`Siglas: ${row.siglas.join(', ')}`)
  if (row.carreras?.length)     lineas.push(`Carreras: ${row.carreras.join(', ')}`)
  if (row.modalidades?.length)  lineas.push(`Modalidades: ${row.modalidades.join(', ')}`)
  if (row.puestos?.length)      lineas.push(`Puestos: ${row.puestos.join(', ')}`)
  if (row.especialidades?.length) lineas.push(`Especialidades: ${row.especialidades.join(', ')}`)
  if (row.cargo_desde)          lineas.push(`Desde: ${String(row.cargo_desde).slice(0, 10)}`)
  lineas.push('')
  lineas.push('Códigos asignados:')
  ;(row.codigos || []).forEach((cod, i) => lineas.push(`  #${i + 1}  ${cod}`))

  const blob = new Blob([lineas.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `alta-cargos-${(row.documento || 'sin-doc').replace(/[^a-zA-Z0-9-]/g, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function AltaCard({ row }) {
  const [expanded, setExpanded] = useState(false)
  const fecha = row.fecha_registro ? String(row.fecha_registro).slice(0, 10) : '—'
  const desde = row.cargo_desde   ? String(row.cargo_desde).slice(0, 10)    : '—'

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div
        className="px-4 py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${row.tipo_alta === 'estructura' ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'}`}>
              {row.tipo_alta === 'estructura' ? 'Estructura' : 'Ejecución'}
            </span>
            {row.carreras?.map(c => (
              <span key={c} className="text-xs font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{c}</span>
            ))}
            {row.siglas?.map(s => (
              <span key={s} className="text-xs text-gray-500">{s}</span>
            ))}
            <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
              {row.total_cargos} cargo{row.total_cargos !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 truncate">{row.documento || '—'}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-400">Registrado: {fecha}</span>
            {desde !== '—' && <span className="text-xs text-gray-400">Desde: {desde}</span>}
            {row.norma_referencia && <span className="text-xs text-gray-400">{row.norma_referencia}</span>}
          </div>
          {row.puestos?.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{row.puestos.slice(0, 2).join(' · ')}{row.puestos.length > 2 ? ` +${row.puestos.length - 2}` : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); descargarAlta(row) }}
            title="Descargar documento"
            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
          </button>
          <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Códigos asignados</p>
          <div className="flex flex-wrap gap-1.5">
            {(row.codigos || []).map((cod, i) => (
              <span key={cod} className="font-mono text-xs font-bold text-primary-700 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded">
                #{i + 1} {cod}
              </span>
            ))}
          </div>
          {row.especialidades?.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">Especialidades: {row.especialidades.join(', ')}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function RecientesAltasPage() {
  const [rows, setRows]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [q, setQ]             = useState('')
  const [qInput, setQInput]   = useState('')

  const load = useCallback(async (p = 1, search = q) => {
    setLoading(true); setError(null)
    try {
      const res = await altaCargoApi.listRecientes({
        limit: PAGE_SIZE,
        offset: (p - 1) * PAGE_SIZE,
        ...(search ? { q: search } : {}),
      })
      setRows(res.data ?? [])
      setTotal(res.meta?.total ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load(page) }, [load, page])

  const handleSearch = (e) => {
    e.preventDefault()
    setQ(qInput)
    setPage(1)
    load(1, qInput)
  }

  const clearSearch = () => {
    setQ(''); setQInput(''); setPage(1); load(1, '')
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="px-6 py-8 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Altas recientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Historial de altas de cargos registradas</p>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={qInput}
            onChange={e => setQInput(e.target.value)}
            placeholder="Buscar por expediente, sigla, carrera..."
            className="form-input pl-9 text-sm w-full"
          />
        </div>
        <button type="submit" className="btn-primary px-4 py-2 text-sm">Buscar</button>
        {q && (
          <button type="button" onClick={clearSearch} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
            <XMarkIcon className="w-4 h-4" /> Limpiar
          </button>
        )}
      </form>

      <div className="text-xs text-gray-400 px-1">
        {loading ? 'Cargando...' : `${total.toLocaleString('es-AR')} alta${total !== 1 ? 's' : ''}${totalPages > 1 ? ` · pág. ${page} de ${totalPages}` : ''}`}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Sin resultados</p>
      ) : (
        <div className="space-y-2">
          {rows.map(row => <AltaCard key={row.id_alta} row={row} />)}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalRecords={total}
          onPageChange={p => { setPage(p); load(p) }}
          loading={loading}
        />
      )}
    </div>
  )
}
