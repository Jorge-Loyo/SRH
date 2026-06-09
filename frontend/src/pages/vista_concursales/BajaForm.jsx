import { useState, useRef, useEffect, createContext, useContext } from 'react'
import { XMarkIcon, InformationCircleIcon, ChevronDownIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { bajasApi } from '../../api/concursalesApi'
import { exportBajaToPdf, exportBajaToWord } from '../../utils/exportReport'
import {
  OPCIONES_USUARIOS,
  OPCIONES_ESCALAFON_BAJAS,
  OPCIONES_ESCALAFON_SEGUIMIENTO,
  OPCIONES_UNIFICADOR_PUESTOS,
  OPCIONES_MOTIVO_BAJA,
  OPCIONES_TIPO_EFECTOR,
  OPCIONES_ORIGEN,
  SIGLAS_DATA,
  getPuestoOptions,
  getEspecialidadOptions,
  isoToDmy,
  dmyToIso,
} from '../../utils/concursalesHelpers'

/**
 * BajaForm - Modal para crear o editar una Baja Consolidada.
 * Props:
 *   initial   {object|null}  null = crear, objeto = editar
 *   onSaved   {Function}     Callback tras guardar exitosamente
 *   onClose   {Function}     Callback para cerrar el modal
 */
const OrigenContext = createContext('')

function getOrigenBgStyle(origen, hasValue = false) {
  if (origen === 'Alta por Baja')      return { backgroundColor: '#dbeafe' }
  if (origen === 'Ampliación')         return { backgroundColor: '#bbf7d0' }
  if (origen === 'Cobertura Dotación') return { backgroundColor: '#fee2e2' }
  if (origen === 'POU a POF')          return { backgroundColor: '#ede9fe' }
  if (hasValue)                        return { backgroundColor: '#f0fdf4' }
  return {}
}

export default function BajaForm({ initial, onSaved, onClose, readOnly = false }) {
  const isEdit = !!initial

  const OPCIONES_CODIGO = ['37', '87', '85', '83']

  const [form, setForm] = useState({
    usuario:               initial?.usuario               ?? '',
    origen:                initial?.origen                ?? '',
    ex_baja:               initial?.ex_baja               ?? '',
    sigla:                 initial?.sigla                 ?? '',
    efector:               initial?.efector               ?? '',
    tipo_efector:          initial?.tipo_efector           ?? '',
    codigo_cargo:          initial?.codigo_cargo           ?? '',
    cuil:                  initial?.cuil                  ?? '',
    nombre_apellido:       initial?.nombre_apellido        ?? '',
    codigo_registro:       initial?.codigo_registro ?? '37',
    unificador_puestos:    initial?.unificador_puestos     ?? '',
    escalafon:             initial?.escalafon             ?? '',
    pou_pof:               initial?.pou_pof               ?? '',
    puesto_baja:           initial?.puesto_baja            ?? '',
    especialidad_baja:     initial?.especialidad_baja      ?? '',
    partida_presupuestaria:initial?.partida_presupuestaria ?? '',
    fecha_baja:            isoToDmy(initial?.fecha_baja)  ?? '',
    carga_horaria:         initial?.carga_horaria          ?? '',
    motivo_baja:           initial?.motivo_baja            ?? '',
    doc_respaldatoria:     initial?.doc_respaldatoria      ?? '',
    fecha_pase_paralelo:   isoToDmy(initial?.fecha_pase_paralelo) ?? '',
    genera_concurso:       initial?.genera_concurso        ?? '',
    cargo_baja:            initial?.cargo_baja             ?? '',
    obra:                  initial?.obra                   ?? false,
  })

  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)
  const [confirmModal, setConfirmModal] = useState(null)

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const setBool = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleOrigenChange = (e) => {
    const origen = e.target.value
    setForm(prev => ({
      ...prev,
      origen,
      ...(origen === 'Ampliación' && {
        nombre_apellido:        '',
        cuil:                   '',
        cargo_baja:             '',
        partida_presupuestaria: '',
        pou_pof:                'POF',
      }),
      ...(origen === 'Cobertura Dotación' && {
        nombre_apellido:        '',
        cuil:                   '',
        cargo_baja:             '',
        partida_presupuestaria: '',
        pou_pof:                'POU',
      }),
    }))
  }

  const handleSiglaChange = (e) => {
    const sigla = e.target.value
    const found = SIGLAS_DATA.find(s => s.sigla === sigla)
    setForm(prev => ({
      ...prev,
      sigla,
      efector:      found ? found.descr : prev.efector,
      tipo_efector: found ? found.tipo  : prev.tipo_efector,
    }))
  }

  // ── Cascade: Unificador → Escalafón → POU/POF → Puesto → Especialidad ──────
  const handleUnificadorChange = (e) => {
    const unificador = e.target.value
    // Si el origen ya fuerza un valor en POU/POF, respetarlo; sino, auto-setear
    const origenLockedPouPof =
      form.origen === 'Ampliación'         ? 'POF' :
      form.origen === 'Cobertura Dotación' ? 'POU' :
      null
    const autoPouPof =
      origenLockedPouPof !== null      ? origenLockedPouPof :
      unificador === 'CPH de Guardia'  ? 'POU' :
      unificador === 'CPH de Planta'   ? 'POF' :
      ''
    setForm(prev => ({
      ...prev,
      unificador_puestos: unificador,
      escalafon:          '',
      pou_pof:            autoPouPof,
      puesto_baja:        '',
      especialidad_baja:  '',
    }))
  }

  const handleEscalafonBajaChange = (e) => {
    setForm(prev => ({
      ...prev,
      escalafon:         e.target.value,
      puesto_baja:       '',
      especialidad_baja: '',
    }))
  }

  const handlePouPofChange = (e) => {
    setForm(prev => ({
      ...prev,
      pou_pof:           e.target.value,
      puesto_baja:       '',
      especialidad_baja: '',
    }))
  }

  const handlePuestoBajaChange = (e) => {
    setForm(prev => ({
      ...prev,
      puesto_baja:       e.target.value,
      especialidad_baja: '',
    }))
  }

  const codigoNum = Number(form.codigo_registro)
  const esCeetps  = [87, 85, 83].includes(codigoNum)

  const previewEsCph = (() => {
    if (esCeetps) return false
    if (!form.genera_concurso || form.genera_concurso.toUpperCase() !== 'SI') return false
    const p = (form.puesto_baja || '').toUpperCase()
    return !p.includes('TECNICO') && !p.includes('ENFERMERIA')
  })()

  const ceetpsLabel = { 87: 'Enfermeros', 85: 'Técnicos', 83: 'Administrativos' }[codigoNum] ?? ''

  const origenFormClass = {
    'Alta por Baja':      'origen-alta-baja',
    'Ampliación':         'origen-ampliacion',
    'Cobertura Dotación': 'origen-cobertura',
    'POU a POF':          'origen-pou-a-pof',
  }[form.origen] ?? ''

  const origenBorderColor = {
    'Alta por Baja':      'border-blue-400',
    'Ampliación':         'border-green-400',
    'Cobertura Dotación': 'border-red-500',
    'POU a POF':          'border-violet-400',
  }[form.origen] ?? ''

  const CAMPOS_VALIDACION = [
    { key: 'usuario',                label: 'Usuario' },
    { key: 'ex_baja',                label: 'EX Baja / Ampliación' },
    { key: 'sigla',                  label: 'Sigla' },
    { key: 'efector',                label: 'Efector (descripción)' },
    { key: 'tipo_efector',           label: 'Tipo de efector' },
    { key: 'codigo_cargo',           label: 'Código cargo' },
    { key: 'cuil',                   label: 'CUIL' },
    { key: 'nombre_apellido',        label: 'Nombre y Apellido' },
    { key: 'unificador_puestos',     label: 'Unificador de puestos' },
    { key: 'escalafon',              label: 'Escalafón' },
    { key: 'pou_pof',                label: 'POU/POF' },
    { key: 'puesto_baja',            label: 'Puesto baja' },
    { key: 'especialidad_baja',      label: 'Especialidad baja' },
    { key: 'partida_presupuestaria', label: 'Partida presupuestaria' },
    { key: 'fecha_baja',             label: 'Fecha de baja' },
    { key: 'carga_horaria',          label: 'Carga horaria' },
    { key: 'motivo_baja',            label: 'Motivo de baja' },
    { key: 'doc_respaldatoria',      label: 'Doc. respaldatoria' },
    { key: 'fecha_pase_paralelo',    label: 'Fecha pase paralelo/GT' },
    { key: 'cargo_baja',             label: 'ID SIAL' },
    { key: 'genera_concurso',        label: 'Genera concurso' },
  ]

  const buildPayload = () => {
    const payload = {}
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'boolean') {
        payload[k] = v
      } else if (v === '') {
        payload[k] = null
      } else if (k === 'fecha_baja' || k === 'fecha_pase_paralelo') {
        payload[k] = dmyToIso(v)
      } else {
        payload[k] = v
      }
    }
    if (payload.codigo_registro) {
      payload.codigo_registro = parseInt(payload.codigo_registro, 10) || null
    }
    return payload
  }

  const doSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = buildPayload()
      if (isEdit) {
        await bajasApi.update(initial.id, payload)
      } else {
        await bajasApi.create(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const emptyFields = CAMPOS_VALIDACION
      .filter(({ key }) => !form[key])
      .map(({ label }) => label)

    if (emptyFields.length > 0) {
      setConfirmModal({ emptyFields })
      return
    }
    await doSave()
  }

  if (readOnly) return <PipelineViewBaja initial={initial} onClose={onClose} />

  return (
    <OrigenContext.Provider value={form.origen}>
    <>
    {/* Modal de confirmación: campos vacíos */}
    {confirmModal && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Campos sin completar</h3>
          <p className="text-sm text-gray-600 mb-3">
            Los siguientes campos están vacíos. ¿Desea guardar de todas formas?
          </p>
          <ul className="mb-4 max-h-48 overflow-y-auto space-y-1">
            {confirmModal.emptyFields.map(label => (
              <li key={label} className="flex items-center gap-2 text-sm text-amber-700">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                {label}
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmModal(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Volver a revisar
            </button>
            <button
              type="button"
              onClick={async () => { setConfirmModal(null); await doSave() }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700"
            >
              Guardar igual
            </button>
          </div>
        </div>
      </div>
    )}
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8${origenBorderColor ? ` border-t-4 ${origenBorderColor}` : ''}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Editar baja' : 'Nueva baja consolidada'}
            </h2>
            {!isEdit && (
              <p className="text-xs text-gray-500 mt-0.5">
                Si genera concurso y no es Técnico/Enfermería, se creará el seguimiento CPH automáticamente.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEdit && <ExportDropdown onExport={fmt => fmt === 'pdf' ? exportBajaToPdf(form) : exportBajaToWord(form)} />}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`px-6 py-6 space-y-7 ${origenFormClass}`}>

          {/* 1 — Identificacion */}
          <Section title="Identificacion">
            <div className="grid grid-cols-4 gap-3">
              <SelectField label="Usuario" value={form.usuario} onChange={set('usuario')} options={OPCIONES_USUARIOS} cols={1} />
              <SelectField label="Origen"  value={form.origen}  onChange={handleOrigenChange} options={OPCIONES_ORIGEN} cols={1} />
              <ExBajaField value={form.ex_baja} onChange={set('ex_baja')} cols={4} />
            </div>
          </Section>

          {/* 2 — Efector */}
          <Section title="Efector">
            <div className="grid grid-cols-4 gap-3">
              <SiglaSearchField value={form.sigla} onChange={handleSiglaChange} />
              <Field       label="Efector"           value={form.efector}      onChange={set('efector')}       disabled={!!form.sigla}          cols={2} />
              <SelectField label="Tipo de efector"   value={form.tipo_efector} onChange={set('tipo_efector')}  options={OPCIONES_TIPO_EFECTOR}  cols={1} disabled={!!form.sigla} />
            </div>
          </Section>

          {/* 3 — Datos funcionales */}
          <Section title="Datos funcionales">
            <div className="grid grid-cols-4 gap-3">
              <Field        label="Codigo cargo"           value={form.codigo_cargo}           onChange={set('codigo_cargo')}           cols={1} />
              <Field        label="CUIL"                   value={form.cuil}                   onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setForm(prev => ({ ...prev, cuil: v })) }}  placeholder="20123456789" cols={1} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
              <Field        label="Nombre y Apellido"      value={form.nombre_apellido}         onChange={set('nombre_apellido')}        cols={2} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
              <SelectField  label="Código de registro"     value={String(form.codigo_registro ?? codigoDefault)} onChange={set('codigo_registro')} options={OPCIONES_CODIGO} cols={1} />
              <SelectField  label="Unificador de puestos"  value={form.unificador_puestos}     onChange={handleUnificadorChange}        options={OPCIONES_UNIFICADOR_PUESTOS} cols={1} />
              <SelectField  label="Escalafon"              value={form.escalafon}              onChange={handleEscalafonBajaChange}     options={OPCIONES_ESCALAFON_BAJAS}   cols={1} disabled={!form.unificador_puestos} />
              <SelectField  label="POU/POF"                value={form.pou_pof}                onChange={handlePouPofChange}             options={OPCIONES_ESCALAFON_SEGUIMIENTO} cols={1} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación' || form.unificador_puestos === 'CPH de Guardia' || form.unificador_puestos === 'CPH de Planta' || !form.escalafon} />
              <SelectField  label="Puesto baja"            value={form.puesto_baja}            onChange={handlePuestoBajaChange}        options={getPuestoOptions(form.unificador_puestos, form.escalafon)}    cols={1} disabled={!form.pou_pof} />
              <SelectField  label="Especialidad baja"      value={form.especialidad_baja}      onChange={set('especialidad_baja')}      options={getEspecialidadOptions(form.puesto_baja, form.escalafon)}    cols={1} disabled={!form.puesto_baja} />
              <Field        label="Partida presupuestaria" value={form.partida_presupuestaria} onChange={set('partida_presupuestaria')} cols={1} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
              <div className="col-span-1" />
            </div>
          </Section>

          {/* 4 — Fechas y expediente */}
          <Section title="Fechas y expediente">
            <div className="grid grid-cols-4 gap-3">
              <DateMaskField label="Fecha de baja"            value={form.fecha_baja}          onChange={set('fecha_baja')}          cols={1} />
              <Field         label="Carga horaria"            value={form.carga_horaria}       onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setForm(prev => ({ ...prev, carga_horaria: v })) }}       cols={1} />
              <SelectField   label="Motivo de baja"           value={form.motivo_baja}         onChange={set('motivo_baja')}         options={OPCIONES_MOTIVO_BAJA} cols={1} />
              <Field         label="Doc. respaldatoria"       value={form.doc_respaldatoria}   onChange={set('doc_respaldatoria')}                               cols={1} />
              <DateMaskField label="Fecha pase paralelo / GT" value={form.fecha_pase_paralelo} onChange={set('fecha_pase_paralelo')} cols={1} />
              <Field         label="ID SIAL"                  value={form.cargo_baja}          onChange={set('cargo_baja')}          cols={1} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
            </div>
          </Section>

          {/* 5 — Concurso */}
          <Section title="Concurso">
            <div className="grid grid-cols-4 gap-3">
              <CheckField label="Genera concurso" value={form.genera_concurso === 'SI'}
                onChange={e => setForm(prev => ({ ...prev, genera_concurso: e.target.value ? 'SI' : 'NO' }))} cols={1} />
              {form.origen === 'Ampliación' ? (
                <CheckField label="Obra" value={!!form.obra}
                  onChange={e => setForm(prev => ({ ...prev, obra: e.target.value }))} cols={1} />
              ) : (
                <div className="col-span-1" />
              )}
              {(form.genera_concurso === 'SI' || esCeetps) ? (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1 invisible">.</label>
                  <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${
                    esCeetps
                      ? 'bg-teal-50 border-teal-200 text-teal-800'
                      : previewEsCph
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {esCeetps
                      ? `Código ${codigoNum} (${ceetpsLabel}): esta baja se dirigirá automáticamente a Seguimiento CEETPS.`
                      : previewEsCph
                        ? 'Esta baja cumple la regla CPH, se creará automáticamente un registro de seguimiento.'
                        : 'El puesto es Técnico o Enfermería, la baja se archivará sin generar seguimiento CPH.'}
                  </div>
                </div>
              ) : (
                <div className="col-span-2" />
              )}
            </div>
          </Section>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear baja'}
            </button>
          </div>

        </form>
      </div>
    </div>
    </>
    </OrigenContext.Provider>
  )
}

// ─── SiglaSearchField ─────────────────────────────────────────────────────────
function SiglaSearchField({ value, onChange }) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const wrapRef             = useRef(null)
  const inputRef            = useRef(null)
  const origen              = useContext(OrigenContext)

  const selected = SIGLAS_DATA.find(s => s.sigla === value)

  const filtered = query.trim()
    ? SIGLAS_DATA.filter(s =>
        s.sigla.toLowerCase().includes(query.toLowerCase()) ||
        s.descr.toLowerCase().includes(query.toLowerCase())
      )
    : SIGLAS_DATA

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (sigla) => {
    onChange({ target: { value: sigla } })
    setOpen(false)
    setQuery('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange({ target: { value: '' } })
    setQuery('')
  }

  const openDropdown = () => {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  return (
    <div className="col-span-1" ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">Sigla</label>
      <div className="relative">
        {/* Trigger */}
        {!open ? (
          <button
            type="button"
            onClick={openDropdown}
            style={getOrigenBgStyle(origen, !!value)}
            className="form-input text-sm w-full text-left flex items-center justify-between gap-1 pr-7"
          >
            {selected ? (
              <span className="font-mono font-semibold text-primary-700">{selected.sigla}</span>
            ) : (
              <span className="text-gray-400">Seleccionar...</span>
            )}
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2" />
          </button>
        ) : (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar sigla o efector..."
              className="form-input text-sm w-full pl-8"
            />
          </div>
        )}

        {/* Botón limpiar */}
        {value && !open && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-500 transition-colors z-10"
            title="Limpiar sigla"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}

        {/* Dropdown */}
        {open && (
          <div className="absolute z-40 left-0 top-full mt-1 w-[380px] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</div>
              ) : filtered.map(s => (
                <button
                  key={s.sigla}
                  type="button"
                  onClick={() => handleSelect(s.sigla)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    s.sigla === value ? 'bg-primary-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-primary-700 w-24 flex-shrink-0">{s.sigla}</span>
                  <span className="text-xs text-gray-700 truncate flex-1">{s.descr}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 hidden sm:block max-w-[100px] truncate">{s.tipo}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ExportDropdown({ onExport }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
        Exportar informe
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[56] overflow-hidden min-w-[140px]">
            <button
              type="button"
              onClick={() => { onExport('pdf'); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
            >
              <span className="w-5 h-5 rounded bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-bold flex-shrink-0">PDF</span>
              PDF
            </button>
            <div className="h-px bg-gray-100" />
            <button
              type="button"
              onClick={() => { onExport('word'); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
            >
              <span className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold flex-shrink-0">DOC</span>
              Word
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 w-full group"
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200${open ? '' : ' -rotate-90'}`} />
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest group-hover:text-gray-700 transition-colors">{title}</h3>
        </div>
        <div className="flex-1 h-px bg-gray-200" />
      </button>
      {open && children}
    </div>
  )
}

function SelectField({ label, value, onChange, options = [], cols = 1, disabled = false }) {
  const origen = useContext(OrigenContext)
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={getOrigenBgStyle(origen, !!value)}
        className={`form-input text-sm w-full${disabled ? ' cursor-default' : ''}`}
      >
        <option value="">Seleccionar...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text', cols = 1, disabled = false }) {
  const origen = useContext(OrigenContext)
  const displayValue = disabled && !value ? '—' : (value ?? '')
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={displayValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        style={getOrigenBgStyle(origen, !!value)}
        className={`form-input text-sm w-full${disabled ? ' cursor-default' : ''}`}
      />
    </div>
  )
}

function DateMaskField({ label, value, onChange, cols = 1 }) {
  const origen = useContext(OrigenContext)
  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^\d]/g, '')
    if (raw.length > 8) raw = raw.slice(0, 8)
    let formatted = ''
    for (let i = 0; i < raw.length; i++) {
      if (i === 2 || i === 4) formatted += '-'
      formatted += raw[i]
    }
    onChange({ target: { value: formatted } })
  }
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={handleChange}
        placeholder="dd-mm-yyyy"
        maxLength={10}
        style={getOrigenBgStyle(origen, value?.length === 10)}
        className="form-input text-sm w-full font-mono"
      />
    </div>
  )
}

function CheckField({ label, value, onChange, cols = 1, disabled = false }) {
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <label
        className={`flex items-center gap-2 form-input text-sm w-full select-none ${
          disabled ? 'cursor-default bg-gray-50' : 'cursor-pointer hover:bg-gray-50'
        }`}
      >
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange({ target: { value: e.target.checked } })}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 pointer-events-none"
        />
        <span className={`text-sm ${!!value ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
          {!!value ? 'Sí' : 'No'}
        </span>
      </label>
    </div>
  )
}

function ExBajaField({ value, onChange, cols = 3 }) {
  const origen = useContext(OrigenContext)
  const currentYear = String(new Date().getFullYear())

  const detectMode = (v) => (v && v.startsWith('RESOL/')) ? 'RESOL' : 'EX'

  const parseEX = (v) => {
    const m = (v || '').match(/^EX-(\d{4})-(\d*)- -GCABA-(.{0,5})$/)
    return m ? { year: m[1], num: m[2], sigla: m[3] } : { year: currentYear, num: '', sigla: '' }
  }

  const parseRESOL = (v) => {
    const m = (v || '').match(/^RESOL\/(\d{0,4})\/([A-Z0-9]{0,5})\/(.{0,5})$/)
    return m ? { num: m[1], msgc: m[2], last: m[3] } : { num: '', msgc: 'MSGC', last: '' }
  }

  const [mode, setMode]     = useState(() => detectMode(value))
  const [exP, setExP]       = useState(() => parseEX(value))
  const [resolP, setResolP] = useState(() => parseRESOL(value))

  const buildEX    = (p) => `EX-${p.year}-${p.num}- -GCABA-${p.sigla}`
  const buildRESOL = (p) => `RESOL/${p.num}/${p.msgc}/${p.last}`

  const emitEX    = (p) => onChange({ target: { value: buildEX(p) } })
  const emitRESOL = (p) => onChange({ target: { value: buildRESOL(p) } })

  const updEX = (field, v) => { const p = { ...exP, [field]: v };    setExP(p);    emitEX(p) }
  const updRE = (field, v) => { const p = { ...resolP, [field]: v }; setResolP(p); emitRESOL(p) }

  const toggle = () => {
    const next = mode === 'EX' ? 'RESOL' : 'EX'
    setMode(next)
    if (next === 'EX') emitEX(exP); else emitRESOL(resolP)
  }

  const iBgStyle = getOrigenBgStyle(origen)
  const iCls = 'rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center font-mono'

  return (
    <div className={`col-span-${cols}`}>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-xs font-medium text-gray-600">EX Baja / Ampliación</label>
        <button
          type="button"
          onClick={toggle}
          className="px-2 py-1 rounded text-xs font-bold border border-primary-400 bg-primary-50 text-primary-700 hover:bg-primary-100"
        >{mode}</button>
      </div>

      {mode === 'EX' ? (
        <div className="flex items-center gap-1.5 font-mono text-sm flex-nowrap">
          <span className="text-gray-400 select-none">EX-</span>
          <input value={exP.year}  onChange={e => updEX('year',  e.target.value.replace(/\D/g,'').slice(0,4))} style={{ ...iBgStyle, width: '3.5rem' }} className={iCls} maxLength={4} placeholder="AAAA" />
          <span className="text-gray-400 select-none">-</span>
          <input value={exP.num}   onChange={e => updEX('num',   e.target.value.replace(/\D/g,'').slice(0,8))} style={{ ...iBgStyle, width: '7.5rem' }} className={iCls} maxLength={8} placeholder="00000000" />
          <span className="text-gray-400 select-none">-&nbsp;-GCABA-</span>
          <input value={exP.sigla} onChange={e => updEX('sigla', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5))} style={{ ...iBgStyle, width: '4rem' }} className={iCls} maxLength={5} placeholder="XXXXX" />
        </div>
      ) : (
        <div className="flex items-center gap-1.5 font-mono text-sm flex-nowrap">
          <span className="text-gray-400 select-none">RESOL/</span>
          <input value={resolP.num}  onChange={e => updRE('num',  e.target.value.replace(/\D/g,'').slice(0,4))}                        style={{ ...iBgStyle, width: '4rem' }}  className={iCls} maxLength={4} placeholder="0000" />
          <span className="text-gray-400 select-none">/</span>
          <input value={resolP.msgc} onChange={e => updRE('msgc', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5))}  style={{ ...iBgStyle, width: '4rem' }}  className={iCls} maxLength={5} placeholder="MSGC" />
          <span className="text-gray-400 select-none">/</span>
          <input value={resolP.last} onChange={e => updRE('last', e.target.value.toUpperCase().slice(0,5))}                            style={{ ...iBgStyle, width: '4rem' }}  className={iCls} maxLength={5} placeholder="XXXXX" />
        </div>
      )}

      {value && <p className="mt-1 text-xs text-gray-400 font-mono">{value}</p>}
    </div>
  )
}

// ─── Vista pipeline (solo-lectura) ────────────────────────────────────────────
function PipelineViewBaja({ initial, onClose }) {
  const origenColor = {
    'Alta por Baja':      'bg-blue-600',
    'Ampliación':         'bg-green-600',
    'Cobertura Dotación': 'bg-red-600',
    'POU a POF':          'bg-violet-600',
  }[initial?.origen] ?? 'bg-gray-500'

  const sections = [
    {
      title: 'Identificacion', bg: 'bg-blue-600',
      fields: [
        ['Origen',          initial?.origen],
        ['Usuario',         initial?.usuario],
        ['EX Baja',         initial?.ex_baja],
      ]
    },
    {
      title: 'Efector', bg: 'bg-violet-600',
      fields: [
        ['Sigla',         initial?.sigla],
        ['Efector',       initial?.efector],
        ['Tipo efector',  initial?.tipo_efector],
      ]
    },
    {
      title: 'Datos funcionales', bg: 'bg-purple-700',
      fields: [
        ['Codigo cargo',      initial?.codigo_cargo],
        ['CUIL',              initial?.cuil],
        ['Nombre y Apellido', initial?.nombre_apellido],
        ['ID SIAL',           initial?.cargo_baja],
        ['Cod. registro',     initial?.codigo_registro],
        ['Unificador puestos', initial?.unificador_puestos],
        ['POU/POF',           initial?.pou_pof],
        ['Escalafon',         initial?.escalafon],
        ['Puesto baja',       initial?.puesto_baja],
        ['Especialidad baja', initial?.especialidad_baja],
        ['Partida presup.',   initial?.partida_presupuestaria],
      ]
    },
    {
      title: 'Fechas y expediente', bg: 'bg-amber-600',
      fields: [
        ['Fecha baja',         initial?.fecha_baja],
        ['Carga horaria',      initial?.carga_horaria],
        ['Motivo baja',        initial?.motivo_baja],
        ['Doc. respaldatoria', initial?.doc_respaldatoria],
        ['F. pase paralelo',   initial?.fecha_pase_paralelo],
      ]
    },
    {
      title: 'Concurso', bg: 'bg-emerald-700',
      fields: [
        ['Genera concurso', initial?.genera_concurso === 'SI' ? 'Sí' : initial?.genera_concurso === 'NO' ? 'No' : '—'],
        ...(initial?.obra ? [['Obra', 'Sí']] : []),
      ]
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 border-t-4 ${origenColor}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Baja #{initial?.id}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{initial?.nombre_apellido || '—'} · CUIL {initial?.cuil || '—'} · <span className="font-medium">{initial?.origen || '—'}</span></p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {/* Secciones */}
        <div className="flex flex-col gap-2 px-5 py-5">
          {sections.map((sec) => (
            <div key={sec.title} className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className={`${sec.bg} flex items-center justify-center px-3 py-3 flex-none w-32`}>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest text-center leading-tight">{sec.title}</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-x-8 gap-y-0 px-4 py-2 bg-white">
                {sec.fields.map(([lbl, val]) => (
                  <div key={lbl} className="py-1.5 min-w-[110px]">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide leading-none">{lbl}</div>
                    <div className="text-xs text-gray-800 font-medium mt-0.5 break-words leading-snug">
                      {val != null && val !== '' ? String(val) : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
