import { useState, useEffect } from 'react'
import { altaCargoApi } from '../../../api/altaCargoApi'
import BaseModal from './BaseModal'
import { Section, StyledSelectField, SearchSelectField } from '../ConcursalesFormFields'

const PUESTOS = [
  'TECNICO EN LABORATORIO', 'TECNICO EN RADIOLOGIA', 'TECNICO EN HEMOTERAPIA',
  'TECNICO EN ANATOMIA PATOLOGICA', 'TECNICO EN FARMACIA', 'TECNICO EN ESTERILIZACION',
  'TECNICO EN ELECTROMEDICINA', 'TECNICO EN NUTRICION', 'TECNICO EN SALUD MENTAL',
  'TECNICO EN ORTOPEDIA', 'TECNICO EN OPTICA', 'TECNICO EN ODONTOLOGIA',
  'TECNICO EN KINESIOLOGIA', 'TECNICO EN FONOAUDIOLOGIA', 'TECNICO EN TERAPIA OCUPACIONAL',
]

const ESPECIALIDADES_TEC = [
  'GENERAL', 'BIOQUIMICA', 'HEMATOLOGIA', 'MICROBIOLOGIA', 'CITOLOGIA', 'HISTOPATOLOGIA',
  'DIAGNOSTICO POR IMAGENES', 'MAMOGRAFIA', 'TOMOGRAFIA', 'RESONANCIA MAGNETICA',
  'BANCO DE SANGRE', 'AFERESIS', 'CITOTOXICOS', 'NUTRICION CLINICA', 'NUTRICION PEDIATRICA',
  'PSIQUIATRIA', 'ADICCIONES', 'PROTESIS', 'ORTESIS', 'BAJA VISION', 'CONTACTOLOGIA',
  'ENDODONCIA', 'PROTESIS DENTAL', 'RESPIRATORIO', 'NEUROLOGICO', 'MUSCULOESQUELETICO',
  'PEDIATRICO', 'GERIATRICO', 'COMUNICACION', 'DEGLUSION', 'VOZ', 'PSICOMOTRICIDAD',
  'REHABILITACION',
]

const EMPTY_FORM = {
  carrera_seleccionada: '', modalidad: '', nivel_formacion: '',
  tipo_tec: '', puesto: '', especialidad: '',
}

function isComplete(form) {
  const { carrera_seleccionada: c, modalidad, nivel_formacion, tipo_tec, puesto, especialidad } = form
  if (!c) return false
  if (c === 'cph') return !!modalidad
  if (c === 'enf') return !!nivel_formacion
  if (c === 'tec') return !!tipo_tec && !!puesto && !!especialidad
  return false
}

function buildPayload(form) {
  const { carrera_seleccionada, modalidad, nivel_formacion, tipo_tec, puesto, especialidad } = form
  if (carrera_seleccionada === 'cph') return { carrera_seleccionada, modalidad }
  if (carrera_seleccionada === 'enf') return { carrera_seleccionada, nivel_formacion }
  return { carrera_seleccionada, tipo_tec, puesto, especialidad }
}

function SuccessView({ result }) {
  const { alta, detalle } = result
  const carrera = alta?.carrera_seleccionada?.toUpperCase()
  const numeroUnico = detalle?.numero_unico
  const rows = [
    ['ID Alta',       alta?.id],
    ['Carrera',       carrera],
    ['Número único',  numeroUnico],
    ...(detalle?.modalidad       ? [['Modalidad',       detalle.modalidad]]       : []),
    ...(detalle?.nivel_formacion ? [['Nivel formación', detalle.nivel_formacion]] : []),
    ...(detalle?.puesto          ? [['Puesto',          detalle.puesto]]          : []),
    ...(detalle?.especialidad    ? [['Especialidad',    detalle.especialidad]]    : []),
  ]
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Alta registrada correctamente</p>
          <p className="text-xs text-gray-500">Número único: <span className="font-mono font-bold text-primary-700">#{numeroUnico}</span></p>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center px-4 py-2 even:bg-gray-50">
            <span className="text-xs text-gray-500 w-36 flex-shrink-0">{label}</span>
            <span className="text-sm text-gray-800 font-medium">{value ?? '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AltaCargoModal({ open, onClose }) {
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [result, setResult]     = useState(null)
  const [carreras, setCarreras] = useState([])

  useEffect(() => {
    if (!open) return
    altaCargoApi.listCarreras()
      .then(setCarreras)
      .catch(() => {})
  }, [open])

  const handleClose = () => {
    setForm(EMPTY_FORM)
    setError(null)
    setResult(null)
    onClose()
  }

  const set = (field) => (e) =>
    setForm(prev => {
      if (field === 'carrera_seleccionada') return { ...EMPTY_FORM, carrera_seleccionada: e.target.value }
      if (field === 'tipo_tec') return { ...prev, tipo_tec: e.target.value, puesto: '', especialidad: '' }
      return { ...prev, [field]: e.target.value }
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res = await altaCargoApi.create(buildPayload(form))
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <BaseModal open={open} onClose={handleClose} title="Alta registrada" size="sm"
        footer={<button className="btn-primary" onClick={handleClose}>Cerrar</button>}
      >
        <SuccessView result={result} />
      </BaseModal>
    )
  }

  const carrera = form.carrera_seleccionada

  return (
    <BaseModal
      open={open}
      onClose={handleClose}
      title="Nueva Alta de Cargo"
      size="md"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={handleClose} disabled={saving}>Cancelar</button>
          <button type="submit" form="alta-cargo-form" className="btn-primary" disabled={saving || !isComplete(form)}>
            {saving ? 'Guardando...' : 'Registrar Alta'}
          </button>
        </>
      }
    >
      <form id="alta-cargo-form" onSubmit={handleSubmit} className="space-y-6">
        <Section title="Paso 1 — Carrera">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">Carrera</label>
            <select
              value={form.carrera_seleccionada}
              onChange={set('carrera_seleccionada')}
              className="form-input w-full text-sm"
            >
              <option value="">Seleccionar...</option>
              {carreras.map(c => (
                <option key={c.id} value={c.id.toLowerCase()}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </Section>

        {carrera === 'cph' && (
          <Section title="Paso 2 — Modalidad CPH">
            <StyledSelectField label="Modalidad" value={form.modalidad}
              onChange={set('modalidad')} options={['planta', 'guardia']} />
          </Section>
        )}

        {carrera === 'enf' && (
          <Section title="Paso 2 — Nivel de Formación">
            <StyledSelectField label="Nivel de formación" value={form.nivel_formacion}
              onChange={set('nivel_formacion')} options={['enfermero prof', 'licenciado en enfermeria']} />
          </Section>
        )}

        {carrera === 'tec' && (
          <Section title="Paso 2 — Tipo TEC">
            <StyledSelectField label="Tipo" value={form.tipo_tec}
              onChange={set('tipo_tec')} options={['pou', 'pof']} />
          </Section>
        )}

        {carrera === 'tec' && form.tipo_tec && (
          <Section title={`Paso 3 — Detalles ${form.tipo_tec.toUpperCase()}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SearchSelectField label="Puesto" value={form.puesto}
                onChange={set('puesto')} options={PUESTOS} cols={1} />
              <SearchSelectField label="Especialidad" value={form.especialidad}
                onChange={set('especialidad')} options={ESPECIALIDADES_TEC} cols={1}
                disabled={!form.puesto} />
            </div>
          </Section>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">{error}</div>
        )}
      </form>
    </BaseModal>
  )
}
