import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon,
  ChevronUpIcon, ChevronDownIcon, PencilSquareIcon, TrashIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { bajasApi } from '../../api/concursalesApi'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import ConfirmModal from '../../components/ui/ConfirmModal'
import {
  formatDate,
  OPCIONES_ESCALAFON_BAJAS,
  OPCIONES_ESCALAFON_SEGUIMIENTO,
  OPCIONES_USUARIOS,
  OPCIONES_ORIGEN,
  OPCIONES_TIPO_EFECTOR,
  OPCIONES_UNIFICADOR_PUESTOS,
  OPCIONES_MOTIVO_BAJA,
  getPuestoOptions,
  getEspecialidadOptions,
  SIGLAS_DATA,
} from '../../utils/concursalesHelpers'
import { exportBajasToExcel } from '../../utils/exportReport'
import BajaForm from './BajaForm'

const PAGE_SIZE = 50

const EMPTY_FILTERS = {
  // Identificación
  usuario:            '',
  origen:             '',
  // Efector
  sigla:              '',
  tipo_efector:       '',
  // Datos funcionales (con cascada)
  unificador_puestos: '',
  escalafon:          '',
  pou_pof:            '',
  puesto_baja:        '',
  especialidad_baja:  '',
  // Fechas y expediente
  motivo_baja:        '',
  // Concurso
  genera_concurso:    '',
}

function GeneraBadge({ val }) {
  if (!val) return <span className="text-gray-400">—</span>
  const isYes = val === true || String(val).toUpperCase() === 'SI'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      isYes ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`inline-block w-2 h-2 rounded-sm ${isYes ? 'bg-green-500' : 'bg-gray-400'}`} />
      {isYes ? 'Sí' : 'No'}
    </span>
  )
}

const CODIGOS_CEETPS = [87, 85, 83]
const BAJAS_WRITE_ROLES = ['admin', 'editor', 'gerencia']

