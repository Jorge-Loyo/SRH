import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronUpDownIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { seguimientoCeetpsApi } from '../../api/concursalesApi'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import { formatDate, OPCIONES_USUARIOS_CEETPS, OPCIONES_MOTIVO_BAJA, SIGLAS_DATA } from '../../utils/concursalesHelpers'
import SeguimientoCeetpsDetail from './SeguimientoCeetpsDetail'
import * as XLSX from 'xlsx'

const PAGE_SIZE = 50

// Solapas: código de registro → label
const TABS = [
  { label: 'Enfermeros',      codigo: 87 },
  { label: 'Técnicos',        codigo: 85 },
  { label: 'Administrativos', codigo: 83 },
]

const EMPTY_FILTERS = {
  search:                    '',
  // 1 — Datos generales
  usuario:                   '',
  sigla_efector:             '',
  // 2 — Concurso
  estado_concurso:           '',
  expediente_concurso:       '',
  tipificador_obra_servicio: '',
  tipificador_origen:        '',
  puesto_solicitado:         '',
  dispo_llamado:             '',
  fecha_caratulacion_desde:  '',
  fecha_caratulacion_hasta:  '',
  fecha_autorizacion_desde:  '',
  fecha_autorizacion_hasta:  '',
  fecha_ifacs_desde:         '',
  fecha_ifacs_hasta:         '',
  fecha_insal_desde:         '',
  fecha_insal_hasta:         '',
  // 3 — Designación
  cuil_designado:            '',
  puesto_designado:          '',
  expediente_designacion:    '',
  estado_apto:               '',
  alta_sial:                 '',
  numero_apto_medico:        '',
  fecha_proyecto_dispo_desde: '',
  fecha_proyecto_dispo_hasta: '',
  dispo_designacion:         '',
  resolucion_designacion:    '',
  id_cargo:                  '',
  // 4 — Baja
  cuil:                      '',
  sigla_baja:                '',
  ex_baja:                   '',
  puesto_baja:               '',
  especialidad_baja:         '',
  motivo_baja:               '',
  carga_horaria:             '',
  cargo:                     '',
  fecha_baja_desde:          '',
  fecha_baja_hasta:          '',
  doc_respaldatoria:         '',
}

