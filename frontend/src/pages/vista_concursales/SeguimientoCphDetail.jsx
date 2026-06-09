import { useState, useRef, useEffect, useCallback, createContext, useContext } from 'react'
import { XMarkIcon, ChevronDownIcon, ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { seguimientoApi, configApi } from '../../api/concursalesApi'
import { exportSeguimientoToPdf, exportSeguimientoToWord } from '../../utils/exportReport'
import { applyRules } from '../../utils/conjuntosRules'
import {
  calcSubEstado3, calcSubEstado, calcEstado, calcCambioEspecialidad, getColorEstadoCph,
  OPCIONES_USUARIOS, OPCIONES_ESPECIALIDADES, OPCIONES_ESCALAFON_SEGUIMIENTO, OPCIONES_ESCALAFON_BAJAS,
  OPCIONES_TIPO_EFECTOR, OPCIONES_DISPO_DESIERTA, OPCIONES_MOTIVO_BAJA,
  OPCIONES_UNIFICADOR_PUESTOS, OPCIONES_ORIGEN, SIGLAS_DATA,
  getPuestoOptions,
  getEspecialidadOptions,
  isoToDmy, dmyToIso,
} from '../../utils/concursalesHelpers'

/**
 * SeguimientoCphDetail — Modal de detalle y edición de un registro de seguimiento CPH.
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

export default function SeguimientoCphDetail({ initial, onSaved, onClose, readOnly = false }) {
  const isEdit = !!initial

  const [form, setForm] = useState({
    // 1. Datos de la baja
    ee_baja:           initial?.ee_baja           ?? '',
    cuil_baja:         initial?.cuil_baja         ?? '',
    nombre_baja:       initial?.nombre_baja        ?? '',
    fecha_baja:        isoToDmy(initial?.fecha_baja)        ?? '',
    escalafon_baja:    initial?.escalafon_baja     ?? '',
    escalafon_1:       initial?.escalafon_1        ?? '',
    puesto_1:          initial?.puesto_1          ?? '',
    especialidad_baja: initial?.especialidad_baja  ?? '',
    carga_horaria:     initial?.carga_horaria       ?? '',
    motivo_baja:       initial?.motivo_baja         ?? '',
    doc_respaldatoria: initial?.doc_respaldatoria   ?? '',
    fecha_pase_paralelo: isoToDmy(initial?.fecha_pase_paralelo) ?? '',
    partida_presupuestaria: initial?.partida_presupuestaria ?? '',
    unificador_puestos: initial?.unificador_puestos ?? '',
    // 2. Efector
    descr_efector:     initial?.descr_efector      ?? '',
    sigla_efector:     initial?.sigla_efector      ?? '',
    tipo_efector:      initial?.tipo_efector       ?? '',
    origen:            initial?.origen             ?? '',
    conjuntos:         initial?.conjuntos          ?? '',
    // 3. Estado
    estado:            initial?.estado            ?? '',
    sub_estado:        initial?.sub_estado         ?? '',
    sub_estado_3:      initial?.sub_estado_3       ?? '',
    cambio_especialidad: initial?.cambio_especialidad ?? 'NO',
    doc_cambio_especialidad: initial?.doc_cambio_especialidad ?? '',
    suspendido:        initial?.suspendido         ?? false,
    dispo_desierta:    initial?.dispo_desierta      ?? '',
    fecha_dispo_desierta: isoToDmy(initial?.fecha_dispo_desierta) ?? '',
    // 4. Concurso
    ee_concurso:           initial?.ee_concurso           ?? '',
    fecha_ee_concurso:     isoToDmy(initial?.fecha_ee_concurso)      ?? '',
    escalafon_2:           initial?.escalafon_2            ?? initial?.escalafon_1 ?? '',
    puesto_2:              initial?.puesto_2              ?? '',
    especialidad_solicitada: initial?.especialidad_solicitada ?? '',
    ccoo_especialidad:     initial?.ccoo_especialidad      ?? '',
    if_solicitante:        initial?.if_solicitante          ?? '',
    fecha_autorizacion:    isoToDmy(initial?.fecha_autorizacion)     ?? '',
    sorteo_jurado:         initial?.sorteo_jurado          ?? false,
    disposicion:           initial?.disposicion           ?? '',
    // 5. Inscripción
    fecha_insc_desde: isoToDmy(initial?.fecha_insc_desde) ?? '',
    fecha_insc_hasta: isoToDmy(initial?.fecha_insc_hasta) ?? '',
    q_inscriptos:     initial?.q_inscriptos     ?? '',
    // 6. Evaluación
    examen_publicado:   initial?.examen_publicado   ?? false,
    fecha_examen:       isoToDmy(initial?.fecha_examen)       ?? '',
    orden_merito:       initial?.orden_merito       ?? false,
    fecha_orden_merito: isoToDmy(initial?.fecha_orden_merito)  ?? '',
    // 7. Adjudicación
    fecha_ifacs: isoToDmy(initial?.fecha_ifacs) ?? '',
    insal:       initial?.insal       ?? false,
    fecha_insal: isoToDmy(initial?.fecha_insal) ?? '',
    // 8. Designación
    ee_designacion:       initial?.ee_designacion       ?? '',
    fecha_ee_designacion: isoToDmy(initial?.fecha_ee_designacion)  ?? '',
    nombre_designacion:   initial?.nombre_designacion    ?? '',
    cuil_designacion:     initial?.cuil_designacion      ?? '',
    carga_documentacion:  initial?.carga_documentacion   ?? false,
    fecha_apto_medico:    isoToDmy(initial?.fecha_apto_medico)     ?? '',
    fecha_ite:            isoToDmy(initial?.fecha_ite)             ?? '',
    reso_a_la_firma:       initial?.reso_a_la_firma        ?? false,
    proyecto_resolucion:   initial?.proyecto_resolucion    ?? false,
    resolucion_designacion: initial?.resolucion_designacion ?? '',
    fecha_resolucion:     isoToDmy(initial?.fecha_resolucion)      ?? '',
    fecha_cargo:          isoToDmy(initial?.fecha_cargo)           ?? '',
    cargo_sial:           initial?.cargo_sial            ?? false,
    // 9. Vinculación POU
    cargo:      initial?.cargo      ?? '',
    cargo_baja: initial?.cargo_baja ?? '',
    // 10. Observaciones
    observaciones: initial?.observaciones ?? '',
    // Usuario
    usuario: initial?.usuario ?? '',
    // Obra (solo lectura, viene desde la baja)
    obra: initial?.obra ?? false,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  // Reglas de autocompletado para el campo Conjuntos
  const [conjuntosRules, setConjuntosRules] = useState([])
  useEffect(() => {
    configApi.getConjuntos()
      .then(data => setConjuntosRules(data.rules ?? []))
      .catch(() => {})
  }, [])

  // Campos que disparan la evaluación de reglas
  const WATCHED_FIELDS = [
    'origen', 'tipo_efector', 'sigla_efector',
    'ee_baja', 'fecha_baja', 'escalafon_baja', 'escalafon_1', 'unificador_puestos',
    'puesto_1', 'especialidad_baja', 'motivo_baja',
    'ee_concurso', 'fecha_ee_concurso', 'escalafon_2', 'puesto_2', 'especialidad_solicitada',
    'fecha_autorizacion', 'sorteo_jurado', 'disposicion',
    'fecha_insc_desde', 'fecha_insc_hasta', 'q_inscriptos',
    'examen_publicado', 'fecha_examen', 'orden_merito', 'fecha_orden_merito',
    'fecha_ifacs', 'insal', 'fecha_insal',
    'ee_designacion', 'fecha_ee_designacion', 'carga_documentacion',
    'fecha_apto_medico', 'fecha_ite', 'reso_a_la_firma', 'proyecto_resolucion',
    'resolucion_designacion', 'fecha_resolucion', 'fecha_cargo', 'cargo_sial',
    'estado', 'sub_estado_3', 'suspendido', 'cambio_especialidad',
    'dispo_desierta', 'fecha_dispo_desierta',
    'usuario',
  ]
  const watchedSnapshot = WATCHED_FIELDS.map(f => form[f]).join('|')

  useEffect(() => {
    if (!conjuntosRules.length) return
    // Solo autorrellena si el campo está vacío
    if (form.conjuntos) return
    const suggested = applyRules(conjuntosRules, form)
    if (suggested !== null) {
      setForm(prev => ({ ...prev, conjuntos: suggested }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedSnapshot, conjuntosRules])

  const set = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const setBool = (field) => (e) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleOrigenChange = (e) => {
    const origen = e.target.value
    setForm(prev => ({
      ...prev,
      origen,
      ...(origen === 'Ampliación' ? {
        nombre_baja:           '',
        cuil_baja:             '',
        cargo_baja:            '',
        partida_presupuestaria: '',
      } : {})
    }))
  }

  const handleSiglaChange = (e) => {
    const sigla = e.target.value
    const found = SIGLAS_DATA.find(s => s.sigla === sigla)
    setForm(prev => ({
      ...prev,
      sigla_efector: sigla,
      descr_efector: found ? found.descr : prev.descr_efector,
      tipo_efector:  found ? found.tipo  : prev.tipo_efector,
    }))
  }

  const handleCambioEspecialidadChange = (e) => {
    const esCambio = e.target.value === 'SI'
    setForm(prev => ({
      ...prev,
      cambio_especialidad: e.target.value,
      // Si se desmarca el cambio, restaura a valores iniciales
      ...(esCambio ? {} : {
        puesto_2: prev.puesto_1,
        especialidad_solicitada: prev.especialidad_baja,
      })
    }))
  }

  // Auto-inicializar Puesto 2 y Especialidad Solicitada con Puesto 1 / Especialidad de Baja
  useEffect(() => {
    if (isEdit && form.puesto_1 && form.especialidad_baja) {
      setForm(prev => ({
        ...prev,
        puesto_2: prev.puesto_2 || prev.puesto_1,
        especialidad_solicitada: prev.especialidad_solicitada || prev.especialidad_baja,
      }))
    }
  }, [isEdit])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const payload = {}
    const DATE_FIELDS = [
      'fecha_baja', 'fecha_dispo_desierta', 'fecha_ee_concurso', 'fecha_autorizacion',
      'fecha_insc_desde', 'fecha_insc_hasta', 'fecha_examen', 'fecha_orden_merito',
      'fecha_ifacs', 'fecha_insal', 'fecha_ee_designacion', 'fecha_apto_medico',
      'fecha_ite', 'fecha_resolucion', 'fecha_cargo', 'fecha_pase_paralelo',
    ]
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
    if (payload.q_inscriptos) payload.q_inscriptos = parseInt(payload.q_inscriptos, 10) || null

    payload.estado              = calcEstado(form)
    payload.sub_estado          = calcSubEstado(form)
    payload.sub_estado_3        = calcSubEstado3(form)
    payload.cambio_especialidad = calcCambioEspecialidad(form)

    try {
      if (isEdit) {
        await seguimientoApi.update(initial.id, payload)
      } else {
        await seguimientoApi.create(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

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

  if (readOnly) return <PipelineViewSeguimiento initial={initial} onClose={onClose} />

  return (
    <OrigenContext.Provider value={form.origen}>
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-6xl my-8${origenBorderColor ? ` border-t-4 ${origenBorderColor}` : ''}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit
              ? `Seguimiento CPH #${initial.id} — ${initial.nombre_baja ?? ''}`
              : 'Nuevo seguimiento CPH'}
          </h2>
          <div className="flex items-center gap-2">
            {isEdit && <ExportDropdown onExport={fmt => fmt === 'pdf' ? exportSeguimientoToPdf(form) : exportSeguimientoToWord(form)} />}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`px-6 py-6 ${origenFormClass}`}>
          <fieldset disabled={readOnly} className="border-0 p-0 m-0 min-w-0 space-y-7">

            {/* 1 — Datos generales */}
            <Section title="Datos generales">
              <div className="grid grid-cols-4 gap-3">
                <SelectField label="Usuario"             value={form.usuario}       onChange={set('usuario')}       options={OPCIONES_USUARIOS} cols={1} />
                <SiglaSearchField value={form.sigla_efector} onChange={handleSiglaChange} />
                <SelectField label="Tipo efector"        value={form.tipo_efector}  onChange={set('tipo_efector')}  options={OPCIONES_TIPO_EFECTOR} cols={1} disabled={!!form.sigla_efector} />
                <Field       label="Descripción efector" value={form.descr_efector} onChange={set('descr_efector')} cols={1} disabled={!!form.sigla_efector} />
                <SelectField label="Origen"              value={form.origen}        onChange={handleOrigenChange}   options={OPCIONES_ORIGEN} cols={1} />
                <Field       label="Conjuntos"           value={form.conjuntos}     onChange={set('conjuntos')}     cols={1} />
                <Field       label="ID SIAL"             value={form.cargo_baja}    onChange={set('cargo_baja')}    cols={1} disabled={form.origen === 'Ampliación'} />
                {form.origen === 'Ampliación' && (
                  <div className="col-span-1 flex items-center gap-2 pt-5">
                    <input type="checkbox" checked={!!form.obra} disabled className="h-4 w-4 rounded border-gray-300 text-green-600 cursor-default" />
                    <span className="text-sm font-medium text-gray-500">Obra</span>
                    <span className="text-xs text-gray-400">(editá en Bajas)</span>
                  </div>
                )}
                <CalcField label="Estado"          value={calcEstado({ ...form })}              cols={1} title="SUSPENDIDO / FINALIZADO / ACTIVO / NO INICIADO" />
                <CalcField label="Sub-estado"      value={calcSubEstado({ ...form })}           cols={1} title="19 etapas del proceso concursal" />
                <CalcField label="Sub-estado 3"    value={calcSubEstado3({ ...form })}          cols={1} title="Estado resumido para filtros y color-coding" />
                <CalcField label="Cambio esp."     value={calcCambioEspecialidad({ ...form })}  cols={1} title="SI si especialidad baja ≠ especialidad solicitada" />
              </div>
            </Section>

            {/* 2 — Baja */}
            <Section title="Baja">
              <div className="grid grid-cols-4 gap-3">
                <Field         label="EE baja"                value={form.ee_baja}              onChange={set('ee_baja')}              cols={2} />
                <Field         label="CUIL baja"              value={form.cuil_baja}            onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setForm(prev => ({ ...prev, cuil_baja: v })) }}  placeholder="20123456789" cols={1} disabled={form.origen === 'Ampliación'} />
                <DateMaskField label="Fecha baja"             value={form.fecha_baja}           onChange={set('fecha_baja')}           cols={1} />
                <Field         label="Nombre baja"            value={form.nombre_baja}          onChange={set('nombre_baja')}          cols={4} disabled={form.origen === 'Ampliación'} />
                <SelectField   label="Escalafón"             value={form.escalafon_baja}       onChange={set('escalafon_baja')}       options={OPCIONES_ESCALAFON_BAJAS} cols={1} />
                <SelectField   label="POU/POF"                value={form.escalafon_1}          onChange={set('escalafon_1')}          options={OPCIONES_ESCALAFON_SEGUIMIENTO} cols={1} disabled={!!initial?.escalafon_1} />
                <SelectField   label="Unificador puestos"    value={form.unificador_puestos}   onChange={set('unificador_puestos')}   options={OPCIONES_UNIFICADOR_PUESTOS} cols={2} />
                <SelectField   label="Puesto 1"               value={form.puesto_1}             onChange={set('puesto_1')}             options={getPuestoOptions(form.escalafon_1, form.escalafon_baja)} cols={2} />
                <SelectField   label="Especialidad baja"      value={form.especialidad_baja}    onChange={set('especialidad_baja')}    options={getEspecialidadOptions(form.puesto_1, form.escalafon_baja)} cols={2} />
                <Field         label="Carga horaria"          value={form.carga_horaria}        onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setForm(prev => ({ ...prev, carga_horaria: v })) }} cols={1} />
                <SelectField   label="Motivo de baja"         value={form.motivo_baja}          onChange={set('motivo_baja')}          options={OPCIONES_MOTIVO_BAJA} cols={1} />
                <Field         label="Doc. respaldatoria"     value={form.doc_respaldatoria}    onChange={set('doc_respaldatoria')}    cols={2} />
                <DateMaskField label="Fecha pase paralelo/GT" value={form.fecha_pase_paralelo}  onChange={set('fecha_pase_paralelo')}  cols={1} />
                <Field         label="Partida presupuestaria" value={form.partida_presupuestaria} onChange={set('partida_presupuestaria')} cols={3} disabled={form.origen === 'Ampliación'} />
              </div>
            </Section>

            {/* 3 — Concurso */}
            <Section title="Concurso">
              <div className="grid grid-cols-4 gap-3">
                {/* Expediente y autorización */}
                <ExEEField     label="EE concurso"              value={form.ee_concurso}             onChange={set('ee_concurso')}             cols={4} />
                <DateMaskField label="Fecha EE concurso"        value={form.fecha_ee_concurso}        onChange={set('fecha_ee_concurso')}       cols={1} />
                <Field         label="CCOO especialidad"        value={form.ccoo_especialidad}        onChange={set('ccoo_especialidad')}       cols={2} />
                <Field         label="IF autorización vacante"  value={form.if_solicitante}           onChange={set('if_solicitante')}          cols={1} />
                
                {/* Puesto 2 + Fecha autorización */}
                <SelectField   label="POU/POF 2"               value={form.escalafon_2}              onChange={set('escalafon_2')}             options={OPCIONES_ESCALAFON_SEGUIMIENTO} cols={1} disabled={!!initial?.escalafon_1} />
                <SelectField   label="Puesto 2"                value={form.puesto_2}                 onChange={set('puesto_2')}                options={getPuestoOptions(form.escalafon_2, '')} cols={2} disabled={form.cambio_especialidad !== 'SI'} />
                <DateMaskField label="Fecha autorización"      value={form.fecha_autorizacion}       onChange={set('fecha_autorizacion')}      cols={1} />

                {/* Especialidad solicitada → Cambio de Especialidad → Sorteo */}
                <SelectField   label="Especialidad solicitada" value={form.especialidad_solicitada}  onChange={set('especialidad_solicitada')} options={OPCIONES_ESPECIALIDADES} cols={2} disabled={form.cambio_especialidad !== 'SI'} />
                <CheckField    label="Solicitud de cambio"     value={form.cambio_especialidad === 'SI'} onChange={(e) => handleCambioEspecialidadChange({ target: { value: e.target.value ? 'SI' : 'NO' } })} cols={1} />
                <CheckField    label="Sorteo jurado"           value={form.sorteo_jurado}            onChange={setBool('sorteo_jurado')}       cols={1} />

                {/* Doc cambio esp. (sólo si SI) + Disposición */}
                {form.cambio_especialidad === 'SI' ? (
                  <>
                    <Field label="Documentación de cambio" value={form.doc_cambio_especialidad} onChange={set('doc_cambio_especialidad')} cols={2} />
                    <Field label="Disposición"      value={form.disposicion}              onChange={set('disposicion')}             cols={2} />
                  </>
                ) : (
                  <Field label="Disposición"        value={form.disposicion}              onChange={set('disposicion')}             cols={4} />
                )}
                {/* Inscripción */}
                <DateMaskField label="Fecha insc. desde"  value={form.fecha_insc_desde}   onChange={set('fecha_insc_desde')}   cols={1} />
                <DateMaskField label="Fecha insc. hasta"  value={form.fecha_insc_hasta}   onChange={set('fecha_insc_hasta')}   cols={1} />
                <Field         label="Cant. inscriptos"   value={form.q_inscriptos}       onChange={set('q_inscriptos')}       type="number" cols={1} />
                <DateMaskField label="Fecha INSAL"        value={form.fecha_insal}        onChange={set('fecha_insal')}        cols={1} />
                {/* Evaluación */}
                <CheckField    label="Examen publicado"   value={form.examen_publicado}   onChange={setBool('examen_publicado')}   cols={1} />
                <DateMaskField label="Fecha examen"       value={form.fecha_examen}       onChange={set('fecha_examen')}           cols={1} />
                <CheckField    label="Orden de mérito"   value={form.orden_merito}       onChange={setBool('orden_merito')}       cols={1} />
                <DateMaskField label="F. orden de mérito" value={form.fecha_orden_merito} onChange={set('fecha_orden_merito')}     cols={1} />
                {/* Adjudicación */}
                <DateMaskField label="Fecha IFACS"        value={form.fecha_ifacs}        onChange={set('fecha_ifacs')}            cols={1} />
                <CheckField    label="INSAL"              value={form.insal}              onChange={setBool('insal')}              cols={1} />
                <div className="col-span-2" />
              </div>
            </Section>

            {/* 4 — Designación */}
            <Section title="Designación">
              <div className="grid grid-cols-4 gap-3">
                <Field         label="EE designación"          value={form.ee_designacion}         onChange={set('ee_designacion')}          cols={1} />
                <DateMaskField label="Fecha EE designación"    value={form.fecha_ee_designacion}   onChange={set('fecha_ee_designacion')}    cols={1} />
                <Field         label="Nombre designación"      value={form.nombre_designacion}     onChange={set('nombre_designacion')}      cols={1} />
                <Field         label="CUIL designación"        value={form.cuil_designacion}       onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setForm(prev => ({ ...prev, cuil_designacion: v })) }}  placeholder="20123456789" cols={1} />
                {/* Fechas clave */}
                <DateMaskField label="Fecha apto médico"      value={form.fecha_apto_medico}      onChange={set('fecha_apto_medico')}       cols={1} />
                <DateMaskField label="Fecha ITE"               value={form.fecha_ite}              onChange={set('fecha_ite')}               cols={1} />
                <DateMaskField label="Fecha resolución"       value={form.fecha_resolucion}       onChange={set('fecha_resolucion')}        cols={1} />
                <DateMaskField label="Fecha cargo"             value={form.fecha_cargo}            onChange={set('fecha_cargo')}             cols={1} />
                {/* Resolución */}
                <Field         label="Resolución designación" value={form.resolucion_designacion} onChange={set('resolucion_designacion')}  cols={4} />
                {/* Checks — todos juntos en fila */}
                <CheckField    label="Carga doc."               value={form.carga_documentacion}    onChange={setBool('carga_documentacion')} cols={1} />
                <CheckField    label="Reso. a la firma"         value={form.reso_a_la_firma}        onChange={setBool('reso_a_la_firma')}     cols={1} />
                <CheckField    label="Proyecto resolución"     value={form.proyecto_resolucion}    onChange={setBool('proyecto_resolucion')} cols={1} />
                <CheckField    label="Cargo SIAL"               value={form.cargo_sial}             onChange={setBool('cargo_sial')}          cols={1} />
                {/* Suspensión y desierta */}
                <CheckField    label="Suspendido"               value={form.suspendido}             onChange={setBool('suspendido')}          cols={1} />
                <SelectField   label="Dispo. desierta"          value={form.dispo_desierta}         onChange={set('dispo_desierta')}          options={OPCIONES_DISPO_DESIERTA} cols={1} />
                <DateMaskField label="Fecha dispo. desierta"    value={form.fecha_dispo_desierta}   onChange={set('fecha_dispo_desierta')}    cols={1} />
                <div className="col-span-1" />
              </div>
            </Section>

            {/* 5 — Observaciones */}
            <Section title="Observaciones">
              <textarea
                value={form.observaciones}
                onChange={e => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
                rows={4}
                maxLength={1000}
                className="form-input text-sm w-full resize-none"
                placeholder="Notas u observaciones adicionales..."
              />
              <p className="text-xs text-gray-400 text-right mt-1">{(form.observaciones ?? '').length}/1000</p>
            </Section>

          </fieldset>

          {/* Error */}
          {error && (
            <div className="mt-6 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear seguimiento'}
            </button>
          </div>

        </form>
      </div>
    </div>
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function SelectField({ label, value, onChange, cols = 1, options, children, disabled = false }) {
  const origen = useContext(OrigenContext)
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select value={value ?? ''} onChange={onChange} disabled={disabled} style={getOrigenBgStyle(origen, !!value)} className={`form-input text-sm w-full${disabled ? ' cursor-default' : ''}`}>
        {options ? (
          <>
            <option value="">Seleccionar...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </>
        ) : children}
      </select>
    </div>
  )
}

/** Checkbox visualmente consistente con Field/SelectField (label arriba, control abajo) */
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

function DateMaskField({ label, value, onChange, cols = 1, disabled = false }) {
  const origen = useContext(OrigenContext)
  const handleChange = (e) => {
    let v = e.target.value.replace(/[^\d]/g, '')
    if (v.length > 2) v = v.slice(0, 2) + '-' + v.slice(2)
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5)
    if (v.length > 10) v = v.slice(0, 10)
    onChange({ target: { value: v } })
  }
  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={handleChange}
        placeholder="dd-mm-aaaa"
        maxLength={10}
        disabled={disabled}
        style={getOrigenBgStyle(origen, value?.length === 10)}
        className={`form-input text-sm w-full font-mono${disabled ? ' cursor-default' : ''}`}
      />
    </div>
  )
}

