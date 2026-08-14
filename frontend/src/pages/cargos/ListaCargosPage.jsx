import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon, InformationCircleIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { altaCargoApi } from '../../api/altaCargoApi'

function SiglaPickerModal({ siglas, value, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const inputRef  = useRef(null)
  const filtered  = q.trim()
    ? siglas.filter(s => s.toLowerCase().includes(q.toLowerCase()))
    : siglas
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col" style={{ maxHeight: '70vh' }} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Filtrar por Ubicación</span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><XMarkIcon className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar sigla..." className="form-input text-sm w-full pl-9" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {value && (
            <button onClick={() => { onSelect(''); onClose() }} className="w-full flex items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-b border-gray-50">
              <XMarkIcon className="w-3.5 h-3.5 mr-2" /> Quitar filtro
            </button>
          )}
          {filtered.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-400 text-center">Sin resultados</p>
            : filtered.map(s => (
              <button key={s} onClick={() => { onSelect(s); onClose() }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${s === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                {s}
                {s === value && <CheckIcon className="w-4 h-4 text-primary-600" />}
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}

const ESTADOS_ENUM = ['vigente', 'no_vigente']
const ESTADOS_FILTER = ['vigente', 'no_vigente', 'vacante', 'comision', 'retencion']
const SR_ENUM = ['activo', 'retencion_cargo', 'comision']
const SR_LABELS = { activo: 'Activo', retencion_cargo: 'Retención de Cargo', comision: 'Comisión' }
const SR_STYLES = {
  activo:          'bg-green-100 text-green-700',
  retencion_cargo: 'bg-orange-100 text-orange-700',
  comision:        'bg-blue-100 text-blue-700',
}
const isJefeDirector = row => /^CPH-[JD]-/.test(row.codigo || '')

const TIPO_ALTA_LABELS = { ejecucion: 'Ejecución', estructura: 'Estructura' }

function InfoModal({ cargoId, onClose }) {
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)
  useEffect(() => {
    altaCargoApi.getNewCargoInfo(cargoId)
      .then(setData)
      .catch(e => setError(e.message))
  }, [cargoId])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: '85vh' }} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <span className="text-sm font-semibold text-gray-800">Información del cargo</span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><XMarkIcon className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!data && !error && <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>}
          {data && (
            <>
              {/* Organigrama */}
              <Section title="Organigrama">
                {data.org_desc_rep ? (
                  <>
                    <Row label="Repartición" val={<span className="font-medium text-gray-800">{data.org_desc_rep}</span>} />
                    {data.org_tipo && <Row label="Tipo" val={<span className="capitalize text-gray-600">{data.org_tipo}</span>} />}
                    {data.org_lvl  && <Row label="Nivel" val={<span className="text-gray-600">{data.org_lvl}</span>} />}
                    {data.org_path && (
                      <Row label="Jerarquía" val={
                        <span className="text-[11px] text-gray-400 leading-relaxed">
                          {data.org_path.replace(/\\/g, ' › ').replace(/^ › /, '')}
                        </span>
                      } />
                    )}
                  </>
                ) : (
                  <Row label="Estado" val={<span className="text-xs text-gray-400">Sin datos de organigrama</span>} />
                )}
              </Section>

              {/* Dotación */}
              <Section title="Dotación">
                {data.dot_ayn ? (
                  <>
                    <Row label="Agente" val={<span className="font-medium">{data.dot_ayn}</span>} />
                    <Row label="CUIL" val={<span className="font-mono text-gray-600">{data.dot_cuil}</span>} />
                    {data.dot_especialidad && <Row label="Especialidad" val={data.dot_especialidad} />}
                    <Row label="ID SIAL rol" val={<span className="font-mono text-xs text-gray-500">{data.dot_id_sial}</span>} />  
                    {data.dot_reparticion && <Row label="Repartición" val={data.dot_reparticion} />}
                    {data.dot_sit_revista && (
                      <Row label="Sit. revista" val={
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SR_STYLES[data.dot_sit_revista] || 'bg-gray-100 text-gray-600'}`}>
                          {SR_LABELS[data.dot_sit_revista] || data.dot_sit_revista}
                        </span>
                      } />
                    )}
                    {data.dot_periodo && <Row label="Período" val={data.dot_periodo} />}
                  </>
                ) : (
                  <Row label="Estado" val={<span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Vacante</span>} />
                )}
              </Section>

              {/* Identificación */}
              <Section title="Identificación">
                <Row label="Código"    val={<span className="font-mono font-semibold text-primary-700">{data.codigo}</span>} />
                {data.id_sial && <Row label="ID SIAL" val={<span className="font-mono text-gray-600">{data.id_sial}</span>} />}
                <Row label="Sigla"     val={data.sigla} />
                <Row label="Carrera"   val={data.carrera} />
                <Row label="Modalidad" val={<span className="capitalize">{data.modalidad}</span>} />
                {data.categoria_interna && (
                  <Row label="Categoría" val={
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold">{data.categoria_interna}</span>
                  } />
                )}
              </Section>

              {/* Puesto */}
              <Section title="Puesto">
                {data.puesto      && <Row label="Puesto"       val={data.puesto} />}
                {data.especialidad && <Row label="Especialidad" val={data.especialidad} />}
                {isJefeDirector(data) && (
                  <Row label="Sit. revista" val={
                    data.situacion_revista
                      ? <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SR_STYLES[data.situacion_revista]}`}>{SR_LABELS[data.situacion_revista]}</span>
                      : <Dash />
                  } />
                )}
              </Section>

              {/* Estado y fechas */}
              <Section title="Estado y fechas">
                <Row label="Estado" val={
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_STYLES[data.estado] || 'bg-gray-100 text-gray-600'}`}>{data.estado}</span>
                } />
                <Row label="Cargo desde"   val={data.cargo_desde   ? fmtDate(data.cargo_desde)   : <Dash />} />
                <Row label="Cargo hasta"   val={data.cargo_hasta   ? fmtDate(data.cargo_hasta)   : <Dash />} />
                <Row label="Antigüedad"    val={data.antiguedad_calc || (data.antiguedad ? fmtDate(data.antiguedad) : <Dash />)} />
                <Row label="Fecha alta"    val={data.fecha_alta    ? fmtDate(data.fecha_alta)    : <Dash />} />
                <Row label="Actualización" val={data.fecha_actualizacion ? fmtDate(data.fecha_actualizacion) : <Dash />} />
              </Section>

              {/* Datos del alta */}
              <Section title="Datos del alta">
                <Row label="Tipo alta"   val={data.tipo_alta ? (TIPO_ALTA_LABELS[data.tipo_alta] || data.tipo_alta) : <Dash />} />
                <Row label="Expediente"  val={data.expediente || <span className="text-amber-500 text-xs">Sin expediente</span>} />
                <Row label="Cantidad"    val={data.cantidad ?? <Dash />} />
                <Row label="Fec. registro" val={data.fecha_registro ? fmtDate(data.fecha_registro) : <Dash />} />
                <Row label="Norma ref."  val={data.norma_ref_final  || <Dash />} />
                <Row label="Resolución"  val={data.resolucion_final || <Dash />} />
                <Row label="Doc. origen" val={data.doc_origen_final || <Dash />} />
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Dash() {
  return <span className="text-gray-300 text-xs">—</span>
}

function Row({ label, val }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-gray-400 w-24 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800">{val}</span>
    </div>
  )
}

function EditModal({ row, onClose, onSaved }) {
  const [form, setForm]     = useState(null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  useEffect(() => {
    altaCargoApi.getNewCargoInfo(row.id).then(data => {
      setForm({
        expediente:         data.expediente         || '',
        estado:             data.estado             || '',
        situacion_revista:  data.situacion_revista  || '',
        cargo_desde: data.cargo_desde ? data.cargo_desde.slice(0, 10) : '',
        cargo_hasta: data.cargo_hasta ? data.cargo_hasta.slice(0, 10) : '',
        antiguedad:  data.antiguedad  ? data.antiguedad.slice(0, 10)  : '',
      })
    }).catch(e => setError(e.message))
  }, [row.id])

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    setSaving(true); setError(null)
    try {
      const updated = await altaCargoApi.updateNewCargo(row.id, form)
      onSaved(updated)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Editar cargo <span className="font-mono text-primary-700">{row.codigo}</span></span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><XMarkIcon className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {!form && !error && <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>}
          {error && <p className="text-xs text-red-500">{error}</p>}
          {form && (<>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Expediente</label>
            <input type="text" value={form.expediente} onChange={e => set('expediente', e.target.value)}
              placeholder="Ej: 2024-12345" className="form-input text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)} className="form-input text-sm w-full">
              {ESTADOS_ENUM.map(e => <option key={e} value={e} className="capitalize">{e}</option>)}
            </select>
          </div>
          {isJefeDirector(row) && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Situación de revista</label>
              <select value={form.situacion_revista} onChange={e => set('situacion_revista', e.target.value)} className="form-input text-sm w-full">
                <option value="">— Sin asignar —</option>
                {SR_ENUM.map(v => <option key={v} value={v}>{SR_LABELS[v]}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cargo desde</label>
            <input type="date" value={form.cargo_desde} onChange={e => set('cargo_desde', e.target.value)} className="form-input text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cargo hasta</label>
            <input type="date" value={form.cargo_hasta} onChange={e => set('cargo_hasta', e.target.value)} className="form-input text-sm w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Antigüedad (fecha inicio)</label>
            <input type="date" value={form.antiguedad} onChange={e => set('antiguedad', e.target.value)} className="form-input text-sm w-full" />
          </div>
          </>)}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form}
            className="px-4 py-1.5 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Columnas de la tabla — orden lógico
const COLS = [
  { key: 'codigo',              label: 'Código',          mono: true  },
  { key: 'sigla',               label: 'Sigla'                        },
  { key: 'org_desc_rep',        label: 'Repartición',      wide: true  },
  { key: 'puesto',              label: 'Puesto',          wide: true  },
  { key: 'especialidad',        label: 'Especialidad',    wide: true  },
  { key: 'estado',              label: 'Estado'                       },
  { key: 'dot_ocupacion',       label: 'Situación'                     },
  { key: 'dot_ayn',             label: 'Ocupado por',     wide: true  },
  { key: 'antiguedad_calc',     label: 'Antigüedad'                   },
  { key: 'cargo_desde',         label: 'Desde',           date: true  },
  { key: 'cargo_hasta',         label: 'Hasta',           date: true  },
]

const ESTADO_STYLES = {
  vigente:    'bg-green-100 text-green-700',
  no_vigente: 'bg-red-100 text-red-700',
  comision:   'bg-yellow-100 text-yellow-700',
  retencion:  'bg-gray-100 text-gray-600',
}

const fmtDate = v => v ? new Date(v).toLocaleDateString('es-AR') : null

const OCUPACION_CONFIG = {
  activo:    { l: 'Ocupado',   cls: 'bg-green-100 text-green-700'   },
  vacante:   { l: 'Vacante',   cls: 'bg-amber-100 text-amber-700'   },
  comision:  { l: 'Comisión',  cls: 'bg-blue-100 text-blue-700'     },
  retencion: { l: 'Retención', cls: 'bg-orange-100 text-orange-700' },
}

function CellValue({ val, col, row }) {
  if (col.key === 'dot_ocupacion') {
    if (!val) return <span className="text-gray-300">—</span>
    const cfg = OCUPACION_CONFIG[val]
    if (!cfg) return <span>{val}</span>
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>{cfg.l}</span>
  }
  if (col.key === 'dot_ayn') {
    if (!val) return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Vacante</span>
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className="font-medium text-gray-800 max-w-[200px] truncate block">{val}</span>
        {row?.dot_cuil && <span className="text-[10px] text-gray-400 font-mono">{row.dot_cuil}</span>}
      </span>
    )
  }
  if (!val) return <span className="text-gray-300">—</span>
  if (col.date)  return <span className="text-gray-600">{fmtDate(val)}</span>
  if (col.mono)  return <span className="font-mono font-semibold text-primary-700">{val}</span>
  if (col.key === 'estado') {
    const cls = ESTADO_STYLES[val.toLowerCase()] || 'bg-gray-100 text-gray-600'
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>{val}</span>
  }
  if (col.sr) {
    const cls = SR_STYLES[val] || 'bg-gray-100 text-gray-600'
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{SR_LABELS[val] || val}</span>
  }
  if (col.key === 'modalidad') return <span className="capitalize">{val}</span>
  if (col.key === 'antiguedad_calc') return <span className="text-gray-700 font-medium">{val}</span>
  return <span className={col.wide ? 'max-w-[200px] truncate block' : ''}>{val}</span>
}

function CategoriaPickerModal({ etiquetas, value, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const inputRef  = useRef(null)
  const filtered  = q.trim()
    ? etiquetas.filter(e => e.codigo.toLowerCase().includes(q.toLowerCase()) || (e.descripcion || '').toLowerCase().includes(q.toLowerCase()))
    : etiquetas
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col" style={{ maxHeight: '70vh' }} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Filtrar por Categoría</span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><XMarkIcon className="w-4 h-4" /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar categoría..." className="form-input text-sm w-full pl-9" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {value && (
            <button onClick={() => { onSelect(''); onClose() }} className="w-full flex items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-b border-gray-50">
              <XMarkIcon className="w-3.5 h-3.5 mr-2" /> Quitar filtro
            </button>
          )}
          {filtered.length === 0
            ? <p className="px-4 py-8 text-sm text-gray-400 text-center">Sin resultados</p>
            : filtered.map(e => (
              <button key={e.id} onClick={() => { onSelect(e.codigo); onClose() }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  e.codigo === value ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                <span className="flex flex-col items-start">
                  <span className="font-medium">{e.codigo}</span>
                  {e.descripcion && <span className="text-xs text-gray-400">{e.descripcion}</span>}
                </span>
                {e.codigo === value && <CheckIcon className="w-4 h-4 text-amber-600 shrink-0" />}
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}


const CARRERAS_DEFAULT = []  // se carga desde la BD
const MODALIDADES = [{ v: 'planta', l: 'POF' }, { v: 'guardia', l: 'POU' }]

const ESTADO_CONFIG = [
  { v: 'vigente',    l: 'Vigente',    cls: 'bg-green-100 text-green-700 border-green-200',    act: 'bg-green-600 text-white border-green-600'   },
  { v: 'no_vigente', l: 'No vigente', cls: 'bg-red-100 text-red-700 border-red-200',           act: 'bg-red-600 text-white border-red-600'       },
]
const SUBESTADO_CONFIG = [
  { v: 'activo',    l: 'Ocupado',   cls: 'bg-green-100 text-green-700 border-green-200',    act: 'bg-green-600 text-white border-green-600'   },
  { v: 'vacante',   l: 'Vacante',   cls: 'bg-amber-100 text-amber-700 border-amber-200',    act: 'bg-amber-500 text-white border-amber-500'   },
  { v: 'comision',  l: 'Comisión',  cls: 'bg-blue-100 text-blue-700 border-blue-200',       act: 'bg-blue-600 text-white border-blue-600'     },
  { v: 'retencion', l: 'Retención', cls: 'bg-orange-100 text-orange-700 border-orange-200', act: 'bg-orange-500 text-white border-orange-500' },
]

function FilterChip({ label, active, onClick, activeClass, inactiveClass }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? (activeClass  || 'bg-primary-600 text-white border-primary-600')
          : (inactiveClass || 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600')
      }`}>
      {label}
    </button>
  )
}

export default function ListaCargosPage() {
  const [rows,       setRows]       = useState([])
  const [total,      setTotal]      = useState(0)
  const [page,       setPage]       = useState(1)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [q,          setQ]          = useState('')
  const [carrera,    setCarrera]    = useState('')
  const [modalidad,  setModalidad]  = useState('')
  const [tipoCph,    setTipoCph]    = useState('')
  const [sigla,      setSigla]      = useState('')
  const [estado,     setEstado]     = useState('')
  const [categoria,  setCategoria]  = useState('')
  const [carreras,   setCarreras]   = useState([])
  const [siglas,     setSiglas]     = useState([])
  const [siglaModal, setSiglaModal] = useState(false)
  const [etiquetas,  setEtiquetas]  = useState([])
  const [catModal,   setCatModal]   = useState(false)
  const [exporting,  setExporting]  = useState(false)
  const [infoRow,    setInfoRow]    = useState(null)   // id del cargo para modal info
  const [editRow,    setEditRow]    = useState(null)   // objeto row para modal edición
  const debounceRef = useRef(null)
  const LIMIT = 10

  const filtersRef = useRef({ q, carrera, modalidad, tipoCph, sigla, estado, categoria })

  useEffect(() => {
    const prev = filtersRef.current
    const qChanged = prev.q !== q
    filtersRef.current = { q, carrera, modalidad, tipoCph, sigla, estado, categoria }
    clearTimeout(debounceRef.current)
    const delay = qChanged ? 350 : 0
    debounceRef.current = setTimeout(() => {
      setLoading(true); setError(null)
      const params = { page, limit: LIMIT }
      if (q)        params.q         = q
      if (carrera)  params.carrera   = carrera
      if (modalidad) params.modalidad = modalidad
      if (tipoCph)  params.tipoCph   = tipoCph
      if (sigla)    params.sigla     = sigla
      if (estado)   params.estado    = estado
      if (categoria) params.categoria = categoria
      altaCargoApi.listNewCargo(params)
        .then(data => { setRows(data.rows); setTotal(data.total) })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }, delay)
    return () => clearTimeout(debounceRef.current)
  }, [page, q, carrera, modalidad, tipoCph, sigla, estado, categoria])

  useEffect(() => {
    altaCargoApi.listCarreras().then(data => setCarreras(data.map(c => c.codigo))).catch(() => {})
    altaCargoApi.listSiglas().then(data => setSiglas(data.map(s => s.sigla))).catch(() => {})
    altaCargoApi.listEtiquetas().then(data => setEtiquetas(data)).catch(() => {})
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  function toggleCarrera(c)   { setPage(1); setCarrera(p  => p === c ? '' : c); setTipoCph('') }
  function toggleModalidad(m) { setPage(1); setModalidad(p => p === m ? '' : m) }
  function toggleTipoCph(t)   { setPage(1); setTipoCph(p  => p === t ? '' : t) }
  function toggleEstado(e)    { setPage(1); setEstado(p   => p === e ? '' : e) }

  async function handleExport() {
    setExporting(true)
    try {
      const params = {}
      if (q)        params.q         = q
      if (carrera)  params.carrera   = carrera
      if (modalidad) params.modalidad = modalidad
      if (tipoCph)  params.tipoCph   = tipoCph
      if (sigla)    params.sigla     = sigla
      if (estado)   params.estado    = estado
      const data = await altaCargoApi.exportNewCargo(params)
      const ECOLS = [
        { label: 'ID SIAL',        w: 12, get: r => r.id_sial },
        { label: 'Código',         w: 16, get: r => r.codigo },
        { label: 'Tipo CPH',       w: 10, get: r => /^CPH-D-/.test(r.codigo) ? 'Director' : /^CPH-J-/.test(r.codigo) ? 'Jefe' : r.carrera === 'CPH' ? 'Común' : '' },
        { label: 'Sigla',          w: 10, get: r => r.sigla },
        { label: 'Carrera',        w:  8, get: r => r.carrera },
        { label: 'Modalidad',      w: 10, get: r => r.modalidad },
        { label: 'Nivel form.',    w: 16, get: r => r.nivel_formacion },
        { label: 'Especialidad',   w: 30, get: r => r.especialidad },
        { label: 'Estado',         w: 12, get: r => r.estado },
        { label: 'Sit. revista',    w: 20, get: r => r.situacion_revista ? SR_LABELS[r.situacion_revista] || r.situacion_revista : '' },
        { label: 'Antigüedad',     w: 14, get: r => r.antiguedad_calc },
        { label: 'Cargo desde',    w: 14, get: r => fmtDate(r.cargo_desde) },
        { label: 'Cargo hasta',    w: 14, get: r => fmtDate(r.cargo_hasta) },
        { label: 'Actualización',  w: 14, get: r => fmtDate(r.fecha_actualizacion) },
      ]
      const ws = XLSX.utils.aoa_to_sheet([ECOLS.map(c => c.label), ...data.map(r => ECOLS.map(c => c.get(r) ?? ''))])
      ws['!cols'] = ECOLS.map(c => ({ wch: c.w }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cargos')
      const suffix = [carrera, modalidad, estado, sigla].filter(Boolean).join('-')
      XLSX.writeFile(wb, `cargos${suffix ? '-' + suffix : ''}.xlsx`)
    } catch (e) { console.error(e) }
    finally { setExporting(false) }
  }

  function handleSaved(updated) {
    setRows(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))
    setEditRow(null)
  }

  return (
    <div className="w-full space-y-3">

      {infoRow && <InfoModal cargoId={infoRow} onClose={() => setInfoRow(null)} />}
      {editRow && <EditModal row={editRow} onClose={() => setEditRow(null)} onSaved={handleSaved} />}

      {siglaModal && (
        <SiglaPickerModal siglas={siglas} value={sigla}
          onSelect={v => { setSigla(v); setPage(1) }}
          onClose={() => setSiglaModal(false)} />
      )}
      {catModal && (
        <CategoriaPickerModal etiquetas={etiquetas} value={categoria}
          onSelect={v => { setCategoria(v); setPage(1) }}
          onClose={() => setCatModal(false)} />
      )}

      {/* Filtros */}
      <div className="card p-3 space-y-2">

        {/* Búsqueda */}
        <input type="text" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Buscar por código, sigla, puesto, especialidad, expediente..."
          className="form-input text-sm w-full" />

        {/* Grilla de filtros */}
        <div className="grid grid-cols-1 gap-y-2 pt-1">

          {/* Fila 1: Carrera + Modalidad */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Carrera</span>
              {carreras.map(c => (
                <FilterChip key={c} label={c} active={carrera === c} onClick={() => toggleCarrera(c)} />
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Modalidad</span>
              {MODALIDADES.map(({ v, l }) => (
                <FilterChip key={v} label={l} active={modalidad === v} onClick={() => toggleModalidad(v)} />
              ))}
            </div>
          </div>

          {/* Fila 2: Tipo CPH (solo si carrera=CPH) */}
          {carrera === 'CPH' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Tipo</span>
              {[{v:'comun',l:'Común'},{v:'jefe',l:'Jefe'},{v:'director',l:'Director'},{v:'subdirector',l:'Subdirector'}].map(({v,l}) => (
                <FilterChip key={v} label={l} active={tipoCph === v} onClick={() => toggleTipoCph(v)} />
              ))}
            </div>
          )}

          {/* Fila 3: Estado */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Estado</span>
              {ESTADO_CONFIG.map(({ v, l, cls, act }) => (
                <FilterChip key={v} label={l} active={estado === v} onClick={() => toggleEstado(v)}
                  activeClass={act} inactiveClass={cls} />
              ))}
              <span className="text-[11px] text-gray-300 mx-1">|</span>
              {SUBESTADO_CONFIG.map(({ v, l, cls, act }) => (
                <FilterChip key={v} label={l} active={estado === v} onClick={() => toggleEstado(v)}
                  activeClass={act} inactiveClass={cls} />
              ))}
            </div>
          </div>

          {/* Fila 4: Ubicación + Categoría */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Ubicación</span>
              <button onClick={() => setSiglaModal(true)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  sigla
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-400 hover:text-primary-600'
                }`}>
                {sigla || 'Seleccionar...'}
              </button>
              {sigla && (
                <button onClick={() => { setSigla(''); setPage(1) }} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Categoría</span>
              <button onClick={() => setCatModal(true)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  categoria
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                }`}>
                {categoria || 'Seleccionar...'}
              </button>
              {categoria && (
                <button onClick={() => { setCategoria(''); setPage(1) }} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Resumen de filtros activos */}
        {(carrera || modalidad || estado || sigla || categoria || q) && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
            <span className="text-[11px] text-gray-400">Filtros activos:</span>
            {carrera   && <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-[11px] font-medium">{carrera}</span>}
            {modalidad && <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-[11px] font-medium capitalize">{modalidad}</span>}
            {estado    && <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-[11px] font-medium">{[...ESTADO_CONFIG,...SUBESTADO_CONFIG].find(e => e.v === estado)?.l || estado}</span>}
            {sigla     && <span className="px-2 py-0.5 rounded bg-primary-50 text-primary-700 text-[11px] font-medium">{sigla}</span>}
            {categoria && <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[11px] font-medium">{categoria}</span>}
            {q         && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px] font-medium truncate max-w-[160px]">"{q}"</span>}
            <button
              onClick={() => { setCarrera(''); setModalidad(''); setTipoCph(''); setEstado(''); setSigla(''); setCategoria(''); setQ(''); setPage(1) }}
              className="ml-auto text-[11px] text-red-500 hover:text-red-700 flex items-center gap-0.5">
              <XMarkIcon className="w-3 h-3" /> Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Contador + acciones */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{loading ? 'Cargando...' : `${total.toLocaleString('es-AR')} cargo${total !== 1 ? 's' : ''}`}</span>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} disabled={exporting || total === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {COLS.map(c => (
                  <th key={c.key} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr><td colSpan={COLS.length + 1} className="px-4 py-12 text-center text-gray-400">Sin resultados</td></tr>
              ) : rows.map((row, i) => (
                <tr key={row.id} className={`border-b border-gray-50 ${i % 2 ? 'bg-gray-50/50' : ''} hover:bg-primary-50/30 transition-colors`}>
                  {COLS.map(c => (
                    <td key={c.key} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      <CellValue val={row[c.key]} col={c} row={row} />
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <button onClick={() => setInfoRow(row.id)} title="Ver expediente"
                          className="p-1 rounded text-blue-500 hover:bg-blue-50 transition-colors">
                          <InformationCircleIcon className="w-4 h-4" />
                        </button>
                        {row.categoria_interna && (
                          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center px-1 min-w-[1.1rem] h-[1.1rem] rounded-full bg-amber-400 text-white text-[9px] font-bold leading-none">
                            {row.categoria_interna}
                          </span>
                        )}
                      </div>
                      <button onClick={() => setEditRow(row)} title="Editar cargo"
                        className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors">
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = []
  const add = n => { if (n >= 1 && n <= totalPages && !pages.includes(n)) pages.push(n) }
  add(1); add(2)
  for (let i = page - 2; i <= page + 2; i++) add(i)
  add(totalPages - 1); add(totalPages)
  pages.sort((a, b) => a - b)
  const items = []
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) items.push('...')
    items.push(pages[i])
  }
  return (
    <div className="flex items-center gap-1">
      <PgBtn onClick={() => onChange(page - 1)} disabled={page === 1}>‹</PgBtn>
      {items.map((item, i) =>
        item === '...'
          ? <span key={`e${i}`} className="px-1 text-gray-400 text-sm">…</span>
          : <PgBtn key={item} onClick={() => onChange(item)} active={item === page}>{item}</PgBtn>
      )}
      <PgBtn onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</PgBtn>
    </div>
  )
}

function PgBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`min-w-[2rem] h-8 px-2 rounded text-sm font-medium transition-colors ${
        active ? 'bg-primary-600 text-white' : disabled ? 'text-gray-300 cursor-default' : 'text-gray-600 hover:bg-gray-100'
      }`}>
      {children}
    </button>
  )
}
