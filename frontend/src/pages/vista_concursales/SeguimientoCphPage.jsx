import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
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
import { seguimientoApi, configApi } from '../../api/concursalesApi'
import { exportSeguimientoToExcel } from '../../utils/exportReport'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import {
  getColorEstadoCph,
  formatDate,
  OPCIONES_SUB_ESTADO_3,
  OPCIONES_ESCALAFON,
  OPCIONES_ESCALAFON_BAJAS,
  OPCIONES_ESCALAFON_SEGUIMIENTO,
  OPCIONES_USUARIOS,
  OPCIONES_ORIGEN,
  OPCIONES_TIPO_EFECTOR,
  OPCIONES_MOTIVO_BAJA,
  OPCIONES_UNIFICADOR_PUESTOS,
  OPCIONES_DISPO_DESIERTA,
  getPuestoOptions,
  getEspecialidadOptions,
  SIGLAS_DATA,
  calcEstado,
  calcSubEstado3,
  calcSubEstado,
  calcCambioEspecialidad,
} from '../../utils/concursalesHelpers'
import SeguimientoCphDetail from './SeguimientoCphDetail'

const PAGE_SIZE = 50

const EMPTY_FILTERS = {
  search:                  '',
  // 1 — Datos generales
  usuario:                 '',
  sigla_efector:           '',
  tipo_efector:            '',
  origen:                  '',
  conjuntos:               '',
  // 2 — Baja (con cascada)
  ee_baja:                 '',
  cuil_baja:               '',
  escalafon_baja:          '',
  escalafon_1:             '',
  unificador_puestos:      '',
  puesto_1:                '',
  especialidad_baja:       '',
  motivo_baja:             '',
  fecha_baja_desde:        '',
  fecha_baja_hasta:        '',
  // 3 — Estado
  sub_estado_3:            '',
  suspendido:              '',
  cambio_especialidad:     '',
  dispo_desierta:          '',
  tipo_baja:               '',
  fecha_dispo_desierta_desde: '',
  fecha_dispo_desierta_hasta: '',
  // 4 — Concurso
  escalafon_2:             '',
  puesto_2:                '',
  especialidad_solicitada: '',
  ee_concurso:             '',
  fecha_ee_concurso_desde: '',
  fecha_ee_concurso_hasta: '',
  if_solicitante:          '',
  fecha_autorizacion_desde: '',
  fecha_autorizacion_hasta: '',
  sorteo_jurado:           '',
  disposicion:             '',
  // 5 — Inscripción
  insc_desde_desde:        '',
  insc_desde_hasta:        '',
  insc_hasta_desde:        '',
  insc_hasta_hasta:        '',
  // 6 — Evaluación
  examen_publicado:        '',
  fecha_examen_desde:      '',
  fecha_examen_hasta:      '',
  orden_merito:            '',
  fecha_orden_merito_desde: '',
  fecha_orden_merito_hasta: '',
  fecha_ifacs_desde:       '',
  fecha_ifacs_hasta:       '',
  insal:                   '',
  fecha_insal_desde:       '',
  fecha_insal_hasta:       '',
  cargo_sial:              '',
  // 7 — Designación
  ee_designacion:          '',
  fecha_ee_designacion_desde: '',
  fecha_ee_designacion_hasta: '',
  nombre_designacion:      '',
  cuil_designacion:        '',
  carga_documentacion:     '',
  fecha_apto_medico_desde: '',
  fecha_apto_medico_hasta: '',
  fecha_ite_desde:         '',
  fecha_ite_hasta:         '',
  reso_a_la_firma:         '',
  resolucion_designacion:  '',
  fecha_resolucion_desde:  '',
  fecha_resolucion_hasta:  '',
  fecha_cargo_desde:       '',
  fecha_cargo_hasta:       '',
  cargo_baja:              '',
}