function ExEEField({ label, value, onChange, cols = 3 }) {
  const origen = useContext(OrigenContext)
  const currentYear = String(new Date().getFullYear())

  const parseEX = (v) => {
    const m = (v || '').match(/^EX-(\d{4})-(\d*)- -GCABA-(.{0,5})$/)
    return m ? { year: m[1], num: m[2], sigla: m[3] } : { year: currentYear, num: '', sigla: '' }
  }

  const [exP, setExP] = useState(() => parseEX(value))

  const buildEX = (p) => `EX-${p.year}-${p.num}- -GCABA-${p.sigla}`
  const emitEX  = (p) => onChange({ target: { value: buildEX(p) } })
  const updEX   = (field, v) => { const p = { ...exP, [field]: v }; setExP(p); emitEX(p) }

  const iBgStyle = getOrigenBgStyle(origen)
  const iCls = 'rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center font-mono'

  return (
    <div className={`col-span-${cols}`}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-1.5 font-mono text-sm flex-nowrap">
        <span className="text-gray-400 select-none">EX-</span>
        <input value={exP.year}  onChange={e => updEX('year',  e.target.value.replace(/\D/g,'').slice(0,4))} style={{ ...iBgStyle, width: '3.5rem' }} className={iCls} maxLength={4} placeholder="AAAA" />
        <span className="text-gray-400 select-none">-</span>
        <input value={exP.num}   onChange={e => updEX('num',   e.target.value.replace(/\D/g,'').slice(0,8))} style={{ ...iBgStyle, width: '7.5rem' }} className={iCls} maxLength={8} placeholder="00000000" />
        <span className="text-gray-400 select-none">-&nbsp;-GCABA-</span>
        <input value={exP.sigla} onChange={e => updEX('sigla', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5))} style={{ ...iBgStyle, width: '4rem' }} className={iCls} maxLength={5} placeholder="XXXXX" />
      </div>
      {value && <p className="mt-1 text-xs text-gray-400 font-mono">{value}</p>}
    </div>
  )
}

