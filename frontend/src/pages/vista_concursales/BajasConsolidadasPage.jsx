import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import {
  PlusIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon,
  ChevronUpIcon, ChevronDownIcon, PencilSquareIcon, TrashIcon,
  ArrowDownTrayIcon, ArrowLeftIcon,
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
import {
  FilterAccSection, FilterSelect, FilterText, FilterDate,
  FilterSearchSelect, ConfirmDeleteModal,
} from './ConcursalesFilterWidgets'

const PAGE_SIZE = 50

// Metadatos visuales por origen (colores y etiquetas)
const ORIGEN_META = {
  'Alta por Baja':      { bg: 'bg-blue-50',   activeBg: 'bg-blue-100',   border: 'border-blue-200',   activeBorder: 'border-blue-500',   text: 'text-blue-800',   rowBorder: 'border-l-blue-400',   btnLabel: 'Nueva Alta por Baja'      },
  'AmpliaciÃ³n':         { bg: 'bg-green-50',  activeBg: 'bg-green-100',  border: 'border-green-200',  activeBorder: 'border-green-500',  text: 'text-green-800',  rowBorder: 'border-l-green-400',  btnLabel: 'Nueva AmpliaciÃ³n'         },
  'Cobertura DotaciÃ³n': { bg: 'bg-red-50',    activeBg: 'bg-red-100',    border: 'border-red-200',    activeBorder: 'border-red-500',    text: 'text-red-800',    rowBorder: 'border-l-red-400',    btnLabel: 'Nueva Cobertura DotaciÃ³n' },
  'POU a POF':          { bg: 'bg-violet-50', activeBg: 'bg-violet-100', border: 'border-violet-200', activeBorder: 'border-violet-500', text: 'text-violet-800', rowBorder: 'border-l-violet-400', btnLabel: 'Nueva POU a POF'          },
}

const EMPTY_FILTERS = {
  // IdentificaciÃ³n
  usuario:            '',
  // Efector
  sigla:              '',
  tipo_efector:       '',
  // Cargo
  ex_baja:                   '',
  codigo_cargo:              '',
  cargo_baja:                '',
  carga_horaria:             '',
  partida_presupuestaria:    '',
  // Datos funcionales (con cascada)
  unificador_puestos: '',
  escalafon:          '',
  pou_pof:            '',
  puesto_baja:        '',
  especialidad_baja:  '',
  // Fechas y expediente
  fecha_baja_desde:          '',
  fecha_baja_hasta:          '',
  motivo_baja:               '',
  fecha_pase_paralelo_desde: '',
  fecha_pase_paralelo_hasta: '',
  doc_respaldatoria:         '',
  // Concurso
  genera_concurso:    '',
  codigo_registro:    '',
}

function GeneraBadge({ val }) {
  if (!val) return <span className="text-gray-400">â€”</span>
  const isYes = val === true || String(val).toUpperCase() === 'SI'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
      isYes ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      <span className={`inline-block w-2 h-2 rounded-sm ${isYes ? 'bg-green-500' : 'bg-gray-400'}`} />
      {isYes ? 'SÃ­' : 'No'}
    </span>
  )
}

const CODIGOS_CEETPS = [87, 85, 83]
const BAJAS_WRITE_ROLES = ['admin', 'editor', 'gerencia']

