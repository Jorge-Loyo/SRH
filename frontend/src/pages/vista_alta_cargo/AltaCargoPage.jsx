import { useState, useEffect, useRef } from 'react'
import { altaCargoApi } from '../../api/altaCargoApi'
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

// ─── Modal genérico con buscador ─────────────────────────────────────────────
function PickerModal({ title, options, value, onSelect, onClose }) {
  const [q, setQ] = useState('')
  const inputRef  = useRef(null)
  const filtered  = q.trim()
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

// ─── Campo que abre un PickerModal ───────────────────────────────────────────
function PickerField({ label, value, disabled, onOpen, onClear, cols = 1 }) {
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
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

// ─── Grupo de botones toggle ─────────────────────────────────────────────────
function ButtonGroup({ label, options, value, onChange, disabled, cols = 2 }) {
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const val  = typeof opt === 'string' ? opt : opt.value
          const lbl  = typeof opt === 'string' ? opt : opt.label
          const sel  = val === value
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

const PUESTOS_CPH = [
  'ESPECIALISTA EN LA GUARDIA MEDICO', 'PROFESIONAL GUARDIA MEDICO',
  'FARMACEUTICO DE GUARDIA', 'KINESIOLOGO DE GUARDIA', 'OBSTETRICA DE GUARDIA',
  'TRABAJADOR SOCIAL DE GUARDIA', 'ODONTOLOGO DE GUARDIA', 'PSICOLOGO DE GUARDIA',
  'BIOQUIMICO DE GUARDIA', 'MEDICO DE PLANTA',
  'EXPERTO EN FISICA RADIANTE DE PLANTA', 'PSICOPEDAGOGO DE PLANTA', 'ODONTOLOGO DE PLANTA',
  'FARMACEUTICO DE PLANTA', 'FONOAUDIOLOGO DE PLANTA', 'OBSTETRICA DE PLANTA',
  'PSICOLOGO DE PLANTA', 'TRABAJADOR SOCIAL DE PLANTA', 'NUTRICIONISTA DIETISTA DE PLANTA',
  'BIOQUIMICO DE PLANTA', 'KINESIOLOGO DE PLANTA', 'TERAPEUTA OCUPACIONAL DE PLANTA',
  'MUSICOTERAPEUTA DE PLANTA', 'SOCIOLOGO DE PLANTA', 'LIC. EN CIENCIAS EDUC. DE PLANTA',
  'BIOLOGO DE PLANTA',
  'JEFE DEPARTAMENTO', 'JEFE DIVISION', 'JEFE SECCION', 'JEFE UNIDAD',
]

const PUESTOS_TEC = [
  'TECNICO EN LABORATORIO', 'TECNICO EN RADIOLOGIA', 'TECNICO EN HEMOTERAPIA',
  'TECNICO EN ANATOMIA PATOLOGICA', 'TECNICO EN FARMACIA', 'TECNICO EN ESTERILIZACION',
  'TECNICO EN ELECTROMEDICINA', 'TECNICO EN NUTRICION', 'TECNICO EN SALUD MENTAL',
  'TECNICO EN ORTOPEDIA', 'TECNICO EN OPTICA', 'TECNICO EN ODONTOLOGIA',
  'TECNICO EN KINESIOLOGIA', 'TECNICO EN FONOAUDIOLOGIA', 'TECNICO EN TERAPIA OCUPACIONAL',
]

const PUESTOS_MEDICO = [
  'ESPECIALISTA EN LA GUARDIA MEDICO', 'PROFESIONAL GUARDIA MEDICO', 'MEDICO DE PLANTA',
  'JEFE DEPARTAMENTO', 'JEFE DIVISION', 'JEFE SECCION', 'JEFE UNIDAD',
]

const EMPTY_FORM = {
  sigla: '', carrera_seleccionada: '', tipo_cph: '', modalidad: '', nivel_formacion: '',
  puesto: '', especialidad: '',
}

function isComplete(form) {
  const { sigla, carrera_seleccionada: c, tipo_cph, modalidad, nivel_formacion, puesto, especialidad } = form
  if (!sigla || !c) return false
  if (c === 'cph') return !!tipo_cph && !!modalidad && !!puesto && !!especialidad
  if (c === 'enf') return !!nivel_formacion
  if (c === 'tec') return !!modalidad && !!puesto
  return false
}

function buildPayload(form) {
  const { sigla, carrera_seleccionada, tipo_cph, modalidad, nivel_formacion, puesto, especialidad } = form
  if (carrera_seleccionada === 'cph') return { sigla, carrera_seleccionada, tipo_cph, modalidad, puesto, especialidad }
  if (carrera_seleccionada === 'enf') return { sigla, carrera_seleccionada, nivel_formacion }
  return { sigla, carrera_seleccionada, modalidad, puesto, especialidad }
}

// ─── Sección del formulario con número y título ───────────────────────────────
function Section({ num, title, locked, children }) {
  return (
    <div className={`rounded-xl border p-5 transition-colors ${locked ? 'border-gray-100 bg-gray-50/50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          locked ? 'bg-gray-200 text-gray-400' : 'bg-primary-600 text-white'
        }`}>{num}</span>
        <span className={`text-xs font-bold uppercase tracking-widest ${locked ? 'text-gray-400' : 'text-gray-600'}`}>{title}</span>
      </div>
      <div className={locked ? 'opacity-40 pointer-events-none' : ''}>{children}</div>
    </div>
  )
}

function SuccessView({ result, onNuevo }) {
  const { alta, detalle, codigo } = result
  const numeroUnico = detalle?.numero_unico
  const rows = [
    ['Código',         codigo],
    ['Sigla',          result?.sigla],
    ['Carrera',        alta?.carrera_seleccionada?.toUpperCase()],
    ['Número único',   numeroUnico],
    ...(detalle?.modalidad       ? [['Modalidad',       detalle.modalidad]]       : []),
    ...(detalle?.nivel_formacion ? [['Nivel formación', detalle.nivel_formacion]] : []),
    ...(detalle?.puesto          ? [['Puesto',          detalle.puesto]]          : []),
    ...(detalle?.especialidad    ? [['Especialidad',    detalle.especialidad]]    : []),
  ]
  return (
    <div className="max-w-lg space-y-5">
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <CheckIcon className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Alta registrada correctamente</p>
          <p className="text-xs text-gray-500 mt-0.5">Código: <span className="font-mono font-bold text-primary-700">{codigo}</span></p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center px-4 py-2.5 even:bg-gray-50 border-b border-gray-100 last:border-0">
            <span className="text-xs text-gray-400 w-36 flex-shrink-0">{label}</span>
            <span className="text-sm text-gray-800 font-medium">{value ?? '—'}</span>
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={onNuevo}>+ Registrar otro alta</button>
    </div>
  )
}

export default function AltaCargoPage({ embedded = false }) {
  // cuando está embebida en CargosPage el padding lo pone el contenedor
  const wrap = embedded ? 'max-w-xl' : 'px-6 py-8 max-w-xl'
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [result, setResult]           = useState(null)
  const [carreras, setCarreras]       = useState([])
  const [siglas, setSiglas]           = useState([])
  const [espMedico,   setEspMedico]   = useState([])
  const [espNoMedico, setEspNoMedico] = useState([])
  const [espTec,      setEspTec]      = useState([])
  const [modalidades, setModalidades] = useState([])
  const [picker,      setPicker]      = useState(null)

  useEffect(() => {
    altaCargoApi.listCarreras().then(setCarreras).catch(() => {})
    altaCargoApi.listSiglas().then(setSiglas).catch(() => {})
    altaCargoApi.listModalidades().then(setModalidades).catch(() => {})
    altaCargoApi.listEspecialidades('medico').then(rows => setEspMedico(rows.map(r => r.nombre))).catch(() => {})
    altaCargoApi.listEspecialidades('no_medico').then(rows => setEspNoMedico(rows.map(r => r.nombre))).catch(() => {})
    altaCargoApi.listEspecialidades(null, 'TEC').then(rows => setEspTec(rows.map(r => r.nombre))).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try   { setResult(await altaCargoApi.create(buildPayload(form))) }
    catch (err) { setError(err.message) }
    finally     { setSaving(false) }
  }

  const c     = form.carrera_seleccionada
  const esCph = c === 'cph'
  const esEnf = c === 'enf'
  const esTec = c === 'tec'

  const espOptions = esCph
    ? (PUESTOS_MEDICO.includes(form.puesto) ? espMedico : espNoMedico)
    : esTec ? espTec : []

  const carreraOpts = carreras.map(cr => ({ value: cr.codigo.toLowerCase(), label: cr.nombre }))

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
          options={esCph ? PUESTOS_CPH : PUESTOS_TEC} value={form.puesto}
          onSelect={v => setForm(p => ({ ...p, puesto: v, especialidad: '' }))}
          onClose={() => setPicker(null)} />
      )}
      {picker === 'especialidad' && (
        <PickerModal title="Seleccionar Especialidad"
          options={espOptions} value={form.especialidad}
          onSelect={v => setForm(p => ({ ...p, especialidad: v }))}
          onClose={() => setPicker(null)} />
      )}

      <div className="mb-7">
        <h1 className="text-xl font-bold text-gray-900">Alta de Cargo</h1>
        <p className="text-sm text-gray-400 mt-1">Registrá un nuevo cargo en el sistema</p>
      </div>

      {result ? (
        <SuccessView result={result} onNuevo={() => { setForm(EMPTY_FORM); setError(null); setResult(null) }} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* 1 — Ubicación */}
          <Section num="1" title="Ubicación" locked={false}>
            <PickerField
              label="Sigla — entidad donde se crea el cargo"
              value={form.sigla} cols={1}
              onOpen={() => setPicker('sigla')}
              onClear={() => setForm(EMPTY_FORM)} />
          </Section>

          {/* 2 — Carrera */}
          <Section num="2" title="Carrera" locked={!form.sigla}>
            <ButtonGroup
              label="Seleccioná la carrera"
              options={carreraOpts}
              value={form.carrera_seleccionada}
              disabled={!form.sigla}
              onChange={v => setForm(p => ({ ...p, carrera_seleccionada: v, tipo_cph: '', modalidad: '', nivel_formacion: '', puesto: '', especialidad: '' }))}
              cols={1} />
          </Section>

          {/* 3 — Detalle */}
          <Section num="3" title="Detalle" locked={!form.carrera_seleccionada}>

            {/* Tipo CPH — solo para CPH */}
            {esCph && (
              <div className="mb-4">
                <ButtonGroup
                  label="Tipo de cargo"
                  options={[
                    { value: 'comun',    label: 'Común'    },
                    { value: 'jefe',     label: 'Jefe'     },
                    { value: 'director', label: 'Director' },
                  ]}
                  value={form.tipo_cph}
                  disabled={false}
                  onChange={v => setForm(p => ({ ...p, tipo_cph: v, modalidad: '', puesto: '', especialidad: '' }))}
                  cols={1} />
              </div>
            )}

            {/* Modalidad — CPH y TEC */}
            {(esCph || esTec) && (
              <div className="mb-4">
                <ButtonGroup
                  label="Modalidad"
                  options={modalidades.map(m => m.nombre)}
                  value={form.modalidad}
                  disabled={esCph && !form.tipo_cph}
                  onChange={v => setForm(p => ({ ...p, modalidad: v, puesto: '', especialidad: '' }))}
                  cols={1} />
              </div>
            )}

            {/* Nivel de formación — ENF */}
            {esEnf && (
              <ButtonGroup
                label="Nivel de formación"
                options={[
                  { value: 'enfermero prof',           label: 'Enfermero Prof.' },
                  { value: 'licenciado en enfermeria', label: 'Lic. en Enfermería' },
                ]}
                value={form.nivel_formacion}
                disabled={false}
                onChange={v => setForm(p => ({ ...p, nivel_formacion: v }))}
                cols={1} />
            )}

            {/* Puesto + Especialidad — CPH y TEC */}
            {(esCph || esTec) && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <PickerField label="Puesto" value={form.puesto}
                  disabled={!form.modalidad}
                  onOpen={() => setPicker('puesto')}
                  onClear={() => setForm(p => ({ ...p, puesto: '', especialidad: '' }))} />
                {esCph && (
                  <PickerField label="Especialidad" value={form.especialidad}
                    disabled={!form.puesto}
                    onOpen={() => setPicker('especialidad')}
                    onClear={() => setForm(p => ({ ...p, especialidad: '' }))} />
                )}
              </div>
            )}

          </Section>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 text-sm">{error}</div>
          )}

          <div className="flex justify-end pt-1">
            <button type="submit" className="btn-primary" disabled={saving || !isComplete(form)}>
              {saving ? 'Guardando...' : 'Registrar Alta'}
            </button>
          </div>

        </form>
      )}
    </div>
  )
}
