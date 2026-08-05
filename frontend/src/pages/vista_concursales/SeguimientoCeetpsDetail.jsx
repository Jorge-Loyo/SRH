import { useState, useRef, useEffect, useMemo } from 'react'
import { XMarkIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { seguimientoCeetpsApi, configApi, bajasApi } from '../../api/concursalesApi'
import { OPCIONES_USUARIOS_CEETPS, SIGLAS_POR_USUARIO_CEETPS, SIGLAS_DATA, OPCIONES_PUESTO_CEETPS_TODOS, isoToDmy, dmyToIso, computeEstadoConcurso, formatDateMask } from '../../utils/concursalesHelpers'
import { applyRulesCeetps } from '../../utils/conjuntosRulesCeetps'
import { Section, CheckField } from '../../components/ui/ConcursalesFormFields'

const TABS = [
  { label: 'Enfermeros',      codigo: 87 },
  { label: 'Técnicos',        codigo: 85 },
  { label: 'Administrativos', codigo: 83 },
]

function getCategoryLabel(codigo) {
  return TABS.find(t => t.codigo === Number(codigo))?.label ?? `Código ${codigo}`
}

export default function SeguimientoCeetpsDetail({ initial, onSaved, onClose, readOnly = false }) {
  const isEdit = !!initial

  const [form, setForm] = useState({
    // Responsable
    usuario:                  initial?.usuario                  ?? '',
    // Efector
    sigla_efector:            initial?.sigla_efector            ?? '',
    descr_efector:            initial?.descr_efector            ?? '',
    // Código (solo lectura — para evaluación de reglas de Conjuntos)
    codigo_registro:          initial?.codigo_registro          ?? '',
    // Concurso
    tipificador_obra_servicio: initial?.tipificador_obra_servicio ?? '',
    tipificador_origen:       initial?.tipificador_origen        ?? '',
    fecha_caratulacion:       isoToDmy(initial?.fecha_caratulacion) ?? '',
    expediente_concurso:      initial?.expediente_concurso      ?? '',
    fecha_autorizacion:       isoToDmy(initial?.fecha_autorizacion) ?? '',
    puesto_solicitado:        initial?.puesto_solicitado        ?? '',
    dispo_llamado:            initial?.dispo_llamado            ?? '',
    fecha_ifacs:              isoToDmy(initial?.fecha_ifacs)    ?? '',
    fecha_insal:              isoToDmy(initial?.fecha_insal)    ?? '',
    estado_concurso:          initial?.estado_concurso          ?? '',
    // Designación
    expediente_designacion:   initial?.expediente_designacion   ?? '',
    puesto_designado:         initial?.puesto_designado         ?? '',
    cuil_designado:           initial?.cuil_designado           ?? '',
    nombre_apellido_designado: initial?.nombre_apellido_designado ?? '',
    estado_apto:              initial?.estado_apto              ?? '',
    numero_apto_medico:       initial?.numero_apto_medico       ?? '',
    fecha_proyecto_dispo:     isoToDmy(initial?.fecha_proyecto_dispo) ?? '',
    dispo_designacion:        initial?.dispo_designacion        ?? '',
    resolucion_designacion:   initial?.resolucion_designacion   ?? '',
    alta_sial:                initial?.alta_sial                ?? false,
    id_cargo:                 initial?.id_cargo                 ?? '',
    observaciones:            initial?.observaciones            ?? '',
    // Baja (semi-readonly — editables por si fue cargado manualmente)
    ex_baja:                  initial?.ex_baja                  ?? '',
    sigla:                    initial?.sigla                    ?? '',
    efector:                  initial?.efector                  ?? '',
    cargo:                    initial?.cargo                    ?? '',
    cuil:                     initial?.cuil                     ?? '',
    nombre_apellido_baja:     initial?.nombre_apellido_baja     ?? '',
    puesto_baja:              initial?.puesto_baja              ?? '',
    especialidad_baja:        initial?.especialidad_baja        ?? '',
    fecha_baja:               isoToDmy(initial?.fecha_baja)     ?? '',
    carga_horaria:            initial?.carga_horaria            ?? '',
    motivo_baja:              initial?.motivo_baja              ?? '',
    doc_respaldatoria:        initial?.doc_respaldatoria        ?? '',
    // Solicitud de cambio
    cambio_especialidad:      initial?.cambio_especialidad      ?? 'NO',
    doc_cambio_especialidad:  initial?.doc_cambio_especialidad  ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  // Si el registro está vinculado a una baja, los campos copiados se bloquean
  const hasBajaLink = !!initial?.id_baja

  // Cuando hay id_baja, traer el campo "origen" de esa baja y usarlo como tipificador_origen
  useEffect(() => {
    if (!initial?.id_baja) return
    bajasApi.getById(initial.id_baja)
      .then(baja => {
        if (baja?.origen) {
          setForm(prev => ({ ...prev, tipificador_origen: baja.origen }))
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id_baja])

  // Reglas de autocompletado para el campo Conjuntos
  const [conjuntosRules, setConjuntosRules] = useState([])
  useEffect(() => {
    configApi.getConjuntosCeetps()
      .then(data => setConjuntosRules(data.rules ?? []))
      .catch(() => {})
  }, [])

  const WATCHED_FIELDS_CEETPS = [
    'sigla_efector', 'descr_efector',
    'codigo_registro', 'cuil', 'nombre_apellido_baja', 'cargo',
    'puesto_baja', 'especialidad_baja', 'fecha_baja', 'carga_horaria',
    'motivo_baja', 'ex_baja', 'sigla', 'efector', 'doc_respaldatoria',
    'tipificador_origen', 'expediente_concurso',
    'puesto_solicitado', 'dispo_llamado',
    'fecha_caratulacion', 'fecha_autorizacion', 'fecha_ifacs', 'fecha_insal', 'estado_concurso',
    'expediente_designacion', 'puesto_designado', 'cuil_designado', 'nombre_apellido_designado',
    'estado_apto', 'numero_apto_medico', 'fecha_proyecto_dispo',
    'dispo_designacion', 'resolucion_designacion', 'alta_sial', 'id_cargo', 'observaciones',
    'usuario',
  ]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const watchedSnapshot = WATCHED_FIELDS_CEETPS.map(f => form[f]).join('|')

  useEffect(() => {
    if (!conjuntosRules.length) return
    if (form.tipificador_obra_servicio) return
    const suggested = applyRulesCeetps(conjuntosRules, form)
    if (suggested !== null) {
      setForm(prev => ({ ...prev, tipificador_obra_servicio: suggested }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSnapshot, conjuntosRules])

  // Cálculo automático de Estado Concurso según la etapa más avanzada con datos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const estadoSnapshot = [
    form.expediente_concurso, form.puesto_solicitado, form.dispo_llamado,
    form.fecha_ifacs, form.fecha_insal,
    form.expediente_designacion, form.dispo_designacion, form.resolucion_designacion,
  ].join('|')

  useEffect(() => {
    const computed = computeEstadoConcurso(form)
    if (form.estado_concurso !== computed) {
      setForm(prev => ({ ...prev, estado_concurso: computed }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoSnapshot])

  const allowedSiglas = useMemo(() => {
    const allowed = SIGLAS_POR_USUARIO_CEETPS[form.usuario]
    if (!allowed) return SIGLAS_DATA
    return SIGLAS_DATA.filter(s => allowed.includes(s.sigla))
  }, [form.usuario])

  useEffect(() => {
    const allowed = SIGLAS_POR_USUARIO_CEETPS[form.usuario]
    if (!allowed) return
    if (form.sigla_efector && !allowed.includes(form.sigla_efector)) {
      setForm(prev => ({ ...prev, sigla_efector: '', descr_efector: '' }))
    }
  }, [form.usuario])

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))
  const setBool = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleCambioEspecialidadChange = (e) => {
    const esCambio = e.target.value === 'SI'
    setForm(prev => ({
      ...prev,
      cambio_especialidad: e.target.value,
      // Si se desmarca, restaura los valores originales de la baja
      ...(esCambio ? {} : {
        puesto_baja:       initial?.puesto_baja       ?? '',
        especialidad_baja: initial?.especialidad_baja ?? '',
      })
    }))
  }

  const handleSiglaChange = (sigla) => {
    const found = SIGLAS_DATA.find(s => s.sigla === sigla)
    setForm(prev => ({
      ...prev,
      sigla_efector: sigla,
      descr_efector: found ? found.descr : prev.descr_efector,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const DATE_FIELDS = [
      'fecha_caratulacion', 'fecha_autorizacion', 'fecha_ifacs', 'fecha_insal',
      'fecha_proyecto_dispo', 'fecha_baja',
    ]
    const payload = {}
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'boolean') {
        payload[k] = v
      } else if (v === '') {
        payload[k] = null
      } else if (DATE_FIELDS.includes(k)) {
        payload[k] = dmyToIso(v)
      } else {
        payload[k] = v
      }
    }
    try {
      if (isEdit) {
        await seguimientoCeetpsApi.update(initial.id, payload)
      } else {
        await seguimientoCeetpsApi.create(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (readOnly) return <PipelineViewCeetps initial={initial} onClose={onClose} />

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 border-t-4 border-teal-500">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit
                ? `Seguimiento CEETPS #${initial.id} — ${getCategoryLabel(initial.codigo_registro)}`
                : 'Nuevo seguimiento CEETPS'}
            </h2>
            {isEdit && (
              <p className="text-xs text-gray-500 mt-0.5">
                {initial.nombre_apellido_baja || '—'} · CUIL {initial.cuil || '—'} · {initial.sigla_efector || '—'}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-7">

          {/* 1 — Datos generales */}
          <Section title="Datos generales">
            <div className="grid grid-cols-4 gap-3">
              <StyledSelectField label="Usuario"           value={form.usuario}       onChange={set('usuario')}       options={OPCIONES_USUARIOS_CEETPS} cols={1} />
              <SiglaSearchField value={form.sigla_efector} onChange={handleSiglaChange} options={allowedSiglas} />
              <Field label="Descripción efector"     value={form.descr_efector} onChange={set('descr_efector')} cols={2} disabled={!!form.sigla_efector} />
              <EstadoConcursoField value={form.estado_concurso} />
            </div>
          </Section>

          {/* 2 — Concurso */}
          <Section title="Concurso">
            <div className="grid grid-cols-4 gap-3">
              <Field         label="Conjuntos"                      value={form.tipificador_obra_servicio}  onChange={set('tipificador_obra_servicio')}  cols={2} />
              <Field         label="Tipificador (Origen)"           value={form.tipificador_origen}         onChange={set('tipificador_origen')}         cols={2} disabled={hasBajaLink} />
              <Field         label="Expediente Concurso"            value={form.expediente_concurso}        onChange={set('expediente_concurso')}        cols={2} disabled={hasBajaLink} />
              <DateMaskField label="Fecha Caratulación"             value={form.fecha_caratulacion}         onChange={set('fecha_caratulacion')}         cols={1} />
              <DateMaskField label="Fecha Autorización"             value={form.fecha_autorizacion}         onChange={set('fecha_autorizacion')}         cols={1} />
              <DateMaskField label="Fecha IFACS"                    value={form.fecha_ifacs}               onChange={set('fecha_ifacs')}                cols={1} />
              <DateMaskField label="Fecha INSAL"                    value={form.fecha_insal}               onChange={set('fecha_insal')}                cols={1} />
              <StyledSelectField label="Puesto Solicitado"          value={form.puesto_solicitado}         onChange={set('puesto_solicitado')}          options={OPCIONES_PUESTO_CEETPS_TODOS} cols={2} />
              <Field         label="Dispo. Llamado a Concurso"      value={form.dispo_llamado}             onChange={set('dispo_llamado')}              cols={2} />
            </div>
          </Section>

          {/* 3 — Designación */}
          <Section title="Designación">
            <div className="grid grid-cols-4 gap-3">
              <Field         label="Expediente Designación"       value={form.expediente_designacion}   onChange={set('expediente_designacion')}    cols={2} />
              <StyledSelectField label="Puesto Designado"         value={form.puesto_designado}         onChange={set('puesto_designado')}          options={OPCIONES_PUESTO_CEETPS_TODOS} cols={2} />
              <Field         label="CUIL Designado"               value={form.cuil_designado}           onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,11); setForm(p => ({...p, cuil_designado: v})) }} placeholder="20123456789" cols={1} />
              <Field         label="Nombre y Apellido"            value={form.nombre_apellido_designado} onChange={set('nombre_apellido_designado')} cols={3} />
              <Field         label="Estado Apto"                  value={form.estado_apto}              onChange={set('estado_apto')}               cols={1} />
              <Field         label="N° Apto Médico"               value={form.numero_apto_medico}       onChange={set('numero_apto_medico')}        cols={1} />
              <DateMaskField label="Fecha Proyecto Dispo"         value={form.fecha_proyecto_dispo}     onChange={set('fecha_proyecto_dispo')}      cols={1} />
              <div className="col-span-1" />
              <Field         label="Dispo. Designación"           value={form.dispo_designacion}        onChange={set('dispo_designacion')}         cols={2} />
              <Field         label="Resolución Designación"       value={form.resolucion_designacion}   onChange={set('resolucion_designacion')}    cols={2} />
              <CheckField    label="Alta SIAL"                    value={form.alta_sial}                onChange={setBool('alta_sial')}             cols={1} />
              <Field         label="ID Cargo"                     value={form.id_cargo}                 onChange={set('id_cargo')}                  cols={1} />
            </div>
          </Section>

          {/* 4 — Datos de la Baja */}
          <Section title="Datos de la Baja / Ampliación">
            <div className="grid grid-cols-4 gap-3">
              <Field         label="EX Baja / Ampliación"   value={form.ex_baja}          onChange={set('ex_baja')}          cols={3} disabled={hasBajaLink} />
              <Field         label="Sigla"                  value={form.sigla}            onChange={set('sigla')}            cols={1} disabled={hasBajaLink} />
              <Field         label="Efector"                value={form.efector}          onChange={set('efector')}          cols={2} disabled={hasBajaLink} />
              <Field         label="Cargo (Código)"         value={form.cargo}            onChange={set('cargo')}            cols={1} disabled={hasBajaLink} />
              <Field         label="CUIL"                   value={form.cuil}             onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,11); setForm(p => ({...p, cuil: v})) }} placeholder="20123456789" cols={1} disabled={hasBajaLink} />
              <Field         label="Nombre y Apellido"      value={form.nombre_apellido_baja} onChange={set('nombre_apellido_baja')} cols={4} disabled={hasBajaLink} />
              <StyledSelectField label="Puesto Baja"        value={form.puesto_baja}      onChange={set('puesto_baja')}      options={OPCIONES_PUESTO_CEETPS_TODOS} cols={2} disabled={hasBajaLink && form.cambio_especialidad !== 'SI'} />
              <Field         label="Especialidad Baja"      value={form.especialidad_baja} onChange={set('especialidad_baja')} cols={2} disabled={hasBajaLink && form.cambio_especialidad !== 'SI'} />
              <CheckField    label="Solicitud de cambio"    value={form.cambio_especialidad === 'SI'} onChange={(e) => handleCambioEspecialidadChange({ target: { value: e.target.value ? 'SI' : 'NO' } })} cols={1} />
              {form.cambio_especialidad === 'SI'
                ? <Field label="Documentación de cambio" value={form.doc_cambio_especialidad} onChange={set('doc_cambio_especialidad')} cols={3} />
                : <div className="col-span-3" />
              }
              <DateMaskField label="Fecha de Baja / Ampl."  value={form.fecha_baja}       onChange={set('fecha_baja')}       cols={1} disabled={hasBajaLink} />
              <Field         label="Carga Horaria"          value={form.carga_horaria}    onChange={e => { const v = e.target.value.replace(/\D/g,'').slice(0,2); setForm(p => ({...p, carga_horaria: v})) }} cols={1} disabled={hasBajaLink} />
              <Field         label="Motivo de Baja"         value={form.motivo_baja}      onChange={set('motivo_baja')}      cols={2} disabled={hasBajaLink} />
              <Field         label="Doc. Respaldatoria"     value={form.doc_respaldatoria} onChange={set('doc_respaldatoria')} cols={4} disabled={hasBajaLink} />
            </div>
          </Section>

          {/* 5 — Observaciones */}
          <Section title="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={e => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
              rows={3}
              maxLength={1000}
              className="form-input text-sm w-full resize-none"
              placeholder="Notas u observaciones adicionales..."
            />
            <p className="text-xs text-gray-400 text-right mt-1">{(form.observaciones ?? '').length}/1000</p>
          </Section>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear seguimiento'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

// ─── Vista pipeline (solo-lectura) ────────────────────────────────────────────
function PipelineViewCeetps({ initial, onClose }) {
  const sections = [
    {
      title: 'Datos generales', bg: 'bg-teal-700',
      fields: [
        ['Usuario',          initial?.usuario],
        ['Categoría',        getCategoryLabel(initial?.codigo_registro)],
        ['Sigla',            initial?.sigla_efector],
        ['Descripción',      initial?.descr_efector],
        ['Estado Concurso',  initial?.estado_concurso],
      ]
    },
    {
      title: 'Concurso', bg: 'bg-purple-700',
      fields: [
        ['Tipif./Obra/Serv.',   initial?.tipificador_obra_servicio],
        ['Tipif. Origen',       initial?.tipificador_origen],
        ['Exp. Concurso',       initial?.expediente_concurso],
        ['F. Caratulación',     initial?.fecha_caratulacion],
        ['F. Autorización',     initial?.fecha_autorizacion],
        ['Puesto Solicitado',   initial?.puesto_solicitado],
        ['Dispo. Llamado',      initial?.dispo_llamado],
        ['F. IFACS',            initial?.fecha_ifacs],
        ['F. INSAL',            initial?.fecha_insal],
      ]
    },
    {
      title: 'Designación', bg: 'bg-emerald-700',
      fields: [
        ['Exp. Designación',  initial?.expediente_designacion],
        ['Puesto Designado',  initial?.puesto_designado],
        ['CUIL Designado',    initial?.cuil_designado],
        ['Nombre y Apellido', initial?.nombre_apellido_designado],
        ['Estado Apto',       initial?.estado_apto],
        ['N° Apto Médico',    initial?.numero_apto_medico],
        ['F. Proy. Dispo',    initial?.fecha_proyecto_dispo],
        ['Dispo. Designación', initial?.dispo_designacion],
        ['Resolución Desig.',  initial?.resolucion_designacion],
        ['Alta SIAL',         initial?.alta_sial ? 'Sí' : initial?.alta_sial === false ? 'No' : '—'],
        ['ID Cargo',          initial?.id_cargo],
      ]
    },
    {
      title: 'Baja', bg: 'bg-blue-700',
      fields: [
        ['EX Baja/Ampl.',   initial?.ex_baja],
        ['Sigla',           initial?.sigla],
        ['Efector',         initial?.efector],
        ['Cargo',           initial?.cargo],
        ['CUIL',            initial?.cuil],
        ['Nombre y Apellido', initial?.nombre_apellido_baja],
        ['Puesto Baja',     initial?.puesto_baja],
        ['Especialidad',    initial?.especialidad_baja],
        ['Fecha Baja',      initial?.fecha_baja],
        ['Carga Horaria',   initial?.carga_horaria],
        ['Motivo Baja',     initial?.motivo_baja],
        ['Doc. Respaldatoria', initial?.doc_respaldatoria],
      ]
    },
    {
      title: 'Observaciones', bg: 'bg-gray-600',
      fields: [['Obs.', initial?.observaciones]]
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 border-t-4 border-teal-500">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Seguimiento CEETPS #{initial?.id} — {getCategoryLabel(initial?.codigo_registro)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {initial?.nombre_apellido_baja || '—'} &middot; CUIL {initial?.cuil || '—'} &middot; {initial?.sigla_efector || '—'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex flex-col gap-2 px-5 py-5">
          {sections.map((sec) => (
            <div key={sec.title} className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <div className={`${sec.bg} flex items-center justify-center px-3 py-3 flex-none w-32`}>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest text-center leading-tight">{sec.title}</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-x-8 gap-y-0 px-4 py-2 bg-white">
                {sec.fields.map(([lbl, val]) => (
                  <div key={lbl} className="py-1.5 min-w-[120px]">
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
        <div className="flex justify-end px-6 py-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Componentes de formulario ────────────────────────────────────────────────

const COLORES_ESTADO_CEETPS = {
  'Sin Autorizar':              { bg: 'bg-gray-100',   text: 'text-gray-600',   ring: 'ring-gray-300'   },
  'Autorizado':                 { bg: 'bg-green-100',  text: 'text-green-700',  ring: 'ring-green-300'  },
  'Disposición de Llamado':     { bg: 'bg-blue-100',   text: 'text-blue-700',   ring: 'ring-blue-300'   },
  'IFACS':                      { bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-300' },
  'INSAL':                      { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-300' },
  'TAD':                        { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-300' },
  'Disposición de Designación': { bg: 'bg-amber-100',  text: 'text-amber-700',  ring: 'ring-amber-300'  },
  'Finalizado':                 { bg: 'bg-teal-100',   text: 'text-teal-700',   ring: 'ring-teal-300'   },
}

function EstadoConcursoField({ value }) {
  const c = value ? (COLORES_ESTADO_CEETPS[value] ?? { bg: 'bg-gray-100', text: 'text-gray-500', ring: 'ring-gray-200' }) : null
  return (
    <div className="col-span-2">
      <label className="block text-xs font-medium text-gray-600 mb-1">Estado concurso</label>
      <div className="form-input text-sm w-full flex items-center min-h-[38px] cursor-default">
        {c
          ? <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${c.bg} ${c.text} ${c.ring}`}>{value}</span>
          : <span className="text-gray-400">—</span>
        }
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder = '', type = 'text', cols = 1, disabled = false }) {
  const displayValue = disabled && !value ? '—' : (value ?? '')
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={displayValue} onChange={onChange} placeholder={placeholder} disabled={disabled}
        className={`form-input text-sm w-full${disabled ? ' cursor-default' : ''}`} />
    </div>
  )
}

// ─── StyledSelectField — mismo look del buscador, sin caja de búsqueda ───────
// (para selects con pocas opciones, donde no hace falta buscar)
function StyledSelectField({ label, value, onChange, options = [], cols = 1, disabled = false }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt) => {
    onChange({ target: { value: opt } })
    setOpen(false)
  }

  return (
    <div className={`col-span-${cols}`} ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setOpen(o => !o)}
          disabled={disabled}
          className={`form-input text-sm w-full text-left flex items-center justify-between gap-1 pr-7${disabled ? ' cursor-default' : ''}`}
        >
          {value ? (
            <span className="text-gray-900 truncate">{value}</span>
          ) : (
            <span className="text-gray-400">{disabled ? '—' : 'Seleccionar...'}</span>
          )}
          <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 absolute right-2 top-1/2 -translate-y-1/2 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-40 left-0 top-full mt-1 w-full max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {options.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin opciones</div>
              ) : options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt === value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DateMaskField({ label, value, onChange, cols = 1, disabled = false }) {
  const handleChange = (e) => {
    onChange({ target: { value: formatDateMask(e.target.value) } })
  }
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type="text" value={disabled && !value ? '—' : (value ?? '')} onChange={disabled ? undefined : handleChange}
        placeholder={disabled ? '' : 'dd/mm/aaaa'} maxLength={10} disabled={disabled}
        className={`form-input text-sm w-full font-mono${disabled ? ' cursor-default' : ''}`} />
    </div>
  )
}

function SiglaSearchField({ value, onChange, options = SIGLAS_DATA }) {
  const [query, setQuery] = useState('')
  const [open, setOpen]   = useState(false)
  const wrapRef           = useRef(null)
  const inputRef          = useRef(null)

  const selected = options.find(s => s.sigla === value)
  const filtered = query.trim()
    ? options.filter(s => s.sigla.toLowerCase().includes(query.toLowerCase()) || s.descr.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="col-span-1" ref={wrapRef}>
      <label className="block text-xs font-medium text-gray-600 mb-1">Sigla</label>
      <div className="relative">
        {!open ? (
          <button type="button" onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 30) }}
            className="form-input text-sm w-full text-left flex items-center justify-between gap-1 pr-7">
            {selected
              ? <span className="font-mono font-semibold text-primary-700">{selected.sigla}</span>
              : <span className="text-gray-400">Seleccionar...</span>}
            <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />
          </button>
        ) : (
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Buscar sigla o efector..." className="form-input text-sm w-full pl-8" />
          </div>
        )}
        {value && !open && (
          <button type="button" onClick={e => { e.stopPropagation(); onChange('') }}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-0.5 text-gray-300 hover:text-red-500 z-10">
            <XMarkIcon className="w-3 h-3" />
          </button>
        )}
        {open && (
          <div className="absolute z-40 left-0 top-full mt-1 w-[380px] max-w-[90vw] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-400 text-center">Sin resultados</div>
              ) : filtered.map(s => (
                <button key={s.sigla} type="button"
                  onClick={() => { onChange(s.sigla); setOpen(false); setQuery('') }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${s.sigla === value ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
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