export default function SeguimientoCeetpsPage() {
  const [searchParams] = useSearchParams()
  const idBajaParam    = searchParams.get('id_baja')

  const [activeTab, setActiveTab] = useState(0) // índice en TABS

  const [rows, setRows]           = useState([])
  const [total, setTotal]         = useState(0)
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const [filters, setFilters]         = useState({ ...EMPTY_FILTERS })
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort]               = useState({ field: 'id', order: 'DESC' })

  const [detailRecord, setDetailRecord] = useState(null)
  const [viewRecord, setViewRecord]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [exporting, setExporting]       = useState(false)

  const tableRef = useRef(null)

  const currentCodigo = TABS[activeTab].codigo

  const buildParams = useCallback((extra = {}) => {
    const p = {
      codigo_registro: currentCodigo,
      offset: (page - 1) * PAGE_SIZE,
      limit:  PAGE_SIZE,
      sort:   sort.field,
      order:  sort.order,
      ...extra,
    }
    if (filters.search)             p.search             = filters.search
    // Datos generales
    if (filters.usuario)            p.usuario            = filters.usuario
    if (filters.sigla_efector)      p.sigla_efector      = filters.sigla_efector
    // Concurso
    if (filters.estado_concurso)           p.estado_concurso           = filters.estado_concurso
    if (filters.expediente_concurso)       p.expediente_concurso       = filters.expediente_concurso
    if (filters.tipificador_obra_servicio) p.tipificador_obra_servicio = filters.tipificador_obra_servicio
    if (filters.tipificador_origen)        p.tipificador_origen        = filters.tipificador_origen
    if (filters.puesto_solicitado)         p.puesto_solicitado         = filters.puesto_solicitado
    if (filters.dispo_llamado)             p.dispo_llamado             = filters.dispo_llamado
    if (filters.fecha_caratulacion_desde)  p.fecha_caratulacion_desde  = filters.fecha_caratulacion_desde
    if (filters.fecha_caratulacion_hasta)  p.fecha_caratulacion_hasta  = filters.fecha_caratulacion_hasta
    if (filters.fecha_autorizacion_desde)  p.fecha_autorizacion_desde  = filters.fecha_autorizacion_desde
    if (filters.fecha_autorizacion_hasta)  p.fecha_autorizacion_hasta  = filters.fecha_autorizacion_hasta
    if (filters.fecha_ifacs_desde)         p.fecha_ifacs_desde         = filters.fecha_ifacs_desde
    if (filters.fecha_ifacs_hasta)         p.fecha_ifacs_hasta         = filters.fecha_ifacs_hasta
    if (filters.fecha_insal_desde)         p.fecha_insal_desde         = filters.fecha_insal_desde
    if (filters.fecha_insal_hasta)         p.fecha_insal_hasta         = filters.fecha_insal_hasta
    // Designación
    if (filters.cuil_designado)            p.cuil_designado            = filters.cuil_designado
    if (filters.puesto_designado)          p.puesto_designado          = filters.puesto_designado
    if (filters.expediente_designacion)    p.expediente_designacion    = filters.expediente_designacion
    if (filters.estado_apto)               p.estado_apto               = filters.estado_apto
    if (filters.alta_sial)                 p.alta_sial                 = filters.alta_sial
    if (filters.numero_apto_medico)        p.numero_apto_medico        = filters.numero_apto_medico
    if (filters.fecha_proyecto_dispo_desde) p.fecha_proyecto_dispo_desde = filters.fecha_proyecto_dispo_desde
    if (filters.fecha_proyecto_dispo_hasta) p.fecha_proyecto_dispo_hasta = filters.fecha_proyecto_dispo_hasta
    if (filters.dispo_designacion)         p.dispo_designacion         = filters.dispo_designacion
    if (filters.resolucion_designacion)    p.resolucion_designacion    = filters.resolucion_designacion
    if (filters.id_cargo)                  p.id_cargo                  = filters.id_cargo
    // Baja
    if (filters.cuil)                      p.cuil                      = filters.cuil
    if (filters.sigla_baja)                p.sigla_baja                = filters.sigla_baja
    if (filters.ex_baja)                   p.ex_baja                   = filters.ex_baja
    if (filters.puesto_baja)               p.puesto_baja               = filters.puesto_baja
    if (filters.especialidad_baja)         p.especialidad_baja         = filters.especialidad_baja
    if (filters.motivo_baja)               p.motivo_baja               = filters.motivo_baja
    if (filters.carga_horaria)             p.carga_horaria             = filters.carga_horaria
    if (filters.cargo)                     p.cargo                     = filters.cargo
    if (filters.fecha_baja_desde)          p.fecha_baja_desde          = filters.fecha_baja_desde
    if (filters.fecha_baja_hasta)          p.fecha_baja_hasta          = filters.fecha_baja_hasta
    if (filters.doc_respaldatoria)         p.doc_respaldatoria         = filters.doc_respaldatoria
    if (idBajaParam)                p.id_baja            = idBajaParam
    return p
  }, [currentCodigo, page, sort, filters, idBajaParam])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await seguimientoCeetpsApi.list(buildParams())
      setRows(data.data ?? [])
      setTotal(data.meta?.count ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => { loadData() }, [loadData])

  // Al cambiar de tab, resetear página
  const handleTabChange = (idx) => {
    setActiveTab(idx)
    setPage(1)
    setFilters({ ...EMPTY_FILTERS })
  }

  const handleSortToggle = (field) => {
    setSort(prev =>
      prev.field === field
        ? { field, order: prev.order === 'ASC' ? 'DESC' : 'ASC' }
        : { field, order: 'ASC' }
    )
    setPage(1)
  }

  const handleSaved = () => {
    setDetailRecord(null)
    loadData()
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await seguimientoCeetpsApi.remove(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const activeInSection = (keys) => keys.filter(k => filters[k]).length

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS })
    setPage(1)
  }

  const handleExport = async (filtered) => {
    setExporting(true)
    try {
      const params = buildParams({ limit: 9999, offset: 0 })
      if (!filtered) {
        delete params.search
        delete params.usuario
        delete params.sigla_efector
        delete params.estado_concurso
        delete params.expediente_concurso
        delete params.tipificador_obra_servicio
        delete params.tipificador_origen
        delete params.puesto_solicitado
        delete params.dispo_llamado
        delete params.fecha_caratulacion_desde
        delete params.fecha_caratulacion_hasta
        delete params.fecha_autorizacion_desde
        delete params.fecha_autorizacion_hasta
        delete params.fecha_ifacs_desde
        delete params.fecha_ifacs_hasta
        delete params.fecha_insal_desde
        delete params.fecha_insal_hasta
        delete params.cuil_designado
        delete params.puesto_designado
        delete params.expediente_designacion
        delete params.estado_apto
        delete params.alta_sial
        delete params.numero_apto_medico
        delete params.fecha_proyecto_dispo_desde
        delete params.fecha_proyecto_dispo_hasta
        delete params.dispo_designacion
        delete params.resolucion_designacion
        delete params.id_cargo
        delete params.cuil
        delete params.sigla_baja
        delete params.ex_baja
        delete params.puesto_baja
        delete params.especialidad_baja
        delete params.motivo_baja
        delete params.carga_horaria
        delete params.cargo
        delete params.fecha_baja_desde
        delete params.fecha_baja_hasta
        delete params.doc_respaldatoria
      }
      const data = await seguimientoCeetpsApi.list(params)
      const rows = data.data ?? []
      const ws = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'CEETPS')
      const tabLabel = TABS[activeTab].label.toLowerCase()
      XLSX.writeFile(wb, `seguimiento-ceetps-${tabLabel}-${filtered ? 'filtrado' : 'completo'}.xlsx`)
    } catch (e) {
      alert('Error al exportar: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="flex flex-col h-full gap-4">

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Seguimiento CEETPS</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {idBajaParam
              ? `Filtrando por baja #${idBajaParam}`
              : 'Registro de seguimiento de concursos CEETPS'}
          </p>
        </div>
      </div>

      {/* Solapas */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab, idx) => (
          <button
            key={tab.codigo}
            onClick={() => handleTabChange(idx)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === idx
                ? 'border-primary-600 text-primary-700 bg-primary-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs font-normal text-gray-400">({tab.codigo})</span>
          </button>
        ))}
      </div>

      {/* Barra de búsqueda + filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1) }}
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

      {/* Panel de filtros — acordeón por sección */}
      {showFilters && (
        <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">

          {/* 1 — Datos generales */}
          <FilterAccSection
            title="Datos generales"
            activeCount={activeInSection(['usuario', 'sigla_efector'])}
          >
            <FilterSelect
              label="Usuario"
              value={filters.usuario}
              onChange={v => { setFilters(f => ({ ...f, usuario: v })); setPage(1) }}
              options={OPCIONES_USUARIOS_CEETPS}
            />
            <FilterSearchSelect
              label="Sigla efector"
              value={filters.sigla_efector}
              onChange={v => { setFilters(f => ({ ...f, sigla_efector: v })); setPage(1) }}
              options={SIGLAS_DATA.map(s => ({ value: s.sigla, label: `${s.sigla} — ${s.descr}` }))}
            />
          </FilterAccSection>

          {/* 2 — Concurso */}
          <FilterAccSection
            title="Concurso"
            activeCount={activeInSection(['estado_concurso', 'expediente_concurso', 'tipificador_obra_servicio', 'tipificador_origen', 'puesto_solicitado', 'dispo_llamado', 'fecha_caratulacion_desde', 'fecha_caratulacion_hasta', 'fecha_autorizacion_desde', 'fecha_autorizacion_hasta', 'fecha_ifacs_desde', 'fecha_ifacs_hasta', 'fecha_insal_desde', 'fecha_insal_hasta'])}
          >
            <FilterText
              label="Estado concurso"
              value={filters.estado_concurso}
              onChange={v => { setFilters(f => ({ ...f, estado_concurso: v })); setPage(1) }}
              placeholder="Filtrar estado..."
            />
            <FilterText
              label="Expediente concurso"
              value={filters.expediente_concurso}
              onChange={v => { setFilters(f => ({ ...f, expediente_concurso: v })); setPage(1) }}
              placeholder="Filtrar expediente..."
            />
            <FilterText
              label="Conjuntos"
              value={filters.tipificador_obra_servicio}
              onChange={v => { setFilters(f => ({ ...f, tipificador_obra_servicio: v })); setPage(1) }}
              placeholder="Filtrar tipif...."
            />
            <FilterText
              label="Tipif. origen"
              value={filters.tipificador_origen}
              onChange={v => { setFilters(f => ({ ...f, tipificador_origen: v })); setPage(1) }}
              placeholder="Filtrar origen..."
            />
            <FilterText
              label="Puesto solicitado"
              value={filters.puesto_solicitado}
              onChange={v => { setFilters(f => ({ ...f, puesto_solicitado: v })); setPage(1) }}
              placeholder="Filtrar puesto..."
            />
            <FilterText
              label="Dispo. llamado"
              value={filters.dispo_llamado}
              onChange={v => { setFilters(f => ({ ...f, dispo_llamado: v })); setPage(1) }}
              placeholder="Filtrar disposición..."
            />
            <FilterDate label="F. Caratulación — desde" value={filters.fecha_caratulacion_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_caratulacion_desde: v })); setPage(1) }} />
            <FilterDate label="F. Caratulación — hasta" value={filters.fecha_caratulacion_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_caratulacion_hasta: v })); setPage(1) }} />
            <FilterDate label="F. Autorización — desde" value={filters.fecha_autorizacion_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_autorizacion_desde: v })); setPage(1) }} />
            <FilterDate label="F. Autorización — hasta" value={filters.fecha_autorizacion_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_autorizacion_hasta: v })); setPage(1) }} />
            <FilterDate label="F. IFACS — desde" value={filters.fecha_ifacs_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_ifacs_desde: v })); setPage(1) }} />
            <FilterDate label="F. IFACS — hasta" value={filters.fecha_ifacs_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_ifacs_hasta: v })); setPage(1) }} />
            <FilterDate label="F. INSAL — desde" value={filters.fecha_insal_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_insal_desde: v })); setPage(1) }} />
            <FilterDate label="F. INSAL — hasta" value={filters.fecha_insal_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_insal_hasta: v })); setPage(1) }} />
          </FilterAccSection>

          {/* 3 — Designación */}
          <FilterAccSection
            title="Designación"
            activeCount={activeInSection(['cuil_designado', 'puesto_designado', 'expediente_designacion', 'estado_apto', 'alta_sial', 'numero_apto_medico', 'fecha_proyecto_dispo_desde', 'fecha_proyecto_dispo_hasta', 'dispo_designacion', 'resolucion_designacion', 'id_cargo'])}
          >
            <FilterText
              label="CUIL designado"
              value={filters.cuil_designado}
              onChange={v => { setFilters(f => ({ ...f, cuil_designado: v })); setPage(1) }}
              placeholder="20123456789"
            />
            <FilterText
              label="Puesto designado"
              value={filters.puesto_designado}
              onChange={v => { setFilters(f => ({ ...f, puesto_designado: v })); setPage(1) }}
              placeholder="Filtrar puesto..."
            />
            <FilterText
              label="Expediente designación"
              value={filters.expediente_designacion}
              onChange={v => { setFilters(f => ({ ...f, expediente_designacion: v })); setPage(1) }}
              placeholder="Filtrar expediente..."
            />
            <FilterText
              label="Estado apto"
              value={filters.estado_apto}
              onChange={v => { setFilters(f => ({ ...f, estado_apto: v })); setPage(1) }}
              placeholder="Filtrar estado..."
            />
            <FilterBoolSelect
              label="Alta SIAL"
              value={filters.alta_sial}
              onChange={v => { setFilters(f => ({ ...f, alta_sial: v })); setPage(1) }}
            />
            <FilterText
              label="N° Apto Médico"
              value={filters.numero_apto_medico}
              onChange={v => { setFilters(f => ({ ...f, numero_apto_medico: v })); setPage(1) }}
              placeholder="Filtrar número..."
            />
            <FilterDate label="F. Proy. Dispo — desde" value={filters.fecha_proyecto_dispo_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_proyecto_dispo_desde: v })); setPage(1) }} />
            <FilterDate label="F. Proy. Dispo — hasta" value={filters.fecha_proyecto_dispo_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_proyecto_dispo_hasta: v })); setPage(1) }} />
            <FilterText
              label="Dispo. Designación"
              value={filters.dispo_designacion}
              onChange={v => { setFilters(f => ({ ...f, dispo_designacion: v })); setPage(1) }}
              placeholder="Filtrar disposición..."
            />
            <FilterText
              label="Resolución Desig."
              value={filters.resolucion_designacion}
              onChange={v => { setFilters(f => ({ ...f, resolucion_designacion: v })); setPage(1) }}
              placeholder="Filtrar resolución..."
            />
            <FilterText
              label="ID Cargo"
              value={filters.id_cargo}
              onChange={v => { setFilters(f => ({ ...f, id_cargo: v })); setPage(1) }}
              placeholder="Filtrar ID cargo..."
            />
          </FilterAccSection>

          {/* 4 — Baja */}
          <FilterAccSection
            title="Baja"
            activeCount={activeInSection(['cuil', 'sigla_baja', 'ex_baja', 'puesto_baja', 'especialidad_baja', 'motivo_baja', 'carga_horaria', 'cargo', 'fecha_baja_desde', 'fecha_baja_hasta', 'doc_respaldatoria'])}
          >
            <FilterText
              label="CUIL baja"
              value={filters.cuil}
              onChange={v => { setFilters(f => ({ ...f, cuil: v })); setPage(1) }}
              placeholder="20123456789"
            />
            <FilterSearchSelect
              label="Sigla (baja)"
              value={filters.sigla_baja}
              onChange={v => { setFilters(f => ({ ...f, sigla_baja: v })); setPage(1) }}
              options={SIGLAS_DATA.map(s => ({ value: s.sigla, label: `${s.sigla} — ${s.descr}` }))}
            />
            <FilterText
              label="EX baja/ampl."
              value={filters.ex_baja}
              onChange={v => { setFilters(f => ({ ...f, ex_baja: v })); setPage(1) }}
              placeholder="EX-2024-…"
            />
            <FilterText
              label="Cargo"
              value={filters.cargo}
              onChange={v => { setFilters(f => ({ ...f, cargo: v })); setPage(1) }}
              placeholder="Filtrar cargo..."
            />
            <FilterText
              label="Puesto baja"
              value={filters.puesto_baja}
              onChange={v => { setFilters(f => ({ ...f, puesto_baja: v })); setPage(1) }}
              placeholder="Filtrar puesto..."
            />
            <FilterText
              label="Especialidad baja"
              value={filters.especialidad_baja}
              onChange={v => { setFilters(f => ({ ...f, especialidad_baja: v })); setPage(1) }}
              placeholder="Filtrar especialidad..."
            />
            <FilterDate label="F. Baja/Ampl. — desde" value={filters.fecha_baja_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_baja_desde: v })); setPage(1) }} />
            <FilterDate label="F. Baja/Ampl. — hasta" value={filters.fecha_baja_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_baja_hasta: v })); setPage(1) }} />
            <FilterSelect
              label="Motivo baja"
              value={filters.motivo_baja}
              onChange={v => { setFilters(f => ({ ...f, motivo_baja: v })); setPage(1) }}
              options={OPCIONES_MOTIVO_BAJA}
            />
            <FilterText
              label="Carga horaria"
              value={filters.carga_horaria}
              onChange={v => { setFilters(f => ({ ...f, carga_horaria: v })); setPage(1) }}
              placeholder="Ej: 6hs, 24hs..."
            />
            <FilterText
              label="Doc. Respaldatoria"
              value={filters.doc_respaldatoria}
              onChange={v => { setFilters(f => ({ ...f, doc_respaldatoria: v })); setPage(1) }}
              placeholder="Filtrar doc..."
            />
          </FilterAccSection>

        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>{TABS[activeTab].label} — {total.toLocaleString('es-AR')} registro{total !== 1 ? 's' : ''}</span>
        <span>
          {loading ? 'Cargando...' : totalPages > 1 ? `pág. ${page} de ${totalPages}` : ''}
        </span>
      </div>

      {/* Tabla */}
      <div
        ref={tableRef}
        className="overflow-auto rounded-lg border border-gray-200 flex-1"
        style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '280px' }}
      >
        <table className="text-sm border-collapse" style={{ minWidth: '5000px' }}>
          <thead className="sticky top-0 z-10 bg-gray-50">
            <tr>
              {/* Concurso */}
              <Th label="Estado Concurso"       field="estado_concurso"          sort={sort} onSort={handleSortToggle} />
              <Th label="Usuario"               field="usuario"                  sort={sort} onSort={handleSortToggle} />
              <Th label="Sigla Efector"         field="sigla_efector"            sort={sort} onSort={handleSortToggle} />
              <Th label="Descripción Efector"   field="descr_efector"            sort={sort} onSort={handleSortToggle} />
              <Th label="Conjuntos"             field="tipificador_obra_servicio" sort={sort} onSort={handleSortToggle} />
              <Th label="Expediente Concurso"   field="expediente_concurso"      sort={sort} onSort={handleSortToggle} />
              <Th label="Tipif. Origen"         field="tipificador_origen"       sort={sort} onSort={handleSortToggle} />
              <Th label="F. Caratulación"       field="fecha_caratulacion"       sort={sort} onSort={handleSortToggle} />
              <Th label="F. Autorización"       field="fecha_autorizacion"       sort={sort} onSort={handleSortToggle} />
              <Th label="Puesto Solicitado"     field="puesto_solicitado"        sort={sort} onSort={handleSortToggle} />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Dispo. Llamado</th>
              <Th label="F. IFACS"              field="fecha_ifacs"              sort={sort} onSort={handleSortToggle} />
              <Th label="F. INSAL"              field="fecha_insal"              sort={sort} onSort={handleSortToggle} />
              {/* Designación */}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Exp. Designación</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Puesto Designado</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">CUIL Designado</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Nombre y Apellido</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Estado Apto</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">N° Apto Médico</th>
              <Th label="F. Proy. Dispo"        field="fecha_proyecto_dispo"     sort={sort} onSort={handleSortToggle} />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Dispo. Designación</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Resolución Desig.</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Alta SIAL</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Observaciones</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">ID Cargo</th>
              {/* Baja */}
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">EX Baja/Ampl.</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Sigla</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Efector</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Cargo</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">CUIL</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Nombre y Apellido (Baja)</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Puesto Baja</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Especialidad Baja</th>
              <Th label="F. Baja/Ampl."         field="fecha_baja"               sort={sort} onSort={handleSortToggle} />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Carga Horaria</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Motivo Baja</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-blue-50">Doc. Respaldatoria</th>
              {/* Acciones */}
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide sticky right-0 bg-gray-50 whitespace-nowrap">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={38} className="py-10 text-center"><Spinner /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={38} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
            ) : rows.map(row => (
              <tr
                key={row.id}
                onClick={() => setViewRecord(row)}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
              >
                {/* Concurso */}
                <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap font-medium">{row.estado_concurso ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.usuario ?? '—'}</td>
                <td className="px-3 py-2 text-xs font-medium text-primary-700 whitespace-nowrap">{row.sigla_efector ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.descr_efector ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.tipificador_obra_servicio ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.expediente_concurso ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.tipificador_origen ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_caratulacion)}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_autorizacion)}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.puesto_solicitado ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap max-w-[180px] truncate" title={row.dispo_llamado ?? ''}>{row.dispo_llamado ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_ifacs)}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_insal)}</td>
                {/* Designación */}
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.expediente_designacion ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.puesto_designado ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{row.cuil_designado ?? '—'}</td>
                <td className="px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">{row.nombre_apellido_designado ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.estado_apto ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.numero_apto_medico ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_proyecto_dispo)}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap max-w-[180px] truncate" title={row.dispo_designacion ?? ''}>{row.dispo_designacion ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap max-w-[180px] truncate" title={row.resolucion_designacion ?? ''}>{row.resolucion_designacion ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.alta_sial ? 'Sí' : row.alta_sial === false ? 'No' : '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap max-w-[160px] truncate" title={row.observaciones ?? ''}>{row.observaciones ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.id_cargo ?? '—'}</td>
                {/* Baja */}
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.ex_baja ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.sigla ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.efector ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.cargo ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.cuil ?? '—'}</td>
                <td className="px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap bg-blue-50/40">{row.nombre_apellido_baja ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.puesto_baja ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.especialidad_baja ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{formatDate(row.fecha_baja)}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.carga_horaria ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.motivo_baja ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap bg-blue-50/40">{row.doc_respaldatoria ?? '—'}</td>
                {/* Acciones */}
                <td className="px-3 py-2.5 sticky right-0 bg-white" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setDetailRecord(row)}
                      title="Editar"
                      className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(row)}
                      title="Eliminar"
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalRecords={total}
        onPageChange={setPage}
        loading={loading}
        tableRef={tableRef}
      />

      {/* Modal solo ver */}
      {viewRecord && (
        <SeguimientoCeetpsDetail
          initial={viewRecord}
          readOnly
          onSaved={() => {}}
          onClose={() => setViewRecord(null)}
        />
      )}

      {/* Modal edición */}
      {detailRecord && (
        <SeguimientoCeetpsDetail
          initial={detailRecord}
          onSaved={handleSaved}
          onClose={() => setDetailRecord(null)}
        />
      )}

      {/* Confirm delete */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Confirmar eliminación</h2>
            <p className="text-sm text-gray-600">
              ¿Eliminar el seguimiento CEETPS <strong>#{deleteTarget.id}</strong>
              {deleteTarget.nombre_apellido_baja ? ` (${deleteTarget.nombre_apellido_baja})` : ''}?
              Esta acción no se puede deshacer.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary" disabled={deleting}>Cancelar</button>
              <button
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Th sorteable ─────────────────────────────────────────────────────────────
function Th({ label, field, sort, onSort }) {
  const active = sort.field === field
  return (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ChevronUpDownIcon className={`w-3.5 h-3.5 ${active ? 'text-primary-600' : 'text-gray-300'}`} />
        {active && <span className="text-primary-600">{sort.order === 'ASC' ? '↑' : '↓'}</span>}
      </span>
    </th>
  )
}

// ─── FilterAccSection — sección acordeón para agrupar filtros ────────────────
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
        <div className="p-3 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-white border-t border-gray-100 rounded-b-lg">
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

// ─── FilterBoolSelect — select Sí / No / Todos para campos booleanos ──────────
function FilterBoolSelect({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="form-input text-sm w-full">
        <option value="">Todos</option>
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    </div>
  )
}

// ─── FilterText ───────────────────────────────────────────────────────────────
function FilterText({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="form-input text-sm w-full" />
    </div>
  )
}

// ─── FilterDate ───────────────────────────────────────────────────────────────
function FilterDate({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="form-input text-sm w-full"
      />
    </div>
  )
}

// ─── FilterSearchSelect ───────────────────────────────────────────────────────
function FilterSearchSelect({ label, value, onChange, options = [], disabled = false, hint = null }) {
  const [query, setQuery]       = useState('')
  const [open, setOpen]         = useState(false)
  const [dropStyle, setDropStyle] = useState({})
  const wrapRef    = useRef(null)
  const dropRef    = useRef(null)
  const triggerRef = useRef(null)
  const inputRef   = useRef(null)

  const normalized = useMemo(
    () => options.map(o => typeof o === 'string' ? { value: o, label: o } : o),
    [options]
  )
  const filteredOpts = useMemo(() => {
    if (!query.trim()) return normalized
    const q = query.toLowerCase()
    return normalized.filter(o => o.label.toLowerCase().includes(q))
  }, [normalized, query])

  useEffect(() => {
    const handler = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        dropRef.current  && !dropRef.current.contains(e.target)
      ) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropRef.current && dropRef.current.contains(e.target)) return
      setOpen(false); setQuery('')
    }
    document.addEventListener('scroll', handler, true)
    return () => document.removeEventListener('scroll', handler, true)
  }, [open])

  const handleSelect = (val) => { onChange(val); setOpen(false); setQuery('') }
  const openDropdown = () => {
    if (disabled) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) setDropStyle({ position: 'fixed', zIndex: 9999, top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) })
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
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..." className="form-input text-sm w-full pl-8" />
          </>
        )}
        {value && !open && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange(''); setQuery('') }} className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-500 transition-colors z-10">
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
      </div>
      {open && (
        <div ref={dropRef} style={dropStyle} className="bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <button type="button" onClick={() => handleSelect('')} className={`w-full text-left px-3 py-2.5 text-sm border-b border-gray-100 ${!value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'}`}>Todos</button>
            {filteredOpts.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</div>
            ) : filteredOpts.map(o => (
              <button key={o.value} type="button" onClick={() => handleSelect(o.value)} className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${o.value === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>{o.label}</button>
            ))}
          </div>
        </div>
      )}
      {hint && <p className="mt-0.5 text-[10px] text-gray-400 leading-tight">{hint}</p>}
    </div>
  )
}