function CalcField({ label, value, cols = 1, title = '' }) {
  const colors = getColorEstadoCph(value)
  const hasColor = value && colors.bg !== '#F5F5F5'
  return (
    <div className={`col-span-${cols}`} title={title}>
      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
        {label}
        <span className="text-gray-400 text-[10px] font-normal">(auto)</span>
      </label>
      <div
        className="text-sm px-2.5 py-1.5 rounded border border-dashed border-gray-300 bg-gray-50/80 min-h-[34px] flex items-center overflow-hidden"
        style={hasColor ? { backgroundColor: colors.bg, color: colors.text, borderColor: colors.ring } : {}}
        title={value || ''}
      >
        <span className={`font-medium truncate ${hasColor ? '' : 'text-gray-500'}`}>{value || '—'}</span>
      </div>
    </div>
  )
}

// ─── Vista pipeline (solo-lectura) ────────────────────────────────────────────
function PipelineViewSeguimiento({ initial, onClose }) {
  const b = v => v ? 'Sí' : 'No'
  const sections = [
    {
      title: 'Datos generales', bg: 'bg-indigo-700',
      fields: [
        ['Usuario',          initial?.usuario],
        ['Sigla',            initial?.sigla_efector],
        ['Descripción',      initial?.descr_efector],
        ['Tipo efector',     initial?.tipo_efector],
        ['Origen',           initial?.origen],
        ['Conjuntos',        initial?.conjuntos],
        ['Estado',           initial?.estado],
        ['Sub-estado',       initial?.sub_estado],
        ['Sub-estado 3',     initial?.sub_estado_3],
        ['Cambio esp.',      initial?.cambio_especialidad],
        ['ID SIAL',          initial?.cargo_baja],
      ]
    },
    {
      title: 'Baja', bg: 'bg-blue-700',
      fields: [
        ['EE baja',           initial?.ee_baja],
        ['CUIL',              initial?.cuil_baja],
        ['Nombre',            initial?.nombre_baja],
        ['Fecha baja',        initial?.fecha_baja],
        ['Escalafón',         initial?.escalafon_baja],
        ['POU/POF',           initial?.escalafon_1],
        ['Unificador puestos', initial?.unificador_puestos],
        ['Puesto 1',          initial?.puesto_1],
        ['Especialidad baja', initial?.especialidad_baja],
        ['Carga horaria',     initial?.carga_horaria],
        ['Motivo baja',       initial?.motivo_baja],
        ['Doc. respaldatoria', initial?.doc_respaldatoria],
        ['F. pase paralelo',  initial?.fecha_pase_paralelo],
        ['Partida presup.',   initial?.partida_presupuestaria],
      ]
    },
    {
      title: 'Concurso', bg: 'bg-purple-700',
      fields: [
        ['EE concurso',              initial?.ee_concurso],
        ['F. EE concurso',           initial?.fecha_ee_concurso],
        ['CCOO esp.',                initial?.ccoo_especialidad],
        ['IF autorización vacante',  initial?.if_solicitante],
        ['POU/POF 2',                initial?.escalafon_2],
        ['Puesto 2',                 initial?.puesto_2],
        ['Esp. solicitada',          initial?.especialidad_solicitada],
        ['F. autorización',          initial?.fecha_autorizacion],
        ['Sorteo jurado',            b(initial?.sorteo_jurado)],
        ['Disposición',              initial?.disposicion],
      ]
    },
    {
      title: 'Inscripción', bg: 'bg-teal-700',
      fields: [
        ['F. desde',      initial?.fecha_insc_desde],
        ['F. hasta',      initial?.fecha_insc_hasta],
        ['Q. inscriptos', initial?.q_inscriptos],
      ]
    },
    {
      title: 'Evaluación', bg: 'bg-cyan-700',
      fields: [
        ['Examen pub.',      b(initial?.examen_publicado)],
        ['F. examen',        initial?.fecha_examen],
        ['Orden mérito',     b(initial?.orden_merito)],
        ['F. orden mérito',  initial?.fecha_orden_merito],
      ]
    },
    {
      title: 'Adjudicación', bg: 'bg-sky-700',
      fields: [
        ['F. IFACS', initial?.fecha_ifacs],
        ['INSAL',    b(initial?.insal)],
        ['F. INSAL', initial?.fecha_insal],
      ]
    },
    {
      title: 'Designación', bg: 'bg-emerald-700',
      fields: [
        ['EE designación',     initial?.ee_designacion],
        ['F. EE desig.',        initial?.fecha_ee_designacion],
        ['Nombre desig.',       initial?.nombre_designacion],
        ['CUIL desig.',         initial?.cuil_designacion],
        ['Carga doc.',          b(initial?.carga_documentacion)],
        ['F. apto médico',     initial?.fecha_apto_medico],
        ['F. ITE',              initial?.fecha_ite],
        ['Reso. a la firma',    b(initial?.reso_a_la_firma)],
        ['Proy. resolución',   b(initial?.proyecto_resolucion)],
        ['Reso. designación',   initial?.resolucion_designacion],
        ['F. resolución',       initial?.fecha_resolucion],
        ['F. cargo',            initial?.fecha_cargo],
        ['Cargo SIAL',          b(initial?.cargo_sial)],
        ['Suspendido',          b(initial?.suspendido)],
        ['Dispo. desierta',     initial?.dispo_desierta],
        ['F. dispo. desierta',  initial?.fecha_dispo_desierta],
      ]
    },
    {
      title: 'Observaciones', bg: 'bg-gray-600',
      fields: [
        ['Obs.', initial?.observaciones],
      ]
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Seguimiento CPH #{initial?.id}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {initial?.nombre_baja || '—'} &middot; CUIL {initial?.cuil_baja || '—'} &middot; {initial?.sigla_efector || '—'} &middot; <span className="font-medium">{initial?.origen || '—'}</span>
            </p>
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
        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
