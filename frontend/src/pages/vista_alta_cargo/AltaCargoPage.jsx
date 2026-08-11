import { useState, useEffect, useRef } from 'react'
import { altaCargoApi } from '../../api/altaCargoApi'
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

// --- PickerModal ---
function PickerModal({ title, options, value, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const filtered = q.trim()
    ? options.filter(o => (typeof o === 'string' ? o : o.label).toLowerCase().includes(q.toLowerCase()))
    : options

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col" style={{ maxHeight: '80vh' }} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar..." className="form-input text-sm w-full pl-9" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">Sin resultados</p>
          ) : filtered.map(opt => {
            const key = typeof opt === 'string' ? opt : opt.value
            const sel = key === value
            return (
              <button key={key} type="button"
                onClick={() => { onSelect(key); onClose() }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  sel ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}>
                <span>{typeof opt === 'string' ? opt : opt.label}</span>
                {sel && <CheckIcon className="w-4 h-4 text-primary-600 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --- PickerField ---
function PickerField({ label, value, disabled, onOpen, onClear }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>}
      <div className="relative">
        <button type="button" onClick={onOpen} disabled={disabled}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
            disabled
              ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-default'
              : value
                ? 'border-primary-300 bg-primary-50 text-gray-900 hover:border-primary-400'
                : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
          }`}>
          <span className={value ? 'text-gray-900 font-medium truncate' : ''}>{value || (disabled ? '—' : 'Seleccionar...')}</span>
          {!disabled && <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-2" />}
        </button>
        {value && !disabled && (
          <button type="button" onClick={e => { e.stopPropagation(); onClear() }}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-400 transition-colors">
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// --- ButtonGroup ---
function ButtonGroup({ label, options, value, onChange, disabled }) {
  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>}
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value
          const lbl = typeof opt === 'string' ? opt : opt.label
          const sel = val === value
          return (
            <button key={val} type="button" disabled={disabled}
              onClick={() => onChange(sel ? '' : val)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                disabled
                  ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-default'
                  : sel
                    ? 'border-primary-500 bg-primary-600 text-white shadow-sm'
                    : 'border-gray-200 text-gray-600 bg-white hover:border-primary-300 hover:text-primary-600'
              }`}>
              {sel && <CheckIcon className="w-3.5 h-3.5" />}
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// --- EtiquetaPicker ---
function EtiquetaPicker({ value, onChange }) {
  const [open,      setOpen]      = useState(false)
  const [q,         setQ]         = useState('')
  const [etiquetas, setEtiquetas] = useState([])
  const [creating,  setCreating]  = useState(false)
  const [newCodigo, setNewCodigo] = useState('')
  const [newDesc,   setNewDesc]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      altaCargoApi.listEtiquetas().then(setEtiquetas).catch(() => {})
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = q.trim()
    ? etiquetas.filter(e => e.codigo.toLowerCase().includes(q.toLowerCase()) || (e.descripcion || '').toLowerCase().includes(q.toLowerCase()))
    : etiquetas

  const handleCreate = async () => {
    const cod = newCodigo.trim().toUpperCase()
    if (!cod) return
    setSaving(true); setErr(null)
    try {
      const created = await altaCargoApi.createEtiqueta({ codigo: cod, descripcion: newDesc.trim() || null })
      setEtiquetas(prev => [...prev, created].sort((a, b) => a.codigo.localeCompare(b.codigo)))
      onChange(created.codigo)
      setOpen(false); setCreating(false); setNewCodigo(''); setNewDesc('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="relative">
        <button type="button" onClick={() => setOpen(true)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
            value
              ? 'border-amber-300 bg-amber-50 text-gray-900 hover:border-amber-400'
              : 'border-gray-300 bg-white text-gray-400 hover:border-gray-400'
          }`}>
          {value
            ? <span className="font-bold text-amber-700">{value}</span>
            : <span>Sin etiqueta</span>}
          <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-2" />
        </button>
        {value && (
          <button type="button"
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-400 transition-colors">
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={() => { setOpen(false); setCreating(false); setQ('') }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col" style={{ maxHeight: '75vh' }} onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-800">Etiqueta interna</span>
              <button type="button" onClick={() => { setOpen(false); setCreating(false); setQ('') }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            {!creating ? (
              <>
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input ref={inputRef} type="text" value={q} onChange={e => setQ(e.target.value)}
                      placeholder="Buscar etiqueta..." className="form-input text-sm w-full pl-9" />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 py-1">
                  {value && (
                    <button onClick={() => { onChange(''); setOpen(false) }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 border-b border-gray-50">
                      <XMarkIcon className="w-3.5 h-3.5 mr-2" /> Quitar etiqueta
                    </button>
                  )}
                  {filtered.length === 0 && (
                    <p className="px-4 py-6 text-xs text-gray-400 text-center">No hay etiquetas{q ? ' que coincidan' : ''}.</p>
                  )}
                  {filtered.map(et => (
                    <button key={et.id} type="button"
                      onClick={() => { onChange(et.codigo); setOpen(false); setQ('') }}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        et.codigo === value ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                      }`}>
                      <div className="text-left">
                        <span className="font-bold">{et.codigo}</span>
                        {et.descripcion && <span className="text-xs text-gray-400 ml-2">{et.descripcion}</span>}
                      </div>
                      {et.codigo === value && <CheckIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <button type="button" onClick={() => { setCreating(true); setNewCodigo(q.toUpperCase()); setNewDesc('') }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
                    + Nueva etiqueta
                  </button>
                </div>
              </>
            ) : (
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Codigo <span className="text-red-400">*</span></label>
                  <input type="text" value={newCodigo}
                    onChange={e => setNewCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej: BA" maxLength={50}
                    className="form-input text-sm w-full font-bold" autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Descripcion <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <input type="text" value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Ej: Bloque de ampliacion"
                    maxLength={200}
                    className="form-input text-sm w-full" />
                </div>
                {err && <p className="text-xs text-red-500">{err}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => { setCreating(false); setErr(null) }}
                    className="flex-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleCreate} disabled={saving || !newCodigo.trim()}
                    className="flex-1 px-3 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                    {saving ? 'Creando...' : 'Crear y usar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// --- Constantes ---
// (carreras y jornadas se cargan desde BD)

const EMPTY_FORM = {
  sigla: '', carrera_seleccionada: '', modalidad: '',
  puesto: '', puesto_es_medico: 0, especialidad: '', cargo_desde: '', cantidad: 1,
  categoria_interna: '', jornada: '',
  nro_resolucion: '', documento_origen: '',
  tipo_cargo_estructura: '', tipo_eg: '', tipo_tec: '',
}

function isComplete(form, modo) {
  const { sigla, carrera_seleccionada: c, modalidad, puesto, especialidad, cargo_desde } = form
  if (!sigla || !c || !cargo_desde) return false
  if (c === 'cph') {
    if (modo === 'estructura') {
      const tipo = form.tipo_cargo_estructura
      if (!tipo) return false
      if (tipo === 'jefe') return !!modalidad && !!puesto && !!especialidad
      return true // director / subdirector no requieren modalidad/puesto/esp
    }
    return !!modalidad && !!puesto && !!especialidad
  }
  if (c === 'eg') {
    if (modo === 'estructura') return !!form.tipo_eg
    return true
  }
  if (c === 'enf') return !!form.jornada
  if (c === 'tec') return !!modalidad && !!puesto && !!form.tipo_tec
  return true
}

function buildPayload(form, documento, tipo_alta, modo, norma_referencia) {
  const {
    sigla, carrera_seleccionada, modalidad, puesto, especialidad,
    cargo_desde, cantidad, categoria_interna, jornada, nro_resolucion, documento_origen,
    tipo_cargo_estructura, tipo_eg, tipo_tec,
  } = form
  const base = {
    cargo_desde, cargo_hasta: null, antiguedad: cargo_desde,
    documento, tipo_alta,
    cantidad: Number(cantidad),
    categoria_interna:  categoria_interna  || null,
    norma_referencia:   norma_referencia   || null,
    nro_resolucion:     nro_resolucion     || null,
    documento_origen:   documento_origen   || null,
  }
  if (carrera_seleccionada === 'cph') {
    const tipo_cph = modo === 'estructura' ? tipo_cargo_estructura : 'ejecucion'
    // jefe estructura necesita modalidad/puesto/esp; director/subdirector no
    const extra = (modo === 'estructura' && tipo_cph !== 'jefe')
      ? {}
      : { modalidad, puesto, especialidad }
    return { sigla, carrera_seleccionada, tipo_cph, ...extra, ...base }
  }
  if (carrera_seleccionada === 'eg') {
    const tipo_eg_val = modo === 'estructura' ? tipo_eg : 'ejecucion'
    return { sigla, carrera_seleccionada, tipo_eg: tipo_eg_val, ...base }
  }
  if (carrera_seleccionada === 'as') return { sigla, carrera_seleccionada, ...base }
  if (carrera_seleccionada === 'rg') return { sigla, carrera_seleccionada, ...base }
  if (carrera_seleccionada === 'enf') return { sigla, carrera_seleccionada, jornada: jornada || null, ...base }
  if (carrera_seleccionada === 'tec') return { sigla, carrera_seleccionada, tipo_tec, modalidad, puesto, especialidad, ...base }
  return { sigla, carrera_seleccionada, ...base }
}

export default function AltaCargoPage({ embedded = false, modo = 'ejecucion' }) {
  const wrap = embedded ? '' : 'px-6 py-8'

  const [expediente,     setExpediente]     = useState('')
  const [expInput,       setExpInput]       = useState('')
  const [expConfirmado,  setExpConfirmado]  = useState(false)
  const [form,           setForm]           = useState(EMPTY_FORM)
  const [cargos,         setCargos]         = useState([])
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState(null)
  const [results,        setResults]        = useState([])
  const [carreras,       setCarreras]       = useState([])
  const [siglas,         setSiglas]         = useState([])
  const [espMedico,      setEspMedico]      = useState([])
  const [espNoMedico,    setEspNoMedico]    = useState([])
  const [espTec,         setEspTec]         = useState([])
  const [modalidades,    setModalidades]    = useState([])
  const [jornadas,       setJornadas]       = useState([])
  const [tiposCargo,     setTiposCargo]     = useState([])
  const [puestos,        setPuestos]        = useState([])
  const [picker,         setPicker]         = useState(null)

  useEffect(() => {
    altaCargoApi.listCarreras().then(setCarreras).catch(() => {})
    altaCargoApi.listSiglas().then(setSiglas).catch(() => {})
    altaCargoApi.listModalidades().then(setModalidades).catch(() => {})
    altaCargoApi.listJornadas().then(setJornadas).catch(() => {})
    altaCargoApi.listEspecialidades('medico').then(rows => setEspMedico(rows.map(r => r.nombre))).catch(() => {})
    altaCargoApi.listEspecialidades('no_medico').then(rows => setEspNoMedico(rows.map(r => r.nombre))).catch(() => {})
    altaCargoApi.listEspecialidades(null, 'TEC').then(rows => setEspTec(rows.map(r => r.nombre))).catch(() => {})
  }, [])

  // Cargar tipos de cargo cuando cambia la carrera en modo estructura
  useEffect(() => {
    if (modo !== 'estructura' || !form.carrera_seleccionada) { setTiposCargo([]); return }
    altaCargoApi.listTiposCargo(form.carrera_seleccionada.toUpperCase()).then(setTiposCargo).catch(() => {})
  }, [form.carrera_seleccionada, modo])

  // Cargar puestos cuando cambia carrera o modalidad
  useEffect(() => {
    const c = form.carrera_seleccionada
    const m = form.modalidad
    if (!c || (c !== 'cph' && c !== 'tec')) { setPuestos([]); return }
    const tipo = c === 'cph' ? (m ? m.toLowerCase() : null) : null
    altaCargoApi.listPuestos(c, tipo, modo).then(setPuestos).catch(() => {})
  }, [form.carrera_seleccionada, form.modalidad, form.tipo_cargo_estructura])

  const tipo_alta = modo === 'estructura' ? 'estructura' : 'ejecucion'

  const confirmarExpediente = () => {
    const v = expInput.trim()
    if (!v) return
    setExpediente(v)
    setExpConfirmado(true)
    setForm(EMPTY_FORM)
    setCargos([])
    setResults([])
    setError(null)
  }

  const editarExpediente = () => {
    setExpConfirmado(false)
    setExpInput(expediente)
    setForm(EMPTY_FORM)
    setCargos([])
    setResults([])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const norma = carreras.find(cr => cr.codigo.toLowerCase() === form.carrera_seleccionada)?.norma_referencia ?? null
    setCargos(prev => [...prev, buildPayload(form, expediente, tipo_alta, modo, norma)])
    setForm(EMPTY_FORM)
    setError(null)
  }

  const handleRegistrarTodos = async () => {
    setSaving(true); setError(null)
    try {
      const res = []
      for (const payload of cargos) {
        const r = await altaCargoApi.create(payload)
        res.push({ payload, codigos: r.codigos })
      }
      setResults(res)
      setCargos([])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const c     = form.carrera_seleccionada
  const esCph = c === 'cph'
  const esEnf = c === 'enf'
  const esTec = c === 'tec'
  const esEg  = c === 'eg'

  // Modalidad aplica según requiere_modalidad del tipo seleccionado (estructura) o siempre para ejecución CPH/TEC
  const tipoCphObj = tiposCargo.find(t => t.codigo === form.tipo_cargo_estructura)
  const mostrarModalidad = (esCph && (modo !== 'estructura' || tipoCphObj?.requiere_modalidad)) || esTec

  // Especialidades segun si el puesto seleccionado es medico o no
  const espOptions = esCph
    ? (form.puesto_es_medico ? espMedico : espNoMedico)
    : esTec ? espTec : []

  const puestosOptions = puestos.map(p => p.nombre)

  const carreraOpts = carreras
    .filter(cr => modo === 'estructura' ? cr.solo_estructura : !cr.excluir_alta)
    .map(cr => ({ value: cr.codigo.toLowerCase(), label: cr.nombre }))

  return (
    <div className={wrap}>

      {/* Modales */}
      {picker === 'sigla' && (
        <PickerModal title="Seleccionar Sigla"
          options={siglas.map(s => s.sigla)} value={form.sigla}
          onSelect={v => setForm({ ...EMPTY_FORM, sigla: v })}
          onClose={() => setPicker(null)} />
      )}
      {picker === 'puesto' && (
        <PickerModal title="Seleccionar Puesto"
          options={puestosOptions} value={form.puesto}
          onSelect={v => {
            const found = puestos.find(p => p.nombre === v)
            setForm(p => ({ ...p, puesto: v, puesto_es_medico: found?.es_medico ?? 0, especialidad: '' }))
          }}
          onClose={() => setPicker(null)} />
      )}
      {picker === 'especialidad' && (
        <PickerModal title="Seleccionar Especialidad"
          options={espOptions} value={form.especialidad}
          onSelect={v => setForm(p => ({ ...p, especialidad: v }))}
          onClose={() => setPicker(null)} />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{modo === 'estructura' ? 'Cargo por Estructura' : 'Cargo por Ejecucion'}</h1>

        {!expConfirmado ? (
          <div className="flex items-end gap-3 p-4 rounded-xl border-2 border-primary-200 bg-primary-50">
            <div className="flex-1">
              <label className="block text-xs font-bold text-primary-700 mb-1.5 uppercase tracking-wider">
                {modo === 'estructura' ? 'Decreto' : 'Expediente'} <span className="text-red-400">*</span>
              </label>
              <input type="text" value={expInput}
                onChange={e => setExpInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmarExpediente()}
                placeholder={modo === 'estructura' ? 'Ej: 541/MSGC/26' : 'Ej: EX-2026-32260736-GCABA-DGAYDRH'}
                className="form-input text-sm w-full" autoFocus />
            </div>
            <button type="button" onClick={confirmarExpediente}
              disabled={!expInput.trim()}
              className="btn-primary px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
              Confirmar
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-xl border border-green-200 bg-green-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckIcon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wider">{modo === 'estructura' ? 'Decreto confirmado' : 'Expediente confirmado'}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{expediente}</p>
              </div>
            </div>
            <button type="button" onClick={editarExpediente}
              className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
              Editar
            </button>
          </div>
        )}
      </div>

      {/* Layout 2 columnas */}
      <div className="flex gap-6 items-start">

        {/* Columna izquierda */}
        <div className={`flex-1 min-w-0 transition-opacity ${expConfirmado ? '' : 'opacity-40 pointer-events-none select-none'}`}>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Fila 1 — Sigla + Carrera */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '180px 1fr' }}>
              <PickerField
                label="Sigla"
                value={form.sigla}
                disabled={!expConfirmado}
                onOpen={() => setPicker('sigla')}
                onClear={() => setForm(EMPTY_FORM)} />
              <ButtonGroup
                label="Carrera"
                options={carreraOpts}
                value={form.carrera_seleccionada}
                disabled={!form.sigla}
                onChange={v => setForm(p => ({ ...p, carrera_seleccionada: v, modalidad: '', nivel_formacion: '', puesto: '', puesto_es_medico: 0, especialidad: '', jornada: '' }))} />
            </div>

            {/* Fila 2 — Detalle condicional */}
            {c && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-3">
                {modo === 'estructura' && esCph && (
                  <ButtonGroup
                    label="Tipo de cargo"
                    options={tiposCargo.map(t => ({ value: t.codigo, label: t.nombre }))}
                    value={form.tipo_cargo_estructura}
                    disabled={false}
                    onChange={v => setForm(p => ({ ...p, tipo_cargo_estructura: v, modalidad: '', puesto: '', puesto_es_medico: 0, especialidad: '' }))} />
                )}
                {modo === 'estructura' && esEg && (
                  <ButtonGroup
                    label="Tipo de cargo"
                    options={tiposCargo.map(t => ({ value: t.codigo, label: t.nombre }))}
                    value={form.tipo_eg}
                    disabled={false}
                    onChange={v => setForm(p => ({ ...p, tipo_eg: v }))} />
                )}
                {esTec && (
                  <ButtonGroup
                    label="Tipo TEC"
                    options={[
                      { value: 'pof', label: 'POF (Planta)' },
                      { value: 'pou', label: 'POU (Guardia)' },
                    ]}
                    value={form.tipo_tec}
                    disabled={false}
                    onChange={v => setForm(p => ({ ...p, tipo_tec: v }))} />
                )}
                {mostrarModalidad && (
                  <ButtonGroup
                    label="Modalidad"
                    options={modalidades.map(m => m.nombre)}
                    value={form.modalidad}
                    disabled={false}
                    onChange={v => setForm(p => ({ ...p, modalidad: v, puesto: '', puesto_es_medico: 0, especialidad: '' }))} />
                )}
                {esEnf && (
                  <ButtonGroup
                    label="Jornada"
                    options={jornadas.map(j => ({ value: j.nombre, label: j.nombre }))}
                    value={form.jornada}
                    disabled={false}
                    onChange={v => setForm(p => ({ ...p, jornada: v }))} />
                )}
                {mostrarModalidad && (
                  <div className="grid grid-cols-2 gap-3">
                    <PickerField label="Puesto" value={form.puesto}
                      disabled={!form.modalidad}
                      onOpen={() => setPicker('puesto')}
                      onClear={() => setForm(p => ({ ...p, puesto: '', puesto_es_medico: 0, especialidad: '' }))} />
                    {esCph && (
                      <PickerField label="Especialidad" value={form.especialidad}
                        disabled={!form.puesto}
                        onOpen={() => setPicker('especialidad')}
                        onClear={() => setForm(p => ({ ...p, especialidad: '' }))} />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fila 3 — Norma + Resolucion + Expediente origen */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Norma</label>
                <input type="text"
                  value={carreras.find(cr => cr.codigo.toLowerCase() === c)?.norma_referencia ?? ''}
                  readOnly
                  className="form-input text-sm w-full bg-gray-50 text-gray-400 cursor-default" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Nro. Resolucion</label>
                <input type="text" value={form.nro_resolucion}
                  onChange={e => setForm(p => ({ ...p, nro_resolucion: e.target.value }))}
                  placeholder="Ej: 541/MSGC/26"
                  className="form-input text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Documento origen</label>
                <input type="text" value={form.documento_origen}
                  onChange={e => setForm(p => ({ ...p, documento_origen: e.target.value }))}
                  placeholder="Ej: EX-2026-17549845"
                  className="form-input text-sm w-full" />
              </div>
            </div>

            {/* Fila 4 — Vigencia + boton */}
            <div className="grid grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Desde <span className="text-red-400">*</span></label>
                <input type="date" value={form.cargo_desde}
                  onChange={e => setForm(p => ({ ...p, cargo_desde: e.target.value }))}
                  className="form-input text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Cantidad</label>
                <div className="flex items-center gap-2">
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, cantidad: Math.max(1, p.cantidad - 1) }))}
                    className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold text-lg leading-none">−</button>
                  <span className="w-10 text-center text-sm font-semibold text-gray-800">{form.cantidad}</span>
                  <button type="button"
                    onClick={() => setForm(p => ({ ...p, cantidad: Math.min(50, p.cantidad + 1) }))}
                    className="w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold text-lg leading-none">+</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Etiqueta</label>
                <EtiquetaPicker
                  value={form.categoria_interna}
                  onChange={v => setForm(p => ({ ...p, categoria_interna: v }))} />
              </div>
              <div className="flex flex-col justify-end">
                {error && <p className="text-xs text-red-500 mb-1.5 truncate">{error}</p>}
                <button type="submit" className="btn-primary w-full" disabled={saving || !isComplete(form, modo)}>
                  + Agregar
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* Columna derecha — panel de cargos */}
        <div className="w-72 flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white sticky top-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{modo === 'estructura' ? 'Cargos del decreto' : 'Cargos del expediente'}</span>
              {cargos.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-bold">
                  {cargos.reduce((acc, c) => acc + c.cantidad, 0)}
                </span>
              )}
            </div>

            <div className="p-3 min-h-[120px]">
              {results.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200">
                    <CheckIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-700">
                        {results.reduce((acc, r) => acc + r.codigos.length, 0)} cargos registrados
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">{modo === 'estructura' ? 'Decreto' : 'Exp'}: {results[0]?.payload.documento}</p>
                    </div>
                  </div>
                  {results.map((r, i) => {
                    const p = r.payload
                    const carreraLabel = p.carrera_seleccionada.toUpperCase()
                    const detalle = p.puesto || p.nivel_formacion || '—'
                    return (
                      <div key={i} className="rounded-lg border border-gray-200 overflow-hidden">
                        <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded">{carreraLabel}</span>
                            <span className="text-xs font-semibold text-gray-700">{p.sigla}</span>
                            {p.modalidad && <span className="text-xs text-gray-500">{p.modalidad}</span>}
                            {p.jornada && <span className="text-xs text-gray-500">{p.jornada}</span>}
                            {p.categoria_interna && (
                              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{p.categoria_interna}</span>
                            )}
                          </div>
                          {detalle !== '—' && <p className="text-xs text-gray-600 font-medium mt-1 truncate">{detalle}</p>}
                          {p.especialidad && <p className="text-xs text-gray-400 truncate">{p.especialidad}</p>}
                          {p.norma_referencia && <p className="text-xs text-gray-400 mt-1">{p.norma_referencia}</p>}
                          {p.nro_resolucion && <p className="text-xs text-gray-400">Res: {p.nro_resolucion}</p>}
                          <p className="text-xs text-gray-400 mt-1">Desde: {p.cargo_desde}</p>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {r.codigos.map((cod, j) => (
                            <div key={cod} className="flex items-center justify-between px-3 py-2">
                              <span className="text-xs text-gray-400">#{j + 1}</span>
                              <span className="font-mono text-xs font-bold text-primary-700 tracking-wide">{cod}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  <button type="button" onClick={() => {
                    setResults([]); setForm(EMPTY_FORM)
                    setExpConfirmado(false); setExpInput('')
                    setExpediente('')
                  }} className="w-full text-xs text-gray-400 hover:text-gray-600 underline transition-colors pt-1">
                    Nuevo expediente
                  </button>
                </div>
              ) : cargos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Aun no hay cargos agregados</p>
              ) : (
                <div className="space-y-2">
                  {cargos.map((cargo, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-primary-700 uppercase">{cargo.carrera_seleccionada}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs font-medium text-gray-700">{cargo.sigla}</span>
                          {cargo.cantidad > 1 && (
                            <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded font-medium">
                              x{cargo.cantidad}
                            </span>
                          )}
                          {cargo.categoria_interna && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                              {cargo.categoria_interna}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {cargo.puesto || cargo.nivel_formacion || '—'}
                        </p>
                        {cargo.jornada && <p className="text-xs text-gray-400 mt-0.5">{cargo.jornada}</p>}
                        {cargo.especialidad && <p className="text-xs text-gray-400 mt-0.5 truncate">{cargo.especialidad}</p>}
                        {cargo.modalidad && <p className="text-xs text-gray-400 mt-0.5">{cargo.modalidad}</p>}
                        {cargo.nro_resolucion && <p className="text-xs text-gray-400 mt-0.5">Res: {cargo.nro_resolucion}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">Desde: {cargo.cargo_desde}</p>
                      </div>
                      <button type="button"
                        onClick={() => setCargos(prev => prev.filter((_, idx) => idx !== i))}
                        className="p-0.5 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {results.length === 0 && (
              <div className="px-3 pb-3">
                <button type="button" onClick={handleRegistrarTodos}
                  disabled={cargos.length === 0 || saving}
                  className="w-full btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
                  {saving ? 'Registrando...' : `Registrar ${cargos.length > 0 ? `(${cargos.reduce((a, c) => a + c.cantidad, 0)})` : 'todos'}`}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