export default function BajasConsolidadasPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = BAJAS_WRITE_ROLES.includes(user?.role)

  // ─── State ─────────────────────────────────────────────────────────────────
  const [rows, setRows]           = useState([])
  const [count, setCount]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [page, setPage]           = useState(1)

  const [search, setSearch]           = useState('')
  const [filters, setFilters]         = useState({ ...EMPTY_FILTERS })
  const [showFilters, setShowFilters] = useState(false)

  const [sortBy, setSortBy]   = useState('id')
  const [sortDir, setSortDir] = useState('DESC')

  const [formOpen, setFormOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [viewTarget, setViewTarget] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [exporting, setExporting]   = useState(false)

  const tableRef = useRef(null)

  // ─── Opciones dinámicas (cascada) ──────────────────────────────────────────
  const puestoOptions = useMemo(
    () => getPuestoOptions(filters.unificador_puestos, filters.escalafon),
    [filters.unificador_puestos, filters.escalafon]
  )
  const especialidadOptions = useMemo(
    () => getEspecialidadOptions(filters.puesto_baja, filters.escalafon),
    [filters.puesto_baja, filters.escalafon]
  )

  // ─── Carga de datos ────────────────────────────────────────────────────────
  const buildParams = useCallback((extras = {}) => {
    const p = { sort: sortBy, order: sortDir, ...extras }
    if (search)                      p.search             = search
    if (filters.usuario)             p.usuario            = filters.usuario
    if (filters.origen)              p.origen             = filters.origen
    if (filters.sigla)               p.sigla              = filters.sigla
    if (filters.tipo_efector)        p.tipo_efector       = filters.tipo_efector
    if (filters.unificador_puestos)  p.unificador_puestos = filters.unificador_puestos
    if (filters.escalafon)           p.escalafon          = filters.escalafon
    if (filters.pou_pof)             p.pou_pof            = filters.pou_pof
    if (filters.puesto_baja)         p.puesto_baja        = filters.puesto_baja
    if (filters.especialidad_baja)   p.especialidad_baja  = filters.especialidad_baja
    if (filters.motivo_baja)         p.motivo_baja        = filters.motivo_baja
    if (filters.genera_concurso)     p.genera_concurso    = filters.genera_concurso
    return p
  }, [sortBy, sortDir, search, filters])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await bajasApi.list(buildParams({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }))
      setRows(data.data ?? [])
      setCount(data.meta?.count ?? 0)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, buildParams])

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'ASC' ? 'DESC' : 'ASC')
    else { setSortBy(col); setSortDir('ASC') }
    setPage(1)
  }

  // Setter simple para filtros sin cascada
  const setFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }))
    setPage(1)
  }

  // Setter con cascada: recalcula puesto y especialidad si cambia unificador o escalafon
  const setFilterCascade = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }

      // Recomputar opciones de puesto con los nuevos valores
      const newPuestoOpts = getPuestoOptions(next.unificador_puestos, next.escalafon)
      if (next.puesto_baja && !newPuestoOpts.includes(next.puesto_baja)) {
        next.puesto_baja = ''
        next.especialidad_baja = ''
      }

      // Recomputar opciones de especialidad
      if (next.puesto_baja) {
        const newEspOpts = getEspecialidadOptions(next.puesto_baja, next.escalafon)
        if (next.especialidad_baja && !newEspOpts.includes(next.especialidad_baja)) {
          next.especialidad_baja = ''
        }
      } else {
        next.especialidad_baja = ''
      }

      return next
    })
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setFilters({ ...EMPTY_FILTERS })
    setPage(1)
  }

  const hasFilters = search || Object.values(filters).some(Boolean)
  const activeInSection = (keys) => keys.filter(k => filters[k]).length

  const openCreate  = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit    = (row) => { setEditTarget(row); setFormOpen(true) }
  const openView    = (row) => { setViewTarget(row) }
  const closeForm   = () => { setFormOpen(false); setEditTarget(null) }
  const handleSaved = () => { closeForm(); fetchData() }

  const handleExport = async (filtered) => {
    setExporting(true)
    try {
      const params = filtered
        ? buildParams({ limit: 9999 })
        : { limit: 9999, sort: sortBy, order: sortDir }
      const data = await bajasApi.list(params)
      exportBajasToExcel(data.data ?? [], `bajas-${filtered ? 'filtrado' : 'completo'}.xlsx`)
    } catch (e) {
      alert('Error al exportar: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!confirmDel) return
    try {
      await bajasApi.remove(confirmDel.id)
      setConfirmDel(null)
      fetchData()
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-gray-300 ml-1">↕</span>
    return sortDir === 'ASC'
      ? <ChevronUpIcon className="w-3 h-3 inline ml-1 text-primary-600" />
      : <ChevronDownIcon className="w-3 h-3 inline ml-1 text-primary-600" />
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bajas Consolidadas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Registro de desvinculaciones de personal</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Nueva baja
          </button>
        )}
      </div>

      {/* Barra de búsqueda + botón filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por nombre o CUIL..."
            className="form-input pl-9 text-sm w-full"
          />
        </div>

        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            showFilters || hasFilters
              ? 'border-primary-400 bg-primary-50 text-primary-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <FunnelIcon className="w-4 h-4" />
          Filtros
          {hasFilters && (
            <span className="ml-1 bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">!</span>
          )}
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500">
            <XMarkIcon className="w-4 h-4" /> Limpiar
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleExport(true)}
            disabled={exporting || !hasFilters}
            title={hasFilters ? 'Exportar registros filtrados' : 'Aplicá filtros primero'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-green-50 hover:border-green-400 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" /> Excel filtrado
          </button>
          <button
            onClick={() => handleExport(false)}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-green-50 hover:border-green-400 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" /> Excel completo
          </button>
        </div>
      </div>

      {/* ── Panel de filtros — acordeón por sección ── */}
      {showFilters && (
        <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">

          {/* 1 — Identificación */}
          <FilterAccSection title="Identificación" activeCount={activeInSection(['usuario', 'origen'])}>
            <FilterSelect label="Usuario" value={filters.usuario}
              onChange={v => setFilter('usuario', v)} options={OPCIONES_USUARIOS} />
            <FilterSelect label="Origen" value={filters.origen}
              onChange={v => setFilter('origen', v)} options={OPCIONES_ORIGEN} />
          </FilterAccSection>

          {/* 2 — Efector */}
          <FilterAccSection title="Efector" activeCount={activeInSection(['sigla', 'tipo_efector'])}>
            <FilterSearchSelect
              label="Sigla"
              value={filters.sigla}
              onChange={v => setFilter('sigla', v)}
              options={SIGLAS_DATA.map(s => ({ value: s.sigla, label: `${s.sigla} — ${s.descr}` }))}
            />
            <FilterSelect label="Tipo de efector" value={filters.tipo_efector}
              onChange={v => setFilter('tipo_efector', v)} options={OPCIONES_TIPO_EFECTOR} />
          </FilterAccSection>

          {/* 3 — Datos funcionales (con cascada) */}
          <FilterAccSection
            title="Datos funcionales"
            activeCount={activeInSection(['unificador_puestos', 'escalafon', 'pou_pof', 'puesto_baja', 'especialidad_baja'])}
          >
            <FilterSelect label="Unificador de puestos" value={filters.unificador_puestos}
              onChange={v => setFilterCascade('unificador_puestos', v)} options={OPCIONES_UNIFICADOR_PUESTOS} />

            <FilterSelect label="Escalafón" value={filters.escalafon}
              onChange={v => setFilterCascade('escalafon', v)} options={OPCIONES_ESCALAFON_BAJAS} />

            <FilterSelect label="POU / POF" value={filters.pou_pof}
              onChange={v => setFilter('pou_pof', v)} options={OPCIONES_ESCALAFON_SEGUIMIENTO} />

            <FilterSearchSelect
              label={`Puesto baja${puestoOptions.length < 30 && (filters.unificador_puestos || filters.escalafon) ? ` (${puestoOptions.length})` : ''}`}
              value={filters.puesto_baja}
              onChange={v => setFilterCascade('puesto_baja', v)}
              options={puestoOptions}
              hint={!filters.unificador_puestos && !filters.escalafon ? 'Filtrá por Unificador o Escalafón para acotar opciones' : null}
            />

            <FilterSearchSelect
              label={`Especialidad baja${especialidadOptions.length < 30 && filters.puesto_baja ? ` (${especialidadOptions.length})` : ''}`}
              value={filters.especialidad_baja}
              onChange={v => setFilter('especialidad_baja', v)}
              options={especialidadOptions}
              disabled={!filters.puesto_baja}
              hint={!filters.puesto_baja ? 'Seleccioná un puesto primero' : null}
            />
          </FilterAccSection>

          {/* 4 — Fechas y expediente */}
          <FilterAccSection title="Fechas y expediente" activeCount={activeInSection(['motivo_baja'])}>
            <FilterSelect label="Motivo de baja" value={filters.motivo_baja}
              onChange={v => setFilter('motivo_baja', v)} options={OPCIONES_MOTIVO_BAJA} />
          </FilterAccSection>

          {/* 5 — Concurso */}
          <FilterAccSection title="Concurso" activeCount={activeInSection(['genera_concurso'])}>
            <FilterSelect label="Genera concurso" value={filters.genera_concurso}
              onChange={v => setFilter('genera_concurso', v)} options={['SI', 'NO']} />
          </FilterAccSection>

        </div>
      )}

      {/* Errores */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>23 columnas</span>
        <span>
          {loading
            ? 'Cargando...'
            : `${count.toLocaleString('es-AR')} registro${count !== 1 ? 's' : ''}${totalPages > 1 ? ` · pág. ${page} de ${totalPages}` : ''}`}
        </span>
      </div>

      {/* Tabla */}
      <div
        ref={tableRef}
        className="overflow-auto rounded-lg border border-gray-200 flex-1"
        style={{ maxHeight: 'calc(100vh - 360px)', minHeight: '280px' }}
      >
        <table className="text-sm border-collapse" style={{ minWidth: '2900px' }}>
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {[
                { col: 'usuario',                label: 'Usuario'               },
                { col: 'origen',                 label: 'Origen'                },
                { col: 'ex_baja',                label: 'EX Baja / Ampliación'  },
                { col: 'sigla',                  label: 'Sigla'                 },
                { col: 'efector',                label: 'Efector'               },
                { col: 'tipo_efector',           label: 'Tipo efector'          },
                { col: 'codigo_cargo',           label: 'Código cargo'          },
                { col: 'cargo_baja',             label: 'ID SIAL'               },
                { col: 'cuil',                   label: 'CUIL'                  },
                { col: 'nombre_apellido',        label: 'Nombre y Apellido'     },
                { col: 'codigo_registro',        label: 'Cód. registro'         },
                { col: 'unificador_puestos',     label: 'Unificador puestos'    },
                { col: 'pou_pof',                label: 'POU/POF'               },
                { col: 'escalafon',              label: 'Escalafón'             },
                { col: 'puesto_baja',            label: 'Puesto baja'           },
                { col: 'especialidad_baja',      label: 'Especialidad baja'     },
                { col: 'partida_presupuestaria', label: 'Partida presup.'       },
                { col: 'fecha_baja',             label: 'Fecha baja'            },
                { col: 'carga_horaria',          label: 'Carga horaria'         },
                { col: 'motivo_baja',            label: 'Motivo baja'           },
                { col: 'doc_respaldatoria',      label: 'Doc. respaldatoria'    },
                { col: 'fecha_pase_paralelo',    label: 'F. pase paralelo'      },
                { col: 'genera_concurso',        label: 'Genera concurso'       },
              ].map(({ col, label }) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
                >
                  {label}<SortIcon col={col} />
                </th>
              ))}
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide sticky right-0 bg-gray-50 whitespace-nowrap">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={24} className="py-10 text-center"><Spinner /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={24} className="py-10 text-center text-gray-400 text-sm">Sin registros</td></tr>
            ) : rows.map(row => (
              <tr
                key={row.id}
                onClick={() => openView(row)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.usuario || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.origen || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.ex_baja || '—'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {row.sigla ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 font-mono">
                      {row.sigla}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.efector || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.tipo_efector || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.codigo_cargo || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.cargo_baja || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-600 whitespace-nowrap">{row.cuil || '—'}</td>
                <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{row.nombre_apellido || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.codigo_registro ?? '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.unificador_puestos || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.pou_pof || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.escalafon || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.puesto_baja || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.especialidad_baja || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.partida_presupuestaria || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_baja)}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.carga_horaria || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.motivo_baja || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.doc_respaldatoria || '—'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_pase_paralelo)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap"><GeneraBadge val={row.genera_concurso} /></td>
                <td className="px-3 py-2.5 sticky right-0 bg-white" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <button onClick={() => openEdit(row)}
                        className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Editar">
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    )}
                    {(Number(row.codigo_registro) === 37 || CODIGOS_CEETPS.includes(Number(row.codigo_registro))) && (
                      <button
                        onClick={() => navigate(
                          CODIGOS_CEETPS.includes(Number(row.codigo_registro))
                            ? `/concursales/seguimiento-ceetps?id_baja=${row.id}`
                            : `/concursales/seguimiento-cph?id_baja=${row.id}`
                        )}
                        className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={CODIGOS_CEETPS.includes(Number(row.codigo_registro)) ? 'Ver seguimiento CEETPS' : 'Ver seguimiento CPH'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </button>
                    )}
                    {canEdit && (
                      <button
                        onClick={() => setConfirmDel({ id: row.id, nombre: row.nombre_apellido || `#${row.id}` })}
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <Pagination currentPage={page} totalPages={totalPages} totalRecords={count}
        onPageChange={setPage} loading={loading} tableRef={tableRef} />

      {formOpen && <BajaForm initial={editTarget} onSaved={handleSaved} onClose={closeForm} />}
      {viewTarget && <BajaForm initial={viewTarget} readOnly onSaved={() => {}} onClose={() => setViewTarget(null)} />}

      <ConfirmModal
        open={!!confirmDel}
        title="Eliminar baja"
        message={`¿Confirmás la eliminación de "${confirmDel?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar" danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}

// ─── FilterAccSection — sección desplegable del acordeón ─────────────────────
function FilterAccSection({ title, activeCount = 0, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-widest transition-colors ${
          open
            ? 'bg-primary-50 text-primary-700 rounded-t-lg'
            : 'bg-white text-gray-500 hover:bg-gray-50 rounded-lg'
        }`}
      >
        <span className="flex items-center gap-2">
          <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? '' : '-rotate-90'}`} />
          {title}
        </span>
        {activeCount > 0 && (
          <span className="bg-primary-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
            {activeCount}
          </span>
        )}
      </button>
      {open && (
        <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-white border-t border-gray-100 rounded-b-lg">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── FilterSelect ─────────────────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options = [], disabled = false, hint = null }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`form-input text-sm w-full ${disabled ? 'opacity-50 cursor-default' : ''}`}
      >
        <option value="">Todos</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {hint && <p className="mt-0.5 text-[10px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  )
}

// ─── FilterSearchSelect — select con buscador integrado (dropdown fixed) ─────
// options puede ser string[] o {value, label}[]
function FilterSearchSelect({ label, value, onChange, options = [], disabled = false, hint = null }) {
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [dropStyle, setDropStyle] = useState({})
  const wrapRef                   = useRef(null)
  const dropRef                   = useRef(null)
  const triggerRef                = useRef(null)
  const inputRef                  = useRef(null)

  const normalized = useMemo(() =>
    options.map(o => typeof o === 'string' ? { value: o, label: o } : o),
  [options])

  const filtered = useMemo(() => {
    if (!query.trim()) return normalized
    const q = query.toLowerCase()
    return normalized.filter(o => o.label.toLowerCase().includes(q))
  }, [normalized, query])

  // Click fuera → cerrar
  useEffect(() => {
    const handler = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        dropRef.current  && !dropRef.current.contains(e.target)
      ) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Scroll fuera del dropdown → cerrar (evita desalineación del fixed)
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropRef.current && dropRef.current.contains(e.target)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('scroll', handler, true)
    return () => document.removeEventListener('scroll', handler, true)
  }, [open])

  const handleSelect = (val) => {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  const openDropdown = () => {
    if (disabled) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const minW = Math.max(rect.width, 260)
      setDropStyle({
        position: 'fixed',
        zIndex: 9999,
        top:  rect.bottom + 4,
        left: rect.left,
        width: minW,
      })
    }
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const selectedLabel = normalized.find(o => o.value === value)?.label ?? value

  return (
    <div ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative" ref={triggerRef}>
        {!open ? (
          <button
            type="button"
            onClick={openDropdown}
            disabled={disabled}
            className={`form-input text-sm w-full text-left flex items-center pr-7 ${disabled ? 'opacity-50 cursor-default' : ''}`}
          >
            {value
              ? <span className="text-gray-900 truncate block flex-1 min-w-0">{selectedLabel}</span>
              : <span className="text-gray-400">Todos</span>
            }
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2" />
          </button>
        ) : (
          <>
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none z-10" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="form-input text-sm w-full pl-8"
            />
          </>
        )}

        {value && !open && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(''); setQuery('') }}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-500 transition-colors z-10"
            title="Limpiar"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown con position:fixed para escapar cualquier overflow:hidden del padre */}
      {open && (
        <div ref={dropRef} style={dropStyle} className="bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-b border-gray-100 ${!value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Todos
            </button>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</div>
            ) : filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${o.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {hint && <p className="mt-0.5 text-[10px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  )
}