export default function BajasConsolidadasPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canEdit = BAJAS_WRITE_ROLES.includes(user?.role)

  // â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [rows, setRows]                 = useState([])
  const [count, setCount]               = useState(0)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [page, setPage]                 = useState(1)
  const [selectedOrigen, setSelectedOrigen] = useState(null)
  const [kpiCounts, setKpiCounts]       = useState({})

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

  // â”€â”€â”€ Opciones dinÃ¡micas (cascada) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const puestoOptions = useMemo(
    () => getPuestoOptions(filters.unificador_puestos, filters.escalafon),
    [filters.unificador_puestos, filters.escalafon]
  )
  const especialidadOptions = useMemo(
    () => getEspecialidadOptions(filters.puesto_baja, filters.escalafon),
    [filters.puesto_baja, filters.escalafon]
  )

  // â”€â”€â”€ Carga de datos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const buildParams = useCallback((extras = {}) => {
    const p = { sort: sortBy, order: sortDir, ...extras }
    if (selectedOrigen)                    p.origenes                  = selectedOrigen
    if (search)                            p.search                    = search
    if (filters.usuario)                   p.usuario                   = filters.usuario
    // (origen driven by selectedOrigen / KPI, not by filters)
    if (filters.sigla)                     p.sigla                     = filters.sigla
    if (filters.tipo_efector)              p.tipo_efector              = filters.tipo_efector
    if (filters.ex_baja)                   p.ex_baja                   = filters.ex_baja
    if (filters.codigo_cargo)              p.codigo_cargo              = filters.codigo_cargo
    if (filters.cargo_baja)                p.cargo_baja                = filters.cargo_baja
    if (filters.carga_horaria)             p.carga_horaria             = filters.carga_horaria
    if (filters.partida_presupuestaria)    p.partida_presupuestaria    = filters.partida_presupuestaria
    if (filters.unificador_puestos)        p.unificador_puestos        = filters.unificador_puestos
    if (filters.escalafon)                 p.escalafon                 = filters.escalafon
    if (filters.pou_pof)                   p.pou_pof                   = filters.pou_pof
    if (filters.puesto_baja)               p.puesto_baja               = filters.puesto_baja
    if (filters.especialidad_baja)         p.especialidad_baja         = filters.especialidad_baja
    if (filters.fecha_baja_desde)          p.fecha_baja_desde          = filters.fecha_baja_desde
    if (filters.fecha_baja_hasta)          p.fecha_baja_hasta          = filters.fecha_baja_hasta
    if (filters.motivo_baja)               p.motivo_baja               = filters.motivo_baja
    if (filters.fecha_pase_paralelo_desde) p.fecha_pase_paralelo_desde = filters.fecha_pase_paralelo_desde
    if (filters.fecha_pase_paralelo_hasta) p.fecha_pase_paralelo_hasta = filters.fecha_pase_paralelo_hasta
    if (filters.doc_respaldatoria)         p.doc_respaldatoria         = filters.doc_respaldatoria
    if (filters.genera_concurso)           p.genera_concurso           = filters.genera_concurso
    if (filters.codigo_registro)           p.codigo_registro           = filters.codigo_registro
    return p
  }, [sortBy, sortDir, search, filters, selectedOrigen])

  const fetchKpiCounts = useCallback(async () => {
    try {
      const results = await Promise.all(
        OPCIONES_ORIGEN.map(origen => bajasApi.list({ origenes: origen, limit: 1, offset: 0 }))
      )
      const counts = {}
      OPCIONES_ORIGEN.forEach((origen, i) => { counts[origen] = results[i].meta?.count ?? 0 })
      setKpiCounts(counts)
    } catch {}
  }, [])

  const fetchData = useCallback(async () => {
    if (!selectedOrigen) {
      setRows([])
      setCount(0)
      return
    }
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
  }, [page, buildParams, selectedOrigen])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchKpiCounts() }, [fetchKpiCounts])

  // â”€â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const hasFilters = !!(search || Object.values(filters).some(Boolean))
  const activeInSection = (keys) => keys.filter(k => filters[k]).length

  const openCreate  = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit    = (row) => { setEditTarget(row); setFormOpen(true) }
  const openView    = (row) => { setViewTarget(row) }
  const closeForm   = () => { setFormOpen(false); setEditTarget(null) }
  const handleSaved = () => { closeForm(); fetchData(); fetchKpiCounts() }

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
      fetchKpiCounts()
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-gray-300 ml-1">â†•</span>
    return sortDir === 'ASC'
      ? <ChevronUpIcon className="w-3 h-3 inline ml-1 text-primary-600" />
      : <ChevronDownIcon className="w-3 h-3 inline ml-1 text-primary-600" />
  }

  const totalPages = Math.ceil(count / PAGE_SIZE)

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const goBack = () => {
    setSelectedOrigen(null)
    setSearch('')
    setFilters({ ...EMPTY_FILTERS })
    setShowFilters(false)
    setPage(1)
  }

  return (
    <div className="flex flex-col h-full">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          PANTALLA 1 â€” Selector de origen (2Ã—2 KPI)
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {!selectedOrigen && (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Bajas Consolidadas</h1>
              <p className="text-sm text-gray-500 mt-0.5">Registro de desvinculaciones de personal</p>
            </div>
          </div>

          {/* Grid 2Ã—2 centrado */}
          <div className="flex-1 flex items-center justify-center">
            <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
              {OPCIONES_ORIGEN.map(origen => {
                const meta = ORIGEN_META[origen]
                const cnt  = kpiCounts[origen]
                return (
                  <button
                    key={origen}
                    onClick={() => { setSelectedOrigen(origen); setPage(1) }}
                    className={`rounded-xl border-2 px-6 py-5 text-left transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-100 ${meta.bg} ${meta.border}`}
                  >
                    <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${meta.text} opacity-70`}>{origen}</div>
                    <div className={`text-4xl font-bold mb-1 ${meta.text}`}>
                      {cnt !== undefined ? cnt.toLocaleString('es-AR') : 'â€”'}
                    </div>
                    <div className={`text-xs ${meta.text} opacity-50`}>registros</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          PANTALLA 2 â€” Detalle del origen seleccionado
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {selectedOrigen && (
        <div className="flex flex-col h-full gap-4">

          {/* BotÃ³n volver */}
          <button
            onClick={goBack}
            className="self-start flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Volver
          </button>

          {/* Cabecera con origen coloreado */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">Bajas Consolidadas</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${ORIGEN_META[selectedOrigen].activeBg} ${ORIGEN_META[selectedOrigen].activeBorder} ${ORIGEN_META[selectedOrigen].text}`}>
                {selectedOrigen}
              </span>
            </div>
            {canEdit && (
              <button onClick={openCreate} className="btn-primary flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                {ORIGEN_META[selectedOrigen]?.btnLabel ?? 'Nueva baja'}
              </button>
            )}
          </div>

          {/* Barra de bÃºsqueda + botÃ³n filtros */}
          <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar..."
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

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport(true)}
            disabled={exporting || !hasFilters}
            title={hasFilters ? 'Exportar registros filtrados' : 'AplicÃ¡ filtros primero'}
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

      {/* â”€â”€ Panel de filtros â€” acordeÃ³n por secciÃ³n â”€â”€ */}
      {showFilters && (
        <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">

          {/* 1 â€” IdentificaciÃ³n */}
          <FilterAccSection title="IdentificaciÃ³n" activeCount={activeInSection(['usuario'])}>
            <FilterSelect label="Usuario" value={filters.usuario}
              onChange={v => setFilter('usuario', v)} options={OPCIONES_USUARIOS} />
          </FilterAccSection>

          {/* 2 â€” Efector */}
          <FilterAccSection title="Efector" activeCount={activeInSection(['sigla', 'tipo_efector'])}>
            <FilterSearchSelect
              label="Sigla"
              value={filters.sigla}
              onChange={v => setFilter('sigla', v)}
              options={SIGLAS_DATA.map(s => ({ value: s.sigla, label: `${s.sigla} â€” ${s.descr}` }))}
            />
            <FilterSelect label="Tipo de efector" value={filters.tipo_efector}
              onChange={v => setFilter('tipo_efector', v)} options={OPCIONES_TIPO_EFECTOR} />
          </FilterAccSection>

          {/* 3 â€” Cargo */}
          <FilterAccSection
            title="Cargo"
            activeCount={activeInSection(['ex_baja', 'codigo_cargo', 'cargo_baja', 'carga_horaria', 'partida_presupuestaria'])}
          >
            <FilterText label="EX Baja / AmpliaciÃ³n" value={filters.ex_baja}
              onChange={v => setFilter('ex_baja', v)} />
            <FilterText label="CÃ³digo cargo" value={filters.codigo_cargo}
              onChange={v => setFilter('codigo_cargo', v)} />
            <FilterText label="ID SIAL" value={filters.cargo_baja}
              onChange={v => setFilter('cargo_baja', v)} />
            <FilterText label="Carga horaria" value={filters.carga_horaria}
              onChange={v => setFilter('carga_horaria', v)} />
            <FilterText label="Partida presup." value={filters.partida_presupuestaria}
              onChange={v => setFilter('partida_presupuestaria', v)} />
          </FilterAccSection>

          {/* 4 â€” Datos funcionales (con cascada) */}
          <FilterAccSection
            title="Datos funcionales"
            activeCount={activeInSection(['unificador_puestos', 'escalafon', 'pou_pof', 'puesto_baja', 'especialidad_baja'])}
          >
            <FilterSelect label="Unificador de puestos" value={filters.unificador_puestos}
              onChange={v => setFilterCascade('unificador_puestos', v)} options={OPCIONES_UNIFICADOR_PUESTOS} />

            <FilterSelect label="EscalafÃ³n" value={filters.escalafon}
              onChange={v => setFilterCascade('escalafon', v)} options={OPCIONES_ESCALAFON_BAJAS} />

            <FilterSelect label="POU / POF" value={filters.pou_pof}
              onChange={v => setFilter('pou_pof', v)} options={OPCIONES_ESCALAFON_SEGUIMIENTO} />

            <FilterSearchSelect
              label={`Puesto baja${puestoOptions.length < 30 && (filters.unificador_puestos || filters.escalafon) ? ` (${puestoOptions.length})` : ''}`}
              value={filters.puesto_baja}
              onChange={v => setFilterCascade('puesto_baja', v)}
              options={puestoOptions}
              hint={!filters.unificador_puestos && !filters.escalafon ? 'FiltrÃ¡ por Unificador o EscalafÃ³n para acotar opciones' : null}
            />

            <FilterSearchSelect
              label={`Especialidad baja${especialidadOptions.length < 30 && filters.puesto_baja ? ` (${especialidadOptions.length})` : ''}`}
              value={filters.especialidad_baja}
              onChange={v => setFilter('especialidad_baja', v)}
              options={especialidadOptions}
              disabled={!filters.puesto_baja}
              hint={!filters.puesto_baja ? 'SeleccionÃ¡ un puesto primero' : null}
            />
          </FilterAccSection>

          {/* 5 â€” Fechas y expediente */}
          <FilterAccSection
            title="Fechas y expediente"
            activeCount={activeInSection(['fecha_baja_desde', 'fecha_baja_hasta', 'motivo_baja', 'fecha_pase_paralelo_desde', 'fecha_pase_paralelo_hasta', 'doc_respaldatoria'])}
          >
            <FilterDate label="Fecha baja â€” desde" value={filters.fecha_baja_desde}
              onChange={v => setFilter('fecha_baja_desde', v)} />
            <FilterDate label="Fecha baja â€” hasta" value={filters.fecha_baja_hasta}
              onChange={v => setFilter('fecha_baja_hasta', v)} />
            <FilterSelect label="Motivo de baja" value={filters.motivo_baja}
              onChange={v => setFilter('motivo_baja', v)} options={OPCIONES_MOTIVO_BAJA} />
            <FilterDate label="F. pase paralelo â€” desde" value={filters.fecha_pase_paralelo_desde}
              onChange={v => setFilter('fecha_pase_paralelo_desde', v)} />
            <FilterDate label="F. pase paralelo â€” hasta" value={filters.fecha_pase_paralelo_hasta}
              onChange={v => setFilter('fecha_pase_paralelo_hasta', v)} />
            <FilterText label="Doc. respaldatoria" value={filters.doc_respaldatoria}
              onChange={v => setFilter('doc_respaldatoria', v)} />
          </FilterAccSection>

          {/* 6 â€” Concurso */}
          <FilterAccSection title="Concurso" activeCount={activeInSection(['genera_concurso', 'codigo_registro'])}>
            <FilterSelect label="Genera concurso" value={filters.genera_concurso}
              onChange={v => setFilter('genera_concurso', v)} options={['SI', 'NO']} />
            <FilterSelect label="CÃ³d. registro" value={filters.codigo_registro}
              onChange={v => setFilter('codigo_registro', v)}
              options={[
                { value: '23',  label: '23 â€” CPH'      },
                { value: '37',  label: '37 â€” CPH'      },
                { value: '83',  label: '83 â€” CEETPS'   },
                { value: '85',  label: '85 â€” CEETPS'   },
                { value: '87',  label: '87 â€” CEETPS'   },
              ]} />
          </FilterAccSection>

        </div>
      )}

      {/* Errores */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>22 columnas Â· {selectedOrigen}</span>
        <span>
          {loading
            ? 'Cargando...'
            : `${count.toLocaleString('es-AR')} registro${count !== 1 ? 's' : ''}${totalPages > 1 ? ` Â· pÃ¡g. ${page} de ${totalPages}` : ''}`}
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
                { col: 'ex_baja',                label: 'EX Baja / AmpliaciÃ³n'  },
                { col: 'sigla',                  label: 'Sigla'                 },
                { col: 'efector',                label: 'Efector'               },
                { col: 'tipo_efector',           label: 'Tipo efector'          },
                { col: 'codigo_cargo',           label: 'CÃ³digo cargo'          },
                { col: 'cargo_baja',             label: 'ID SIAL'               },
                { col: 'cuil',                   label: 'CUIL'                  },
                { col: 'nombre_apellido',        label: 'Nombre y Apellido'     },
                { col: 'codigo_registro',        label: 'CÃ³d. registro'         },
                { col: 'unificador_puestos',     label: 'Unificador puestos'    },
                { col: 'pou_pof',                label: 'POU/POF'               },
                { col: 'escalafon',              label: 'EscalafÃ³n'             },
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
              <tr><td colSpan={23} className="py-10 text-center"><Spinner /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={23} className="py-10 text-center text-gray-400 text-sm">Sin registros</td></tr>
            ) : rows.map(row => (
              <tr
                key={row.id}
                onClick={() => openView(row)}
                className={`hover:bg-blue-50 cursor-pointer transition-colors border-l-4 ${ORIGEN_META[row.origen]?.rowBorder ?? 'border-l-gray-200'}`}
              >
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.usuario || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.ex_baja || 'â€”'}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {row.sigla ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700 font-mono">
                      {row.sigla}
                    </span>
                  ) : 'â€”'}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.efector || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.tipo_efector || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.codigo_cargo || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.cargo_baja || 'â€”'}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-600 whitespace-nowrap">{row.cuil || 'â€”'}</td>
                <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{row.nombre_apellido || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.codigo_registro ?? 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.unificador_puestos || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.pou_pof || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.escalafon || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.puesto_baja || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.especialidad_baja || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.partida_presupuestaria || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_baja)}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.carga_horaria || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.motivo_baja || 'â€”'}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{row.doc_respaldatoria || 'â€”'}</td>
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
                    {(Number(row.codigo_registro) === 37 || Number(row.codigo_registro) === 23 || CODIGOS_CEETPS.includes(Number(row.codigo_registro))) && (
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

      {/* PaginaciÃ³n */}
      <Pagination currentPage={page} totalPages={totalPages} totalRecords={count}
        onPageChange={setPage} loading={loading} tableRef={tableRef} />

        </div>
      )}

      {formOpen && <BajaForm initial={editTarget} lockedOrigen={editTarget?.origen ?? selectedOrigen} onSaved={handleSaved} onClose={closeForm} />}
      {viewTarget && <BajaForm initial={viewTarget} readOnly onSaved={() => {}} onClose={() => setViewTarget(null)} />}

      <ConfirmModal
        open={!!confirmDel}
        title="Eliminar baja"
        message={`Â¿ConfirmÃ¡s la eliminaciÃ³n de "${confirmDel?.nombre}"? Esta acciÃ³n no se puede deshacer.`}
        confirmLabel="Eliminar" danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}