export default function SeguimientoCphPage() {
  const [searchParams] = useSearchParams()
  const idBajaParam = searchParams.get('id_baja')
  const { user } = useAuth()
  const esConcursales = user?.role === 'concursales'

  // ── Estado ────────────────────────────────────────────────────────────────
  const [rows, setRows]             = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const [filters, setFilters]       = useState({ ...EMPTY_FILTERS })
  const [showFilters, setShowFilters] = useState(false)
  const [conjuntosOpts, setConjuntosOpts] = useState([])
  const [sort, setSort]             = useState({ field: 'id', order: 'DESC' })

  const [detailRecord, setDetailRecord] = useState(null) // editar
  const [viewRecord, setViewRecord]     = useState(null) // solo ver

  // Confirm delete
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [exporting, setExporting]       = useState(false)

  const tableRef = useRef(null)

  // ── Opciones dinámicas (cascada) ──────────────────────────────────────────
  const puesto1Options = useMemo(
    () => getPuestoOptions(filters.unificador_puestos, filters.escalafon_baja),
    [filters.unificador_puestos, filters.escalafon_baja]
  )
  const especialidadBajaOptions = useMemo(
    () => getEspecialidadOptions(filters.puesto_1, filters.escalafon_baja),
    [filters.puesto_1, filters.escalafon_baja]
  )
  const puesto2Options = useMemo(
    () => getPuestoOptions(filters.unificador_puestos, filters.escalafon_baja),
    [filters.unificador_puestos, filters.escalafon_baja]
  )
  const especialidadSolOptions = useMemo(
    () => getEspecialidadOptions(filters.puesto_2, filters.escalafon_baja),
    [filters.puesto_2, filters.escalafon_baja]
  )

  // ── Carga de datos ────────────────────────────────────────────────────────
  const loadData = useCallback(async (p = page) => {
    setLoading(true)
    setError(null)
    try {
      const params = {
        offset: (p - 1) * PAGE_SIZE,
        limit:  PAGE_SIZE,
        sort:   sort.field,
        order:  sort.order,
      }
      if (filters.search)                  params.search                  = filters.search
      // Datos generales
      if (filters.usuario)                 params.usuario                 = filters.usuario
      if (filters.sigla_efector)           params.sigla_efector           = filters.sigla_efector
      if (filters.tipo_efector)            params.tipo_efector            = filters.tipo_efector
      if (filters.origen)                  params.origen                  = filters.origen
      if (filters.conjuntos)               params.conjuntos               = filters.conjuntos
      // Baja
      if (filters.ee_baja)                 params.ee_baja                 = filters.ee_baja
      if (filters.cuil_baja)               params.cuil_baja               = filters.cuil_baja
      if (filters.escalafon_baja)          params.escalafon_baja          = filters.escalafon_baja
      if (filters.escalafon_1)             params.escalafon_1             = filters.escalafon_1
      if (filters.unificador_puestos)      params.unificador_puestos      = filters.unificador_puestos
      if (filters.puesto_1)                params.puesto_1                = filters.puesto_1
      if (filters.especialidad_baja)       params.especialidad_baja       = filters.especialidad_baja
      if (filters.motivo_baja)             params.motivo_baja             = filters.motivo_baja
      if (filters.fecha_baja_desde)        params.fecha_baja_desde        = filters.fecha_baja_desde
      if (filters.fecha_baja_hasta)        params.fecha_baja_hasta        = filters.fecha_baja_hasta
      // Estado
      if (filters.sub_estado_3)            params.sub_estado_3            = filters.sub_estado_3
      if (filters.suspendido)              params.suspendido              = filters.suspendido
      if (filters.cambio_especialidad)     params.cambio_especialidad     = filters.cambio_especialidad
      if (filters.dispo_desierta)          params.dispo_desierta          = filters.dispo_desierta
      if (filters.tipo_baja)               params.tipo_baja               = filters.tipo_baja
      if (filters.fecha_dispo_desierta_desde) params.fecha_dispo_desierta_desde = filters.fecha_dispo_desierta_desde
      if (filters.fecha_dispo_desierta_hasta) params.fecha_dispo_desierta_hasta = filters.fecha_dispo_desierta_hasta
      // Concurso
      if (filters.escalafon_2)             params.escalafon_2             = filters.escalafon_2
      if (filters.puesto_2)                params.puesto_2                = filters.puesto_2
      if (filters.especialidad_solicitada) params.especialidad_solicitada = filters.especialidad_solicitada
      if (filters.ee_concurso)             params.ee_concurso             = filters.ee_concurso
      if (filters.fecha_ee_concurso_desde) params.fecha_ee_concurso_desde = filters.fecha_ee_concurso_desde
      if (filters.fecha_ee_concurso_hasta) params.fecha_ee_concurso_hasta = filters.fecha_ee_concurso_hasta
      if (filters.if_solicitante)          params.if_solicitante          = filters.if_solicitante
      if (filters.fecha_autorizacion_desde) params.fecha_autorizacion_desde = filters.fecha_autorizacion_desde
      if (filters.fecha_autorizacion_hasta) params.fecha_autorizacion_hasta = filters.fecha_autorizacion_hasta
      if (filters.sorteo_jurado)           params.sorteo_jurado           = filters.sorteo_jurado
      if (filters.disposicion)             params.disposicion             = filters.disposicion
      // Inscripción
      if (filters.insc_desde_desde)        params.insc_desde_desde        = filters.insc_desde_desde
      if (filters.insc_desde_hasta)        params.insc_desde_hasta        = filters.insc_desde_hasta
      if (filters.insc_hasta_desde)        params.insc_hasta_desde        = filters.insc_hasta_desde
      if (filters.insc_hasta_hasta)        params.insc_hasta_hasta        = filters.insc_hasta_hasta
      // Evaluación
      if (filters.examen_publicado)        params.examen_publicado        = filters.examen_publicado
      if (filters.fecha_examen_desde)      params.fecha_examen_desde      = filters.fecha_examen_desde
      if (filters.fecha_examen_hasta)      params.fecha_examen_hasta      = filters.fecha_examen_hasta
      if (filters.orden_merito)            params.orden_merito            = filters.orden_merito
      if (filters.fecha_orden_merito_desde) params.fecha_orden_merito_desde = filters.fecha_orden_merito_desde
      if (filters.fecha_orden_merito_hasta) params.fecha_orden_merito_hasta = filters.fecha_orden_merito_hasta
      if (filters.fecha_ifacs_desde)       params.fecha_ifacs_desde       = filters.fecha_ifacs_desde
      if (filters.fecha_ifacs_hasta)       params.fecha_ifacs_hasta       = filters.fecha_ifacs_hasta
      if (filters.insal)                   params.insal                   = filters.insal
      if (filters.fecha_insal_desde)       params.fecha_insal_desde       = filters.fecha_insal_desde
      if (filters.fecha_insal_hasta)       params.fecha_insal_hasta       = filters.fecha_insal_hasta
      if (filters.cargo_sial)              params.cargo_sial              = filters.cargo_sial
      // Designación
      if (filters.ee_designacion)          params.ee_designacion          = filters.ee_designacion
      if (filters.fecha_ee_designacion_desde) params.fecha_ee_designacion_desde = filters.fecha_ee_designacion_desde
      if (filters.fecha_ee_designacion_hasta) params.fecha_ee_designacion_hasta = filters.fecha_ee_designacion_hasta
      if (filters.nombre_designacion)      params.nombre_designacion      = filters.nombre_designacion
      if (filters.cuil_designacion)        params.cuil_designacion        = filters.cuil_designacion
      if (filters.carga_documentacion)     params.carga_documentacion     = filters.carga_documentacion
      if (filters.fecha_apto_medico_desde) params.fecha_apto_medico_desde = filters.fecha_apto_medico_desde
      if (filters.fecha_apto_medico_hasta) params.fecha_apto_medico_hasta = filters.fecha_apto_medico_hasta
      if (filters.fecha_ite_desde)         params.fecha_ite_desde         = filters.fecha_ite_desde
      if (filters.fecha_ite_hasta)         params.fecha_ite_hasta         = filters.fecha_ite_hasta
      if (filters.reso_a_la_firma)         params.reso_a_la_firma         = filters.reso_a_la_firma
      if (filters.resolucion_designacion)  params.resolucion_designacion  = filters.resolucion_designacion
      if (filters.fecha_resolucion_desde)  params.fecha_resolucion_desde  = filters.fecha_resolucion_desde
      if (filters.fecha_resolucion_hasta)  params.fecha_resolucion_hasta  = filters.fecha_resolucion_hasta
      if (filters.fecha_cargo_desde)       params.fecha_cargo_desde       = filters.fecha_cargo_desde
      if (filters.fecha_cargo_hasta)       params.fecha_cargo_hasta       = filters.fecha_cargo_hasta
      if (filters.cargo_baja)              params.cargo_baja              = filters.cargo_baja
      if (idBajaParam)                     params.id_baja                 = idBajaParam

      const data = await seguimientoApi.list(params)
      setRows(data.data ?? [])
      setTotal(data.meta?.count ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, sort, filters, idBajaParam])

  useEffect(() => { loadData(page) }, [loadData])

  useEffect(() => {
    configApi.getConjuntos()
      .then(data => {
        const vals = [...new Set((data.rules ?? []).map(r => r.result).filter(Boolean))].sort()
        setConjuntosOpts(vals)
      })
      .catch(() => {})
  }, [])

  // ── Helpers ────────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    loadData(1)
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
    loadData(page)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await seguimientoApi.remove(deleteTarget.id)
      setDeleteTarget(null)
      loadData(page)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = Object.values(filters).some(Boolean)
  const activeInSection = (keys) => keys.filter(k => filters[k]).length

  // Setter con cascada para unificador/escalafon_baja → puesto → especialidad
  const setFilterCascade = (key, value) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value }

      // Puesto 1 y especialidad_baja
      const p1Opts = getPuestoOptions(next.unificador_puestos, next.escalafon_baja)
      if (next.puesto_1 && !p1Opts.includes(next.puesto_1)) {
        next.puesto_1 = ''
        next.especialidad_baja = ''
      }
      if (next.puesto_1) {
        const e1Opts = getEspecialidadOptions(next.puesto_1, next.escalafon_baja)
        if (next.especialidad_baja && !e1Opts.includes(next.especialidad_baja)) next.especialidad_baja = ''
      } else {
        next.especialidad_baja = ''
      }

      // Puesto 2 y especialidad_solicitada
      const p2Opts = getPuestoOptions(next.unificador_puestos, next.escalafon_baja)
      if (next.puesto_2 && !p2Opts.includes(next.puesto_2)) {
        next.puesto_2 = ''
        next.especialidad_solicitada = ''
      }
      if (next.puesto_2) {
        const e2Opts = getEspecialidadOptions(next.puesto_2, next.escalafon_baja)
        if (next.especialidad_solicitada && !e2Opts.includes(next.especialidad_solicitada)) next.especialidad_solicitada = ''
      } else {
        next.especialidad_solicitada = ''
      }

      return next
    })
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS })
    setPage(1)
  }

  const handleExport = async (filtered) => {
    setExporting(true)
    try {
      const params = { limit: 9999, sort: sort.field, order: sort.order }
      if (filtered) {
        if (filters.search)                  params.search                  = filters.search
        if (filters.usuario)                 params.usuario                 = filters.usuario
        if (filters.sigla_efector)           params.sigla_efector           = filters.sigla_efector
        if (filters.tipo_efector)            params.tipo_efector            = filters.tipo_efector
        if (filters.origen)                  params.origen                  = filters.origen
        if (filters.conjuntos)               params.conjuntos               = filters.conjuntos
        if (filters.ee_baja)                 params.ee_baja                 = filters.ee_baja
        if (filters.cuil_baja)               params.cuil_baja               = filters.cuil_baja
        if (filters.escalafon_baja)          params.escalafon_baja          = filters.escalafon_baja
        if (filters.escalafon_1)             params.escalafon_1             = filters.escalafon_1
        if (filters.unificador_puestos)      params.unificador_puestos      = filters.unificador_puestos
        if (filters.puesto_1)                params.puesto_1                = filters.puesto_1
        if (filters.especialidad_baja)       params.especialidad_baja       = filters.especialidad_baja
        if (filters.motivo_baja)             params.motivo_baja             = filters.motivo_baja
        if (filters.fecha_baja_desde)        params.fecha_baja_desde        = filters.fecha_baja_desde
        if (filters.fecha_baja_hasta)        params.fecha_baja_hasta        = filters.fecha_baja_hasta
        if (filters.sub_estado_3)            params.sub_estado_3            = filters.sub_estado_3
        if (filters.suspendido)              params.suspendido              = filters.suspendido
        if (filters.cambio_especialidad)     params.cambio_especialidad     = filters.cambio_especialidad
        if (filters.dispo_desierta)          params.dispo_desierta          = filters.dispo_desierta
        if (filters.tipo_baja)               params.tipo_baja               = filters.tipo_baja
        if (filters.fecha_dispo_desierta_desde) params.fecha_dispo_desierta_desde = filters.fecha_dispo_desierta_desde
        if (filters.fecha_dispo_desierta_hasta) params.fecha_dispo_desierta_hasta = filters.fecha_dispo_desierta_hasta
        if (filters.escalafon_2)             params.escalafon_2             = filters.escalafon_2
        if (filters.puesto_2)                params.puesto_2                = filters.puesto_2
        if (filters.especialidad_solicitada) params.especialidad_solicitada = filters.especialidad_solicitada
        if (filters.ee_concurso)             params.ee_concurso             = filters.ee_concurso
        if (filters.fecha_ee_concurso_desde) params.fecha_ee_concurso_desde = filters.fecha_ee_concurso_desde
        if (filters.fecha_ee_concurso_hasta) params.fecha_ee_concurso_hasta = filters.fecha_ee_concurso_hasta
        if (filters.if_solicitante)          params.if_solicitante          = filters.if_solicitante
        if (filters.fecha_autorizacion_desde) params.fecha_autorizacion_desde = filters.fecha_autorizacion_desde
        if (filters.fecha_autorizacion_hasta) params.fecha_autorizacion_hasta = filters.fecha_autorizacion_hasta
        if (filters.sorteo_jurado)           params.sorteo_jurado           = filters.sorteo_jurado
        if (filters.disposicion)             params.disposicion             = filters.disposicion
        if (filters.insc_desde_desde)        params.insc_desde_desde        = filters.insc_desde_desde
        if (filters.insc_desde_hasta)        params.insc_desde_hasta        = filters.insc_desde_hasta
        if (filters.insc_hasta_desde)        params.insc_hasta_desde        = filters.insc_hasta_desde
        if (filters.insc_hasta_hasta)        params.insc_hasta_hasta        = filters.insc_hasta_hasta
        if (filters.examen_publicado)        params.examen_publicado        = filters.examen_publicado
        if (filters.fecha_examen_desde)      params.fecha_examen_desde      = filters.fecha_examen_desde
        if (filters.fecha_examen_hasta)      params.fecha_examen_hasta      = filters.fecha_examen_hasta
        if (filters.orden_merito)            params.orden_merito            = filters.orden_merito
        if (filters.fecha_orden_merito_desde) params.fecha_orden_merito_desde = filters.fecha_orden_merito_desde
        if (filters.fecha_orden_merito_hasta) params.fecha_orden_merito_hasta = filters.fecha_orden_merito_hasta
        if (filters.fecha_ifacs_desde)       params.fecha_ifacs_desde       = filters.fecha_ifacs_desde
        if (filters.fecha_ifacs_hasta)       params.fecha_ifacs_hasta       = filters.fecha_ifacs_hasta
        if (filters.insal)                   params.insal                   = filters.insal
        if (filters.fecha_insal_desde)       params.fecha_insal_desde       = filters.fecha_insal_desde
        if (filters.fecha_insal_hasta)       params.fecha_insal_hasta       = filters.fecha_insal_hasta
        if (filters.cargo_sial)              params.cargo_sial              = filters.cargo_sial
        if (filters.ee_designacion)          params.ee_designacion          = filters.ee_designacion
        if (filters.fecha_ee_designacion_desde) params.fecha_ee_designacion_desde = filters.fecha_ee_designacion_desde
        if (filters.fecha_ee_designacion_hasta) params.fecha_ee_designacion_hasta = filters.fecha_ee_designacion_hasta
        if (filters.nombre_designacion)      params.nombre_designacion      = filters.nombre_designacion
        if (filters.cuil_designacion)        params.cuil_designacion        = filters.cuil_designacion
        if (filters.carga_documentacion)     params.carga_documentacion     = filters.carga_documentacion
        if (filters.fecha_apto_medico_desde) params.fecha_apto_medico_desde = filters.fecha_apto_medico_desde
        if (filters.fecha_apto_medico_hasta) params.fecha_apto_medico_hasta = filters.fecha_apto_medico_hasta
        if (filters.fecha_ite_desde)         params.fecha_ite_desde         = filters.fecha_ite_desde
        if (filters.fecha_ite_hasta)         params.fecha_ite_hasta         = filters.fecha_ite_hasta
        if (filters.reso_a_la_firma)         params.reso_a_la_firma         = filters.reso_a_la_firma
        if (filters.resolucion_designacion)  params.resolucion_designacion  = filters.resolucion_designacion
        if (filters.fecha_resolucion_desde)  params.fecha_resolucion_desde  = filters.fecha_resolucion_desde
        if (filters.fecha_resolucion_hasta)  params.fecha_resolucion_hasta  = filters.fecha_resolucion_hasta
        if (filters.fecha_cargo_desde)       params.fecha_cargo_desde       = filters.fecha_cargo_desde
        if (filters.fecha_cargo_hasta)       params.fecha_cargo_hasta       = filters.fecha_cargo_hasta
        if (filters.cargo_baja)              params.cargo_baja              = filters.cargo_baja
        if (idBajaParam)                     params.id_baja                 = idBajaParam
      }
      const data = await seguimientoApi.list(params)
      const suffix = filtered ? 'filtrado' : 'completo'
      exportSeguimientoToExcel(data.data ?? [], `seguimiento-cph-${suffix}.xlsx`)
    } catch (e) {
      alert('Error al exportar: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4">

      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Seguimiento CPH</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {idBajaParam
              ? `Filtrando por baja #${idBajaParam}`
              : 'Registro de seguimiento de concursos'}
          </p>
        </div>
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
            <span className="ml-1 bg-primary-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              !
            </span>
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
            <ArrowDownTrayIcon className="w-4 h-4" />
            Excel filtrado
          </button>
          <button
            onClick={() => handleExport(false)}
            disabled={exporting}
            title="Exportar todos los registros"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-green-50 hover:border-green-400 hover:text-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Excel completo
          </button>
        </div>
      </div>

      {/* ── Panel de filtros — acordeón por sección ── */}
      {showFilters && (
        <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3">

          {/* 1 — Datos generales */}
          <FilterAccSection
            title="Datos generales"
            activeCount={activeInSection(['usuario','sigla_efector','tipo_efector','origen','conjuntos'])}
          >
            <FilterSelect label="Usuario" value={filters.usuario}
              onChange={v => { setFilters(f => ({ ...f, usuario: v })); setPage(1) }}
              options={OPCIONES_USUARIOS} />
            <FilterSearchSelect
              label="Sigla"
              value={filters.sigla_efector}
              onChange={v => { setFilters(f => ({ ...f, sigla_efector: v })); setPage(1) }}
              options={SIGLAS_DATA.map(s => ({ value: s.sigla, label: `${s.sigla} — ${s.descr}` }))}
            />
            <FilterSelect label="Tipo de efector" value={filters.tipo_efector}
              onChange={v => { setFilters(f => ({ ...f, tipo_efector: v })); setPage(1) }}
              options={OPCIONES_TIPO_EFECTOR} />
            <FilterSelect label="Origen" value={filters.origen}
              onChange={v => { setFilters(f => ({ ...f, origen: v })); setPage(1) }}
              options={OPCIONES_ORIGEN} />
            <FilterSelect label="Conjuntos" value={filters.conjuntos}
              onChange={v => { setFilters(f => ({ ...f, conjuntos: v })); setPage(1) }}
              options={conjuntosOpts} />
          </FilterAccSection>

          {/* 2 — Baja (con cascada) */}
          <FilterAccSection
            title="Baja"
            activeCount={activeInSection(['ee_baja','cuil_baja','escalafon_baja','escalafon_1','unificador_puestos','puesto_1','especialidad_baja','motivo_baja','fecha_baja_desde','fecha_baja_hasta'])}
          >
            <FilterText label="EE baja" value={filters.ee_baja}
              onChange={v => { setFilters(f => ({ ...f, ee_baja: v })); setPage(1) }}
              placeholder="EX-2024-…" />
            <FilterText label="CUIL" value={filters.cuil_baja}
              onChange={v => { setFilters(f => ({ ...f, cuil_baja: v })); setPage(1) }}
              placeholder="20123456789" />
            <FilterSelect label="Escalafón (Méd./No Méd.)" value={filters.escalafon_baja}
              onChange={v => setFilterCascade('escalafon_baja', v)} options={OPCIONES_ESCALAFON_BAJAS} />
            <FilterSelect label="Escalafón (POU/POF)" value={filters.escalafon_1}
              onChange={v => { setFilters(f => ({ ...f, escalafon_1: v })); setPage(1) }}
              options={OPCIONES_ESCALAFON_SEGUIMIENTO} />
            <FilterSelect label="Unificador de puestos" value={filters.unificador_puestos}
              onChange={v => setFilterCascade('unificador_puestos', v)} options={OPCIONES_UNIFICADOR_PUESTOS} />
            <FilterSearchSelect
              label={`Puesto${puesto1Options.length < 30 && (filters.unificador_puestos || filters.escalafon_baja) ? ` (${puesto1Options.length})` : ''}`}
              value={filters.puesto_1}
              onChange={v => setFilterCascade('puesto_1', v)}
              options={puesto1Options}
              hint={!filters.unificador_puestos && !filters.escalafon_baja ? 'Filtrá Unificador o Escalafón para acotar' : null}
            />
            <FilterSearchSelect
              label={`Especialidad baja${especialidadBajaOptions.length < 30 && filters.puesto_1 ? ` (${especialidadBajaOptions.length})` : ''}`}
              value={filters.especialidad_baja}
              onChange={v => { setFilters(f => ({ ...f, especialidad_baja: v })); setPage(1) }}
              options={especialidadBajaOptions}
              disabled={!filters.puesto_1}
              hint={!filters.puesto_1 ? 'Seleccioná un puesto primero' : null}
            />
            <FilterSelect label="Motivo de baja" value={filters.motivo_baja}
              onChange={v => { setFilters(f => ({ ...f, motivo_baja: v })); setPage(1) }}
              options={OPCIONES_MOTIVO_BAJA} />
            <FilterDate label="Fecha baja desde" value={filters.fecha_baja_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_baja_desde: v })); setPage(1) }} />
            <FilterDate label="Fecha baja hasta" value={filters.fecha_baja_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_baja_hasta: v })); setPage(1) }} />
          </FilterAccSection>

          {/* 3 — Estado del proceso */}
          <FilterAccSection
            title="Estado del proceso"
            activeCount={activeInSection(['sub_estado_3','suspendido','cambio_especialidad','dispo_desierta','tipo_baja','fecha_dispo_desierta_desde','fecha_dispo_desierta_hasta'])}
          >
            <FilterSelect label="Sub-estado (progreso)" value={filters.sub_estado_3}
              onChange={v => { setFilters(f => ({ ...f, sub_estado_3: v })); setPage(1) }}
              options={OPCIONES_SUB_ESTADO_3} />
            <FilterBoolSelect label="Suspendido" value={filters.suspendido}
              onChange={v => { setFilters(f => ({ ...f, suspendido: v })); setPage(1) }} />
            <FilterSelect label="Cambio especialidad" value={filters.cambio_especialidad}
              onChange={v => { setFilters(f => ({ ...f, cambio_especialidad: v })); setPage(1) }}
              options={['SI', 'NO']} />
            <FilterSelect label="Dispo. desierta" value={filters.dispo_desierta}
              onChange={v => { setFilters(f => ({ ...f, dispo_desierta: v })); setPage(1) }}
              options={OPCIONES_DISPO_DESIERTA} />
            <FilterDate label="F. dispo. desierta desde" value={filters.fecha_dispo_desierta_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_dispo_desierta_desde: v })); setPage(1) }} />
            <FilterDate label="F. dispo. desierta hasta" value={filters.fecha_dispo_desierta_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_dispo_desierta_hasta: v })); setPage(1) }} />
            <FilterText label="Tipo de baja" value={filters.tipo_baja}
              onChange={v => { setFilters(f => ({ ...f, tipo_baja: v })); setPage(1) }}
              placeholder="Ingresá tipo…" />
          </FilterAccSection>

          {/* 4 — Concurso (con cascada puesto_2 → especialidad_solicitada) */}
          <FilterAccSection
            title="Concurso"
            activeCount={activeInSection(['escalafon_2','puesto_2','especialidad_solicitada','ee_concurso','fecha_ee_concurso_desde','fecha_ee_concurso_hasta','if_solicitante','fecha_autorizacion_desde','fecha_autorizacion_hasta','sorteo_jurado','disposicion'])}
          >
            <FilterSelect label="Escalafón 2 (POU/POF)" value={filters.escalafon_2}
              onChange={v => { setFilters(f => ({ ...f, escalafon_2: v })); setPage(1) }}
              options={OPCIONES_ESCALAFON_SEGUIMIENTO} />
            <FilterSearchSelect
              label={`Puesto 2${puesto2Options.length < 30 && (filters.unificador_puestos || filters.escalafon_baja) ? ` (${puesto2Options.length})` : ''}`}
              value={filters.puesto_2}
              onChange={v => setFilterCascade('puesto_2', v)}
              options={puesto2Options}
              hint={!filters.unificador_puestos && !filters.escalafon_baja ? 'Filtrá Unificador o Escalafón para acotar' : null}
            />
            <FilterSearchSelect
              label={`Especialidad sol.${especialidadSolOptions.length < 30 && filters.puesto_2 ? ` (${especialidadSolOptions.length})` : ''}`}
              value={filters.especialidad_solicitada}
              onChange={v => { setFilters(f => ({ ...f, especialidad_solicitada: v })); setPage(1) }}
              options={especialidadSolOptions}
              disabled={!filters.puesto_2}
              hint={!filters.puesto_2 ? 'Seleccioná Puesto 2 primero' : null}
            />
            <FilterText label="EE concurso" value={filters.ee_concurso}
              onChange={v => { setFilters(f => ({ ...f, ee_concurso: v })); setPage(1) }}
              placeholder="EX-2024-…" />
            <FilterDate label="F. EE concurso desde" value={filters.fecha_ee_concurso_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_ee_concurso_desde: v })); setPage(1) }} />
            <FilterDate label="F. EE concurso hasta" value={filters.fecha_ee_concurso_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_ee_concurso_hasta: v })); setPage(1) }} />
            <FilterText label="IF solicitante" value={filters.if_solicitante}
              onChange={v => { setFilters(f => ({ ...f, if_solicitante: v })); setPage(1) }}
              placeholder="IF-2024-…" />
            <FilterDate label="F. autorización desde" value={filters.fecha_autorizacion_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_autorizacion_desde: v })); setPage(1) }} />
            <FilterDate label="F. autorización hasta" value={filters.fecha_autorizacion_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_autorizacion_hasta: v })); setPage(1) }} />
            <FilterBoolSelect label="Sorteo jurado" value={filters.sorteo_jurado}
              onChange={v => { setFilters(f => ({ ...f, sorteo_jurado: v })); setPage(1) }} />
            <FilterText label="Disposición" value={filters.disposicion}
              onChange={v => { setFilters(f => ({ ...f, disposicion: v })); setPage(1) }}
              placeholder="Ingresá disposición…" />
          </FilterAccSection>

          {/* 5 — Inscripción */}
          <FilterAccSection
            title="Inscripción"
            activeCount={activeInSection(['insc_desde_desde','insc_desde_hasta','insc_hasta_desde','insc_hasta_hasta'])}
          >
            <FilterDate label="F. insc. desde — desde" value={filters.insc_desde_desde}
              onChange={v => { setFilters(f => ({ ...f, insc_desde_desde: v })); setPage(1) }} />
            <FilterDate label="F. insc. desde — hasta" value={filters.insc_desde_hasta}
              onChange={v => { setFilters(f => ({ ...f, insc_desde_hasta: v })); setPage(1) }} />
            <FilterDate label="F. insc. hasta — desde" value={filters.insc_hasta_desde}
              onChange={v => { setFilters(f => ({ ...f, insc_hasta_desde: v })); setPage(1) }} />
            <FilterDate label="F. insc. hasta — hasta" value={filters.insc_hasta_hasta}
              onChange={v => { setFilters(f => ({ ...f, insc_hasta_hasta: v })); setPage(1) }} />
          </FilterAccSection>

          {/* 6 — Evaluación */}
          <FilterAccSection
            title="Evaluación"
            activeCount={activeInSection(['examen_publicado','fecha_examen_desde','fecha_examen_hasta','orden_merito','fecha_orden_merito_desde','fecha_orden_merito_hasta','fecha_ifacs_desde','fecha_ifacs_hasta','insal','fecha_insal_desde','fecha_insal_hasta'])}
          >
            <FilterBoolSelect label="Examen publicado" value={filters.examen_publicado}
              onChange={v => { setFilters(f => ({ ...f, examen_publicado: v })); setPage(1) }} />
            <FilterDate label="F. examen desde" value={filters.fecha_examen_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_examen_desde: v })); setPage(1) }} />
            <FilterDate label="F. examen hasta" value={filters.fecha_examen_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_examen_hasta: v })); setPage(1) }} />
            <FilterBoolSelect label="Orden de mérito" value={filters.orden_merito}
              onChange={v => { setFilters(f => ({ ...f, orden_merito: v })); setPage(1) }} />
            <FilterDate label="F. orden mérito desde" value={filters.fecha_orden_merito_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_orden_merito_desde: v })); setPage(1) }} />
            <FilterDate label="F. orden mérito hasta" value={filters.fecha_orden_merito_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_orden_merito_hasta: v })); setPage(1) }} />
            <FilterDate label="F. IFACS desde" value={filters.fecha_ifacs_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_ifacs_desde: v })); setPage(1) }} />
            <FilterDate label="F. IFACS hasta" value={filters.fecha_ifacs_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_ifacs_hasta: v })); setPage(1) }} />
            <FilterBoolSelect label="INSAL" value={filters.insal}
              onChange={v => { setFilters(f => ({ ...f, insal: v })); setPage(1) }} />
            <FilterDate label="F. INSAL desde" value={filters.fecha_insal_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_insal_desde: v })); setPage(1) }} />
            <FilterDate label="F. INSAL hasta" value={filters.fecha_insal_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_insal_hasta: v })); setPage(1) }} />
          </FilterAccSection>

          {/* 7 — Designación */}
          <FilterAccSection
            title="Designación"
            activeCount={activeInSection(['ee_designacion','fecha_ee_designacion_desde','fecha_ee_designacion_hasta','nombre_designacion','cuil_designacion','carga_documentacion','fecha_apto_medico_desde','fecha_apto_medico_hasta','fecha_ite_desde','fecha_ite_hasta','reso_a_la_firma','resolucion_designacion','fecha_resolucion_desde','fecha_resolucion_hasta','fecha_cargo_desde','fecha_cargo_hasta','cargo_baja','cargo_sial'])}
          >
            <FilterText label="EE designación" value={filters.ee_designacion}
              onChange={v => { setFilters(f => ({ ...f, ee_designacion: v })); setPage(1) }}
              placeholder="EX-2024-…" />
            <FilterDate label="F. EE desig. desde" value={filters.fecha_ee_designacion_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_ee_designacion_desde: v })); setPage(1) }} />
            <FilterDate label="F. EE desig. hasta" value={filters.fecha_ee_designacion_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_ee_designacion_hasta: v })); setPage(1) }} />
            <FilterText label="Nombre designado" value={filters.nombre_designacion}
              onChange={v => { setFilters(f => ({ ...f, nombre_designacion: v })); setPage(1) }}
              placeholder="Apellido…" />
            <FilterText label="CUIL designado" value={filters.cuil_designacion}
              onChange={v => { setFilters(f => ({ ...f, cuil_designacion: v })); setPage(1) }}
              placeholder="20123456789" />
            <FilterBoolSelect label="Carga documentación" value={filters.carga_documentacion}
              onChange={v => { setFilters(f => ({ ...f, carga_documentacion: v })); setPage(1) }} />
            <FilterDate label="F. apto médico desde" value={filters.fecha_apto_medico_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_apto_medico_desde: v })); setPage(1) }} />
            <FilterDate label="F. apto médico hasta" value={filters.fecha_apto_medico_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_apto_medico_hasta: v })); setPage(1) }} />
            <FilterDate label="F. ITE desde" value={filters.fecha_ite_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_ite_desde: v })); setPage(1) }} />
            <FilterDate label="F. ITE hasta" value={filters.fecha_ite_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_ite_hasta: v })); setPage(1) }} />
            <FilterBoolSelect label="Reso. a la firma" value={filters.reso_a_la_firma}
              onChange={v => { setFilters(f => ({ ...f, reso_a_la_firma: v })); setPage(1) }} />
            <FilterText label="Resolución designación" value={filters.resolucion_designacion}
              onChange={v => { setFilters(f => ({ ...f, resolucion_designacion: v })); setPage(1) }}
              placeholder="N° resolución…" />
            <FilterDate label="F. resolución desde" value={filters.fecha_resolucion_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_resolucion_desde: v })); setPage(1) }} />
            <FilterDate label="F. resolución hasta" value={filters.fecha_resolucion_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_resolucion_hasta: v })); setPage(1) }} />
            <FilterDate label="F. cargo desde" value={filters.fecha_cargo_desde}
              onChange={v => { setFilters(f => ({ ...f, fecha_cargo_desde: v })); setPage(1) }} />
            <FilterDate label="F. cargo hasta" value={filters.fecha_cargo_hasta}
              onChange={v => { setFilters(f => ({ ...f, fecha_cargo_hasta: v })); setPage(1) }} />
            <FilterText label="Cargo baja (POU)" value={filters.cargo_baja}
              onChange={v => { setFilters(f => ({ ...f, cargo_baja: v })); setPage(1) }}
              placeholder="Cargo…" />
            <FilterText label="Cargo SIAL" value={filters.cargo_sial}
              onChange={v => { setFilters(f => ({ ...f, cargo_sial: v })); setPage(1) }}
              placeholder="Código SIAL…" />
          </FilterAccSection>

        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>59 columnas</span>
        <span>
          {loading
            ? 'Cargando...'
            : `${total.toLocaleString('es-AR')} registro${total !== 1 ? 's' : ''}${totalPages > 1 ? ` · pág. ${page} de ${totalPages}` : ''}`
          }
        </span>
      </div>

      {/* Tabla */}
      <div
        ref={tableRef}
        className="overflow-auto rounded-lg border border-gray-200 flex-1"
        style={{ maxHeight: 'calc(100vh - 360px)', minHeight: '280px' }}
      >
        <table className="text-sm border-collapse" style={{ minWidth: '6000px' }}>
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                {/* — Datos generales — */}
                <Th label="Usuario" field="usuario" sort={sort} onSort={handleSortToggle} />
                <Th label="Efector" field="descr_efector" sort={sort} onSort={handleSortToggle} />
                <Th label="Sigla" field="sigla_efector" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Tipo efector</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Origen</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Conjuntos</th>
                <Th label="Estado" field="estado" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sub-estado</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sub-estado 3</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Cambio esp.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Tipo baja</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Suspendido</th>
                {/* — Baja — */}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Cargo baja</th>
                <Th label="EE baja" field="ee_baja" sort={sort} onSort={handleSortToggle} />
                <Th label="CUIL" field="cuil_baja" sort={sort} onSort={handleSortToggle} />
                <Th label="Nombre baja" field="nombre_baja" sort={sort} onSort={handleSortToggle} />
                <Th label="Fecha baja" field="fecha_baja" sort={sort} onSort={handleSortToggle} />
                <Th label="Escalafón" field="escalafon_1" sort={sort} onSort={handleSortToggle} />
                <Th label="Puesto" field="puesto_1" sort={sort} onSort={handleSortToggle} />
                <Th label="Especialidad baja" field="especialidad_baja" sort={sort} onSort={handleSortToggle} />
                {/* — Concurso — */}
                <Th label="EE concurso" field="ee_concurso" sort={sort} onSort={handleSortToggle} />
                <Th label="F. EE concurso" field="fecha_ee_concurso" sort={sort} onSort={handleSortToggle} />
                <Th label="Escalafón 2" field="escalafon_2" sort={sort} onSort={handleSortToggle} />
                <Th label="Puesto 2" field="puesto_2" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Especialidad sol.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">IF solicitante</th>
                <Th label="F. autorización" field="fecha_autorizacion" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Sorteo jurado</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Disposición</th>
                {/* — Inscripción — */}
                <Th label="F. insc. desde" field="fecha_insc_desde" sort={sort} onSort={handleSortToggle} />
                <Th label="F. insc. hasta" field="fecha_insc_hasta" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Q. inscriptos</th>
                {/* — Evaluación — */}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Examen pub.</th>
                <Th label="F. examen" field="fecha_examen" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Orden mérito</th>
                <Th label="F. orden mérito" field="fecha_orden_merito" sort={sort} onSort={handleSortToggle} />
                {/* — Adjudicación — */}
                <Th label="F. IFACS" field="fecha_ifacs" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">INSAL</th>
                <Th label="F. INSAL" field="fecha_insal" sort={sort} onSort={handleSortToggle} />
                {/* — Designación — */}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">EE designación</th>
                <Th label="F. EE desig." field="fecha_ee_designacion" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Nombre desig.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">CUIL desig.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Carga doc.</th>
                <Th label="F. apto médico" field="fecha_apto_medico" sort={sort} onSort={handleSortToggle} />
                <Th label="F. ITE" field="fecha_ite" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Reso a la firma</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Reso. designación</th>
                <Th label="F. resolución" field="fecha_resolucion" sort={sort} onSort={handleSortToggle} />
                <Th label="F. cargo" field="fecha_cargo" sort={sort} onSort={handleSortToggle} />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Cargo SIAL</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Dispo. desierta</th>
                <Th label="F. dispo. desierta" field="fecha_dispo_desierta" sort={sort} onSort={handleSortToggle} />
                {/* — Observaciones — */}
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Observaciones</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide sticky right-0 bg-gray-50 whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={60} className="py-10 text-center"><Spinner /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={60} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
              ) : rows.map(row => {
                const bool = v => v ? 'Sí' : 'No'
                return (
                <tr
                  key={row.id}
                  onClick={() => setViewRecord(row)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  {/* Datos generales */}
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.usuario ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.descr_efector ?? '—'}</td>
                  <td className="px-3 py-2 text-xs font-medium text-gray-900 whitespace-nowrap">{row.sigla_efector ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.tipo_efector ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.origen ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.conjuntos ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <EstadoBadge estado={calcEstado(row)} />
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{calcSubEstado(row) || '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{calcSubEstado3(row) || '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.cambio_especialidad ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.tipo_baja ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{bool(row.suspendido)}</td>
                  {/* Baja */}
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.cargo_baja ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.ee_baja ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{row.cuil_baja ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{row.nombre_baja ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_baja)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.escalafon_1 ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.puesto_1 ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.especialidad_baja ?? '—'}</td>
                  {/* Concurso */}
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.ee_concurso ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_ee_concurso)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.escalafon_2 ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.puesto_2 ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.especialidad_solicitada ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.if_solicitante ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_autorizacion)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{bool(row.sorteo_jurado)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.disposicion ?? '—'}</td>
                  {/* Inscripción */}
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_insc_desde)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_insc_hasta)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">{row.q_inscriptos ?? '—'}</td>
                  {/* Evaluación */}
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{bool(row.examen_publicado)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_examen)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{bool(row.orden_merito)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_orden_merito)}</td>
                  {/* Adjudicación */}
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_ifacs)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{bool(row.insal)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_insal)}</td>
                  {/* Designación */}
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.ee_designacion ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_ee_designacion)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.nombre_designacion ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 whitespace-nowrap">{row.cuil_designacion ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{bool(row.carga_documentacion)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_apto_medico)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_ite)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{bool(row.reso_a_la_firma)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.resolucion_designacion ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_resolucion)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_cargo)}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.cargo_sial ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{row.dispo_desierta ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{formatDate(row.fecha_dispo_desierta)}</td>
                  {/* Observaciones */}
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap max-w-[200px] truncate" title={row.observaciones ?? ''}>{row.observaciones ?? '—'}</td>
                  <td className="px-3 py-2.5 sticky right-0 bg-white" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      {!esConcursales && (
                        <>
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
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
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

      {/* Modal solo ver (click en fila) */}
      {viewRecord && (
        <SeguimientoCphDetail
          initial={viewRecord}
          readOnly
          onSaved={() => {}}
          onClose={() => setViewRecord(null)}
        />
      )}

      {/* Modal detalle/edición (botón lápiz) */}
      {detailRecord && (
        <SeguimientoCphDetail
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
              ¿Eliminar el seguimiento <strong>#{deleteTarget.id}</strong>
              {deleteTarget.nombre_baja ? ` (${deleteTarget.nombre_baja})` : ''}?
              Esta acción no se puede deshacer.
            </p>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancelar
              </button>
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

// ─── Badge de estado ─────────────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  if (!estado) return <span className="text-gray-400">—</span>
  const colors = getColorEstadoCph(estado)
  return (
    <span
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        outline: `1px solid ${colors.ring}`,
      }}
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
    >
      {estado}
    </span>
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

// ─── FilterText — input texto libre ──────────────────────────────────────────
function FilterText({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="form-input text-sm w-full"
      />
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
      setDropStyle({
        position: 'fixed',
        zIndex: 9999,
        top:  rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 260),
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

// ─── FilterDate — input fecha ────────────────────────────────────────────────
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

// ─── Celda de tiempo calculado ────────────────────────────────────────────────
/**
 * Muestra un valor de tiempo calculado con color-coding:
 *  - string (estado textual)  → gris o color según contenido
 *  - número de días           → verde <30, amarillo 30-90, rojo >90
 */

