import { useState, useRef, useEffect, useMemo, useContext } from 'react'
import { XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
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
  SIGLAS_POR_USUARIO_BAJAS,
  getPuestoOptions,
  getEspecialidadOptions,
  CEETPS_ESCALAFON_POR_CODIGO,
  CEETPS_UNIFICADOR_POR_CODIGO,
  getCeetpsPuestoOptions,
  isoToDmy,
  dmyToIso,
} from '../../utils/concursalesHelpers'
import {
  OrigenContext,
  getOrigenBgStyle,
  Section,
  Field,
  StyledSelectField,
  SearchSelectField,
  SiglaSearchField,
  DateMaskField,
  CheckField,
  ExportDropdown,
} from '../../components/ui/ConcursalesFormFields'

/**
 * BajaForm - Modal para crear o editar una Baja Consolidada.
 * Props:
 *   initial   {object|null}  null = crear, objeto = editar
 *   onSaved   {Function}     Callback tras guardar exitosamente
 *   onClose   {Function}     Callback para cerrar el modal
 */

export default function BajaForm({ initial, onSaved, onClose, readOnly = false, lockedOrigen }) {
  const isEdit = !!initial

  const opcionesOrigen = OPCIONES_ORIGEN

  const OPCIONES_CODIGO = ['37', '23', '87', '85', '83']

  // Para inicializar correctamente los campos CEETPS y código 23 al cargar un registro existente
  const initCodigoNum  = Number(initial?.codigo_registro ?? 37)
  const initEsCeetps   = [87, 85, 83].includes(initCodigoNum)
  const initEsCodigo23 = initCodigoNum === 23

  const [form, setForm] = useState({
    usuario:               initial?.usuario               ?? '',
    origen:                initial?.origen                ?? lockedOrigen ?? '',
    ex_baja:               initial?.ex_baja               ?? '',
    sigla:                 initial?.sigla                 ?? '',
    efector:               initial?.efector               ?? '',
    tipo_efector:          initial?.tipo_efector           ?? '',
    codigo_cargo:          initial?.codigo_cargo           ?? '',
    cuil:                  initial?.cuil                  ?? '',
    nombre_apellido:       initial?.nombre_apellido        ?? '',
    codigo_registro:       initial?.codigo_registro ?? '',
    unificador_puestos:    initEsCeetps ? (CEETPS_UNIFICADOR_POR_CODIGO[initCodigoNum] ?? '') : initEsCodigo23 ? 'Suplente de Guardia' : (initial?.unificador_puestos ?? ''),
    escalafon:             initEsCeetps ? (CEETPS_ESCALAFON_POR_CODIGO[initCodigoNum] ?? '') : (initial?.escalafon ?? ''),
    pou_pof:               initEsCodigo23 ? 'POU' : (initial?.pou_pof ?? ''),
    puesto_baja:           initial?.puesto_baja            ?? '',
    especialidad_baja:     initEsCeetps ? ''                                            : (initial?.especialidad_baja ?? ''),
    partida_presupuestaria:initial?.partida_presupuestaria ?? '',
    fecha_baja:            isoToDmy(initial?.fecha_baja)  ?? '',
    carga_horaria:         initial?.carga_horaria          ?? '',
    motivo_baja:           (initial?.origen ?? lockedOrigen) === 'Cobertura Dotación' ? 'Cobertura Dotación' : (initial?.origen ?? lockedOrigen) === 'Ampliación' ? 'Ampliación' : (initial?.origen ?? lockedOrigen) === 'POU a POF' ? 'POU a POF' : (initial?.motivo_baja ?? ''),
    doc_respaldatoria:     (initial?.origen ?? lockedOrigen) === 'Cobertura Dotación' ? '' : (initial?.doc_respaldatoria ?? ''),
    fecha_pase_paralelo:   isoToDmy(initial?.fecha_pase_paralelo) ?? '',
    genera_concurso:       initial?.genera_concurso        ?? '',
    cargo_baja:            initial?.cargo_baja             ?? '',
    obra:                  initial?.obra                   ?? false,
    expediente_concurso:   initial?.expediente_concurso    ?? '',
    fecha_caratulacion:    isoToDmy(initial?.fecha_caratulacion) ?? '',
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
        codigo_cargo:           '',
        partida_presupuestaria: '',
        pou_pof:                'POF',
        motivo_baja:            'Ampliación',
      }),
      ...(origen === 'Cobertura Dotación' && {
        nombre_apellido:        '',
        cuil:                   '',
        cargo_baja:             '',
        partida_presupuestaria: '',
        pou_pof:                'POU',
        motivo_baja:            'Cobertura Dotación',
        doc_respaldatoria:      '',
        ...([87, 85, 83].includes(Number(prev.codigo_registro)) && {
          codigo_registro:    '',
          unificador_puestos: '',
          escalafon:          '',
          puesto_baja:        '',
          especialidad_baja:  '',
        }),
        ...(Number(prev.codigo_registro) === 37 && {
          unificador_puestos: 'CPH de Guardia',
        }),
      }),
      ...(origen === 'POU a POF' && {
        motivo_baja: 'POU a POF',
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

  // Siglas habilitadas según el usuario que hace la carga (null = todas)
  const allowedSiglas = useMemo(() => {
    const allowed = SIGLAS_POR_USUARIO_BAJAS[form.usuario]
    if (!allowed) return SIGLAS_DATA
    return SIGLAS_DATA.filter(s => allowed.includes(s.sigla))
  }, [form.usuario])

  useEffect(() => {
    const allowed = SIGLAS_POR_USUARIO_BAJAS[form.usuario]
    if (!allowed) return
    if (form.sigla && !allowed.includes(form.sigla)) {
      setForm(prev => ({ ...prev, sigla: '', efector: '', tipo_efector: '' }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.usuario])

  // ── Cascade: Unificador → Escalafón → POU/POF → Puesto → Especialidad ──────
  const handleUnificadorChange = (e) => {
    const unificador = e.target.value
    // Si el origen ya fuerza un valor en POU/POF, respetarlo; sino, auto-setear
    // (excepto "Jefaturas" en Cobertura Dotación, que se comporta como en Alta por Baja)
    const origenLockedPouPof =
      form.origen === 'Cobertura Dotación' && unificador !== 'Jefaturas' ? 'POU' :
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
    const puesto_baja = e.target.value
    const esProfesionalGuardiaMedico = puesto_baja.trim().toUpperCase() === 'PROFESIONAL GUARDIA MEDICO'
    setForm(prev => ({
      ...prev,
      puesto_baja,
      especialidad_baja: esProfesionalGuardiaMedico ? 'SIN ESPECIALIDAD' : '',
    }))
  }

  // Ref para detectar cambios REALES en codigo_registro (evita ejecutarse en mount)
  const prevCodigoRef = useRef(form.codigo_registro)

  useEffect(() => {
    const prevCodigo = Number(prevCodigoRef.current)
    const currCodigo = Number(form.codigo_registro)
    prevCodigoRef.current = form.codigo_registro

    if (prevCodigo === currCodigo) return // sin cambio real

    const esCeetpsCode   = [87, 85, 83].includes(currCodigo)
    const esCodigo23Code = currCodigo === 23
    const esCodigo37CoberturaCode = currCodigo === 37 && form.origen === 'Cobertura Dotación'
    if (esCeetpsCode) {
      setForm(f => ({
        ...f,
        unificador_puestos: CEETPS_UNIFICADOR_POR_CODIGO[currCodigo] ?? '',
        escalafon:          CEETPS_ESCALAFON_POR_CODIGO[currCodigo] ?? '',
        pou_pof:            'POF',
        puesto_baja:        '',
        especialidad_baja:  '',
      }))
    } else if (esCodigo23Code) {
      setForm(f => ({
        ...f,
        unificador_puestos: 'Suplente de Guardia',
        pou_pof:            'POU',
        escalafon:          '',
        puesto_baja:        '',
        especialidad_baja:  '',
      }))
    } else if (esCodigo37CoberturaCode) {
      setForm(f => ({
        ...f,
        unificador_puestos: 'CPH de Guardia',
        pou_pof:            'POU',
        escalafon:          '',
        puesto_baja:        '',
        especialidad_baja:  '',
      }))
    } else if ([87, 85, 83, 23].includes(prevCodigo)) {
      // Vuelve a otro código desde CEETPS o código 23 → resetear
      setForm(f => ({
        ...f,
        unificador_puestos: '',
        escalafon:          '',
        pou_pof:            '',
        puesto_baja:        '',
        especialidad_baja:  '',
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.codigo_registro])

  const codigoNum   = Number(form.codigo_registro)
  const esCeetps    = [87, 85, 83].includes(codigoNum)
  const esCodigo23  = codigoNum === 23
  const esCod37Cobertura = codigoNum === 37 && form.origen === 'Cobertura Dotación'
  const esProfesionalGuardiaMedico = (form.puesto_baja || '').trim().toUpperCase() === 'PROFESIONAL GUARDIA MEDICO'

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
    { key: 'cargo_baja',             label: 'ID SIAL' },
    { key: 'cuil',                   label: 'CUIL' },
    { key: 'nombre_apellido',        label: 'Nombre y Apellido' },
    { key: 'unificador_puestos',     label: 'Unificador de puestos' },
    { key: 'escalafon',              label: 'Escalafón' },
    { key: 'pou_pof',                label: 'POU/POF' },
    { key: 'puesto_baja',            label: form.origen === 'Ampliación' ? 'Puesto Ampliación' : 'Puesto baja' },
    { key: 'especialidad_baja',      label: 'Especialidad baja' },
    { key: 'partida_presupuestaria', label: 'Partida presupuestaria' },
    { key: 'fecha_baja',             label: 'Fecha de baja' },
    { key: 'carga_horaria',          label: 'Carga horaria' },
    { key: 'motivo_baja',            label: 'Motivo de baja' },
    { key: 'doc_respaldatoria',      label: 'Doc. respaldatoria' },
    { key: 'fecha_pase_paralelo',    label: 'Fecha pase paralelo/GT' },
    { key: 'genera_concurso',        label: 'Genera concurso' },
    { key: 'fecha_caratulacion',     label: 'Fecha Caratulación' },
    { key: 'expediente_concurso',    label: 'Expediente Concurso' },
  ]

  const buildPayload = () => {
    const payload = {}
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'boolean') {
        payload[k] = v
      } else if (v === '') {
        payload[k] = null
      } else if (k === 'fecha_baja' || k === 'fecha_pase_paralelo' || k === 'fecha_caratulacion') {
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
    let validationFields = esCeetps
      ? CAMPOS_VALIDACION.filter(f => f.key !== 'pou_pof' && f.key !== 'especialidad_baja')
      : CAMPOS_VALIDACION
    // Campos bloqueados (sin valor posible) según el origen: no tiene sentido pedirlos
    if (form.origen === 'Ampliación') {
      const bloqueados = ['codigo_cargo', 'cargo_baja', 'cuil', 'nombre_apellido', 'partida_presupuestaria']
      validationFields = validationFields.filter(f => !bloqueados.includes(f.key))
    }
    if (form.origen === 'Cobertura Dotación') {
      const bloqueados = ['cargo_baja', 'cuil', 'nombre_apellido', 'partida_presupuestaria', 'doc_respaldatoria']
      validationFields = validationFields.filter(f => !bloqueados.includes(f.key))
    }
    if (form.origen !== 'Ampliación' || form.genera_concurso !== 'SI') {
      validationFields = validationFields.filter(f => f.key !== 'fecha_caratulacion')
    }
    if (form.genera_concurso !== 'SI') {
      validationFields = validationFields.filter(f => f.key !== 'expediente_concurso')
    }
    const emptyFields = validationFields
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
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto">
      <div className={`bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8${origenBorderColor ? ` border-t-4 ${origenBorderColor}` : ''}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEdit ? 'Editar baja' : 'Nueva baja consolidada'}
            </h2>
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
              <StyledSelectField label="Usuario" value={form.usuario} onChange={set('usuario')} options={OPCIONES_USUARIOS} cols={1} />
              <StyledSelectField label="Origen"  value={form.origen}  onChange={handleOrigenChange} options={opcionesOrigen} cols={1} disabled={!!lockedOrigen} />
              <ExBajaField value={form.ex_baja} onChange={set('ex_baja')} onSiglaMatch={sigla => handleSiglaChange({ target: { value: sigla } })} cols={2} />
            </div>
          </Section>

          {/* 2 — Efector */}
          <Section title="Efector">
            <div className="grid grid-cols-4 gap-3">
              <SiglaSearchField value={form.sigla} onChange={handleSiglaChange} options={allowedSiglas} />
              <Field       label="Efector"           value={form.efector}      onChange={set('efector')}       disabled={!!form.sigla}          cols={2} />
              <StyledSelectField label="Tipo de efector"   value={form.tipo_efector} onChange={set('tipo_efector')}  options={OPCIONES_TIPO_EFECTOR}  cols={1} disabled={!!form.sigla} />
            </div>
          </Section>

          {/* 3 — Datos funcionales */}
          <Section title="Datos funcionales">
            <div className="grid grid-cols-4 gap-3">
              <Field        label="Codigo cargo"           value={form.codigo_cargo}           onChange={set('codigo_cargo')}           cols={1} disabled={form.origen === 'Ampliación'} />
              <Field        label="ID SIAL"                value={form.cargo_baja}              onChange={set('cargo_baja')}             cols={1} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
              <Field        label="CUIL"                   value={form.cuil}                   onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); setForm(prev => ({ ...prev, cuil: v })) }}  placeholder="20123456789" cols={1} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
              <Field        label="Nombre y Apellido"      value={form.nombre_apellido}         onChange={set('nombre_apellido')}        cols={2} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
              <StyledSelectField  label="Código de registro"     value={String(form.codigo_registro)} onChange={set('codigo_registro')} options={form.origen === 'Cobertura Dotación' ? ['37', '23'] : OPCIONES_CODIGO} cols={1} />
              <StyledSelectField  label="Unificador de puestos"  value={form.unificador_puestos}     onChange={handleUnificadorChange}        options={esCeetps ? [CEETPS_UNIFICADOR_POR_CODIGO[codigoNum]].filter(Boolean) : esCodigo23 ? ['Suplente de Guardia'] : esCod37Cobertura ? ['CPH de Guardia', 'Jefaturas'] : OPCIONES_UNIFICADOR_PUESTOS} cols={1} disabled={esCeetps || esCodigo23} />
              <StyledSelectField  label="Escalafon"              value={form.escalafon}              onChange={handleEscalafonBajaChange}     options={esCeetps ? [form.escalafon].filter(Boolean) : OPCIONES_ESCALAFON_BAJAS} cols={1} disabled={esCeetps || !form.unificador_puestos} />
              <StyledSelectField  label="POU/POF"                value={form.pou_pof}                onChange={handlePouPofChange}             options={(esCodigo23 || (esCod37Cobertura && form.unificador_puestos !== 'Jefaturas')) ? ['POU'] : OPCIONES_ESCALAFON_SEGUIMIENTO} cols={1} disabled={esCeetps || esCodigo23 || (form.origen === 'Cobertura Dotación' && form.unificador_puestos !== 'Jefaturas') || form.unificador_puestos === 'CPH de Guardia' || form.unificador_puestos === 'CPH de Planta' || !form.escalafon} />
              <SearchSelectField  label={form.origen === 'Ampliación' ? 'Puesto Ampliación' : 'Puesto baja'} value={form.puesto_baja}            onChange={handlePuestoBajaChange}        options={esCeetps ? getCeetpsPuestoOptions(form.escalafon) : getPuestoOptions(form.unificador_puestos, form.escalafon)} cols={1} disabled={!esCeetps && !form.pou_pof} />
              <SearchSelectField label="Especialidad baja" value={form.especialidad_baja}      onChange={set('especialidad_baja')}      options={getEspecialidadOptions(form.puesto_baja, form.escalafon)}    cols={1} disabled={esCeetps || !form.puesto_baja || esProfesionalGuardiaMedico} />
              <Field        label="Partida presupuestaria" value={form.partida_presupuestaria} onChange={set('partida_presupuestaria')} cols={1} disabled={form.origen === 'Ampliación' || form.origen === 'Cobertura Dotación'} />
            </div>
          </Section>

          {/* 4 — Fechas y expediente */}
          <Section title="Fechas y expediente">
            <div className="grid grid-cols-4 gap-3">
              <DateMaskField label="Fecha de baja"            value={form.fecha_baja}          onChange={set('fecha_baja')}          cols={1} />
              <Field         label="Carga horaria"            value={form.carga_horaria}       onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 2); setForm(prev => ({ ...prev, carga_horaria: v })) }}       cols={1} />
              <StyledSelectField   label="Motivo de baja"           value={form.motivo_baja}         onChange={set('motivo_baja')}         options={form.origen === 'Cobertura Dotación' ? ['Cobertura Dotación'] : form.origen === 'Ampliación' ? ['Ampliación'] : form.origen === 'POU a POF' ? ['POU a POF'] : OPCIONES_MOTIVO_BAJA} cols={1} disabled={form.origen === 'Cobertura Dotación' || form.origen === 'Ampliación' || form.origen === 'POU a POF'} />
              {form.origen !== 'Cobertura Dotación' ? (
                <Field label="Doc. respaldatoria" value={form.doc_respaldatoria} onChange={set('doc_respaldatoria')} cols={1} />
              ) : (
                <div className="col-span-1" />
              )}
              <DateMaskField label="Fecha pase paralelo / GT" value={form.fecha_pase_paralelo} onChange={set('fecha_pase_paralelo')} cols={1} />
            </div>
          </Section>

          {/* 5 — Concurso */}
          <Section title="Concurso">
            <div className="grid grid-cols-4 gap-3">
              <CheckField label="Genera concurso" value={form.genera_concurso === 'SI'} staticLabel="Sí"
                onChange={e => setForm(prev => ({ ...prev, genera_concurso: e.target.value ? 'SI' : 'NO' }))} cols={1} />
              {form.origen === 'Ampliación' ? (
                <CheckField label="Obra" value={!!form.obra}
                  onChange={e => setForm(prev => ({ ...prev, obra: e.target.value }))} cols={1} />
              ) : (
                <div className="col-span-1" />
              )}
              {form.genera_concurso === 'SI' && form.origen === 'Ampliación' && (
                <DateMaskField label="Fecha Caratulación" value={form.fecha_caratulacion} onChange={set('fecha_caratulacion')} cols={1} />
              )}
              {form.genera_concurso === 'SI' && (
                <Field label="Expediente Concurso" value={form.expediente_concurso} onChange={set('expediente_concurso')} cols={form.origen === 'Ampliación' ? 1 : 2} />
              )}
              {(form.genera_concurso === 'SI' || esCeetps) ? (
                <div className={form.genera_concurso === 'SI' ? 'col-span-4' : 'col-span-2'}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 invisible">.</label>
                  <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs border ${
                    esCeetps
                      ? (form.genera_concurso === 'SI' ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-amber-50 border-amber-200 text-amber-800')
                      : previewEsCph
                        ? 'bg-blue-50 border-blue-200 text-blue-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}>
                    <InformationCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {esCeetps
                      ? (form.genera_concurso === 'SI'
                          ? `Código ${codigoNum} (${ceetpsLabel}): esta baja se dirigirá automáticamente a Seguimiento CEETPS.`
                          : `Código ${codigoNum} (${ceetpsLabel}): tildá "Genera concurso" para generar el seguimiento CEETPS.`)
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

function ExBajaField({ value, onChange, onSiglaMatch, cols = 3 }) {
  const origen = useContext(OrigenContext)
  const currentYear = String(new Date().getFullYear())

  const detectMode = (v) => (v && v.startsWith('RESOL/')) ? 'RESOL' : 'EX'

  const parseEX = (v) => {
    const m = (v || '').match(/^EX-(\d{4})-(\d*)- -GCABA-(.{0,10})$/)
    return m ? { year: m[1], num: m[2], sigla: m[3] } : { year: currentYear, num: '', sigla: '' }
  }

  const parseRESOL = (v) => {
    const m = (v || '').match(/^RESOL\/(\d{0,4})\/([A-Z0-9]{0,5})\/(.{0,10})$/)
    return m ? { num: m[1], msgc: m[2], last: m[3] } : { num: '', msgc: 'MSGC', last: '' }
  }

  const [mode, setMode]     = useState(() => detectMode(value))
  const [exP, setExP]       = useState(() => parseEX(value))
  const [resolP, setResolP] = useState(() => parseRESOL(value))

  const buildEX    = (p) => `EX-${p.year}-${p.num}- -GCABA-${p.sigla}`
  const buildRESOL = (p) => `RESOL/${p.num}/${p.msgc}/${p.last}`

  const emitEX    = (p) => onChange({ target: { value: buildEX(p) } })
  const emitRESOL = (p) => onChange({ target: { value: buildRESOL(p) } })

  const updEX = (field, v) => {
    const p = { ...exP, [field]: v }
    setExP(p)
    emitEX(p)
    if (field === 'sigla' && onSiglaMatch && SIGLAS_DATA.some(s => s.sigla === v)) {
      onSiglaMatch(v)
    }
  }
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
        <div className="flex items-center gap-1 font-mono text-sm flex-nowrap overflow-x-auto">
          <span className="text-gray-400 select-none shrink-0">EX-</span>
          <input value={exP.year}  onChange={e => updEX('year',  e.target.value.replace(/\D/g,'').slice(0,4))} style={{ ...iBgStyle, width: '3rem' }} className={iCls} maxLength={4} placeholder="AAAA" />
          <span className="text-gray-400 select-none shrink-0">-</span>
          <input value={exP.num}   onChange={e => updEX('num',   e.target.value.replace(/\D/g,'').slice(0,8))} style={{ ...iBgStyle, width: '6.5rem' }} className={iCls} maxLength={8} placeholder="00000000" />
          <span className="text-gray-400 select-none shrink-0">- -GCABA-</span>
          <input value={exP.sigla} onChange={e => updEX('sigla', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10))} style={{ ...iBgStyle, width: '6rem' }} className={iCls} maxLength={10} placeholder="XXXXXXXXXX" />
        </div>
      ) : (
        <div className="flex items-center gap-1 font-mono text-sm flex-nowrap overflow-x-auto">
          <span className="text-gray-400 select-none shrink-0">RESOL/</span>
          <input value={resolP.num}  onChange={e => updRE('num',  e.target.value.replace(/\D/g,'').slice(0,4))}                        style={{ ...iBgStyle, width: '3.5rem' }} className={iCls} maxLength={4} placeholder="0000" />
          <span className="text-gray-400 select-none shrink-0">/</span>
          <input value={resolP.msgc} onChange={e => updRE('msgc', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5))}  style={{ ...iBgStyle, width: '3.5rem' }} className={iCls} maxLength={5} placeholder="MSGC" />
          <span className="text-gray-400 select-none shrink-0">/</span>
          <input value={resolP.last} onChange={e => updRE('last', e.target.value.toUpperCase().slice(0,10))}                           style={{ ...iBgStyle, width: '6rem' }}  className={iCls} maxLength={10} placeholder="XXXXXXXXXX" />
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
        ['ID SIAL',           initial?.cargo_baja],
        ['CUIL',              initial?.cuil],
        ['Nombre y Apellido', initial?.nombre_apellido],
        ['Cod. registro',     initial?.codigo_registro],
        ['Unificador puestos', initial?.unificador_puestos],
        ['POU/POF',           initial?.pou_pof],
        ['Escalafon',         initial?.escalafon],
        [initial?.origen === 'Ampliación' ? 'Puesto Ampliación' : 'Puesto baja', initial?.puesto_baja],
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
        ...(initial?.genera_concurso === 'SI' && initial?.origen === 'Ampliación' ? [
          ['Fecha Caratulación', initial?.fecha_caratulacion],
        ] : []),
        ...(initial?.genera_concurso === 'SI' ? [
          ['Expediente Concurso', initial?.expediente_concurso],
        ] : []),
        ...(initial?.obra ? [['Obra', 'Sí']] : []),
      ]
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto">
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
