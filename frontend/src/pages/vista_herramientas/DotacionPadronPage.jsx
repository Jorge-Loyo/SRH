import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { FunnelIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { apiGet, apiPost } from '../../api/client'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import MultiSelectDropdown from '../../components/ui/MultiSelectDropdown'

// ─── Columnas visibles y sus labels ──────────────────────────────────────────

const COLUMNS = [
  { key: 'id_sial',               label: 'ID SIAL' },
  { key: 'cuil',                  label: 'CUIL' },
  { key: 'ayn',                   label: 'Apellido y Nombre' },
  { key: 'siglas',                label: 'Sigla' },
  { key: 'escalafon',             label: 'Escalafón' },
  { key: 'literal_cr',            label: 'Cód. Registro' },
  { key: 'literal_puesto',        label: 'Puesto' },
  { key: 'especialidad',          label: 'Especialidad' },
  { key: 'agrupador',             label: 'Agrupador' },
  { key: 'unificador_de_puestos', label: 'Unificador' },
  { key: 'situacion_de_revista',  label: 'Sit. Revista' },
  { key: 'estado',                label: 'Estado' },
  { key: 'universo_totalizador',  label: 'Universo' },
  { key: 'tipo_hospital_sigla',   label: 'Tipo Hospital' },
  { key: 'fecha_proceso',         label: 'Fecha Proceso' },
]

const SORTABLE = new Set(['id_sial','cuil','ayn','siglas','escalafon',
  'literal_puesto','especialidad','agrupador','situacion_de_revista','estado','fecha_proceso'])

const FILTER_COLS = [
  { key: 'siglas',                label: 'Sigla' },
  { key: 'escalafon',             label: 'Escalafón' },
  { key: 'literal_puesto',        label: 'Puesto' },
  { key: 'especialidad',          label: 'Especialidad' },
  { key: 'agrupador',             label: 'Agrupador' },
  { key: 'unificador_de_puestos', label: 'Unificador' },
  { key: 'situacion_de_revista',  label: 'Sit. Revista' },
  { key: 'estado',                label: 'Estado' },
  { key: 'universo_totalizador',  label: 'Universo' },
  { key: 'tipo_hospital_sigla',   label: 'Tipo Hospital' },
]

const EMPTY_FILTERS = Object.fromEntries(FILTER_COLS.map(f => [f.key, []]))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCell(key, val) {
  if (val === null || val === undefined || val === '') return <span className="text-gray-300">—</span>
  if (key === 'fecha_proceso') {
    const d = new Date(val)
    return isNaN(d) ? val : d.toLocaleDateString('es-AR')
  }
  return String(val)
}

function estadoBadge(val) {
  if (!val) return <span className="text-gray-300">—</span>
  const v = String(val).toLowerCase()
  const cls = v === 'activo'   ? 'bg-green-100 text-green-700'
            : v === 'vacante'  ? 'bg-amber-100 text-amber-700'
            : v === 'baja'     ? 'bg-red-100 text-red-600'
            : 'bg-gray-100 text-gray-600'
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${cls}`}>{val}</span>
}

// ─── Tabla ────────────────────────────────────────────────────────────────────

const DataTable = memo(({ rows, sortBy, sortDir, onSort, tableRef }) => (
  <div ref={tableRef} className="overflow-auto rounded-lg border border-gray-200 flex-1" style={{ minHeight: 250 }}>
    <table className="min-w-full text-sm border-collapse">
      <thead className="sticky top-0 z-10 bg-gray-50">
        <tr>
          {COLUMNS.map(({ key, label }) => (
            <th key={key}
              onClick={() => SORTABLE.has(key) && onSort(key)}
              className={`px-3 py-2.5 text-left text-xs font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200
                ${SORTABLE.has(key) ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}`}>
              <div className="flex items-center gap-1">
                {label}
                {sortBy === key
                  ? sortDir === 'ASC'
                    ? <ChevronUpIcon className="w-3 h-3 text-primary-600" />
                    : <ChevronDownIcon className="w-3 h-3 text-primary-600" />
                  : SORTABLE.has(key) && <span className="w-3 h-3 inline-block" />}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id_sial ?? i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
            {COLUMNS.map(({ key }) => (
              <td key={key} className="px-3 py-1.5 whitespace-nowrap text-gray-800 border-b border-gray-100 max-w-[220px] truncate">
                {key === 'estado' ? estadoBadge(row[key]) : fmtCell(key, row[key])}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-gray-400">
              Sin registros para los filtros seleccionados
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
))
DataTable.displayName = 'DataTable'

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DotacionPadronPage() {
  const [rows,          setRows]          = useState([])
  const [total,         setTotal]         = useState(0)
  const [page,          setPage]          = useState(1)
  const [perPage,       setPerPage]       = useState(50)
  const [sortBy,        setSortBy]        = useState('ayn')
  const [sortDir,       setSortDir]       = useState('ASC')
  const [search,        setSearch]        = useState('')
  const [filters,       setFilters]       = useState(EMPTY_FILTERS)
  const [distinctVals,  setDistinctVals]  = useState(EMPTY_FILTERS)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [showFilters,   setShowFilters]   = useState(true)
  const [fechaProceso,  setFechaProceso]  = useState(null)
  const [syncing,       setSyncing]       = useState(false)
  const [syncResult,    setSyncResult]    = useState(null)
  const tableRef = useRef(null)

  // refs para evitar stale closures
  const stateRef = useRef({})
  stateRef.current = { page, perPage, sortBy, sortDir, search, filters }

  const buildParams = useCallback((overrides = {}) => {
    const s = { ...stateRef.current, ...overrides }
    const p = {
      page: s.page, perPage: s.perPage,
      sortBy: s.sortBy, sortDir: s.sortDir,
    }
    if (s.search) p.search = s.search
    FILTER_COLS.forEach(({ key }) => {
      if (s.filters[key]?.length) p[key] = s.filters[key].join(',')
    })
    return p
  }, [])

  const fetchData = useCallback(async (overrides = {}) => {
    setLoading(true); setError(null)
    try {
      const data = await apiGet('/api/dotacion/lista', buildParams(overrides))
      setRows(data.rows)
      setTotal(data.total)
      if (data.rows[0]?.fecha_proceso) setFechaProceso(data.rows[0].fecha_proceso)
      if (data.distinctValues) setDistinctVals(data.distinctValues)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  const handleSync = useCallback(async () => {
    setSyncing(true); setSyncResult(null)
    try {
      const result = await apiPost('/api/dotacion/cargos/sincronizar')
      setSyncResult({ ok: true, ...result })
    } catch (e) {
      setSyncResult({ ok: false, error: e.message })
    } finally {
      setSyncing(false)
    }
  }, [])

  // carga inicial
  useEffect(() => { fetchData() }, []) // eslint-disable-line

  // filtros con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      fetchData({ page: 1 })
    }, 300)
    return () => clearTimeout(t)
  }, [filters, search]) // eslint-disable-line

  const handleSort = useCallback(col => {
    const nextDir = sortBy === col && sortDir === 'ASC' ? 'DESC' : 'ASC'
    setSortBy(col); setSortDir(nextDir)
    fetchData({ page: 1, sortBy: col, sortDir: nextDir })
  }, [sortBy, sortDir, fetchData])

  const handlePageChange = useCallback(p => {
    setPage(p)
    fetchData({ page: p })
  }, [fetchData])

  const handlePerPage = useCallback(e => {
    const n = Number(e.target.value)
    setPerPage(n); setPage(1)
    fetchData({ page: 1, perPage: n })
  }, [fetchData])

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS); setSearch('')
  }, [])

  const hasActiveFilters = useMemo(() =>
    search.trim() || FILTER_COLS.some(({ key }) => filters[key]?.length > 0)
  , [search, filters])

  const totalPages = Math.max(1, Math.ceil(total / perPage))

  const exportCSV = useCallback(() => {
    const header = COLUMNS.map(c => c.label).join(',')
    const body = rows.map(row =>
      COLUMNS.map(({ key }) => {
        const v = row[key] ?? ''
        return String(v).includes(',') ? `"${v}"` : v
      }).join(',')
    ).join('\n')
    const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `dotacion_padron_pag${page}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [rows, page])

  return (
    <div className="flex flex-col h-full">

      {/* Barra superior */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dotación — Padrón</h1>
            {fechaProceso && (
              <p className="text-xs text-gray-400">
                Proceso: {new Date(fechaProceso).toLocaleDateString('es-AR')} · {total.toLocaleString('es-AR')} registros
              </p>
            )}
          </div>
          <div className="flex-1" />

          <button onClick={handleSync} disabled={syncing}
            className="btn-secondary flex items-center gap-1.5 text-sm disabled:opacity-50">
            <ArrowPathIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando...' : 'Sincronizar cargos'}
          </button>

          {/* Búsqueda rápida */}
          <input
            type="text" value={search} placeholder="Buscar por nombre, CUIL o ID SIAL..."
            className="form-input text-sm w-64"
            onChange={e => setSearch(e.target.value)}
          />

          <button onClick={() => setShowFilters(v => !v)}
            className={`btn-secondary flex items-center gap-1.5 text-sm ${hasActiveFilters ? 'border-primary-500 text-primary-700' : ''}`}>
            <FunnelIcon className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-xs">!</span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-red-500 hover:text-red-700 flex items-center gap-1">
              <XMarkIcon className="w-3.5 h-3.5" />Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-10 gap-3">
            {FILTER_COLS.map(({ key, label }) => (
              <MultiSelectDropdown key={key} label={label}
                value={filters[key]} options={distinctVals[key] || []}
                onChange={v => setFilters(f => ({ ...f, [key]: v }))} />
            ))}
          </div>
        </div>
      )}

      {/* Resultado sincronización */}
      {syncResult && (
        <div className={`flex-shrink-0 mx-4 mt-2 px-4 py-2.5 rounded-lg text-sm flex items-center justify-between ${
          syncResult.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {syncResult.ok ? (
            <span>
              Sincronización completada — período <strong>{syncResult.periodo}</strong> ·
              {' '}<strong>{syncResult.insertados}</strong> nuevos ·
              {' '}<strong>{syncResult.actualizados}</strong> actualizados ·
              {' '}<strong>{syncResult.bajas}</strong> bajas ·
              {' '}<strong>{syncResult.personas_insertadas}</strong> personas nuevas
            </span>
          ) : (
            <span>Error: {syncResult.error}</span>
          )}
          <button onClick={() => setSyncResult(null)} className="ml-4 text-current opacity-60 hover:opacity-100">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-3 min-h-0">
        {error && (
          <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700 flex-shrink-0">
            {error}
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Spinner size="lg" />
              <span className="text-sm">Cargando padrón...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2 gap-2 flex-wrap flex-shrink-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {loading && <Spinner size="sm" />}
                <span>{total.toLocaleString('es-AR')} registros</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-gray-500">
                  Mostrar
                  <select value={perPage} onChange={handlePerPage} className="form-input text-sm py-1 w-20">
                    {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  por página
                </label>
                <button onClick={exportCSV} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <ArrowDownTrayIcon className="w-4 h-4" />CSV
                </button>
              </div>
            </div>

            <DataTable rows={rows} sortBy={sortBy} sortDir={sortDir} onSort={handleSort} tableRef={tableRef} />

            <div className="flex-shrink-0">
              <Pagination currentPage={page} totalPages={totalPages} totalRecords={total}
                onPageChange={handlePageChange} loading={loading} tableRef={tableRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
