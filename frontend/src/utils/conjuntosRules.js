/**
 * Motor de evaluación de reglas para el campo "Conjuntos" de Seguimiento CPH.
 *
 * Tipos de campo:
 *   (sin type / 'enum') → select con opciones fijas, solo = y !=
 *   'boolean'           → select Sí/No, solo = y !=
 *   'date'              → input texto DD-MM-AAAA, todos los operadores
 *   'number'            → input numérico, todos los operadores
 *   'text'              → input texto libre, solo = y !=
 *
 * Estructura de una regla:
 * {
 *   id: string,
 *   conditions: [
 *     { id, logicalOp: null|'AND'|'OR'|'AND NOT'|'OR NOT', field, operator, value },
 *     ...
 *   ],
 *   result: string
 * }
 */

import {
  OPCIONES_TIPO_EFECTOR,
  OPCIONES_ESCALAFON_BAJAS,
  OPCIONES_ESCALAFON_SEGUIMIENTO,
  OPCIONES_UNIFICADOR_PUESTOS,
  OPCIONES_MOTIVO_BAJA,
  OPCIONES_USUARIOS,
  OPCIONES_ORIGEN,
  OPCIONES_SIGLAS,
  OPCIONES_ESTADO,
  OPCIONES_SUB_ESTADO_3,
  OPCIONES_ESPECIALIDADES,
  OPCIONES_DISPO_DESIERTA,
  getPuestoOptions,
} from './concursalesHelpers'

const ALL_PUESTOS = getPuestoOptions()
const BOOL_OPTS   = ['true', 'false']
const BOOL_LABELS = { true: 'Sí', false: 'No' }

/** Campos disponibles para construir condiciones, agrupados por categoría */
export const CAMPOS_DISPONIBLES = [
  // ── Efector ──────────────────────────────────────────────────────────────────
  { key: 'origen',                  label: 'Origen',                    options: OPCIONES_ORIGEN,                group: 'Efector' },
  { key: 'tipo_efector',            label: 'Tipo efector',              options: OPCIONES_TIPO_EFECTOR,          group: 'Efector' },
  { key: 'sigla_efector',           label: 'Sigla efector',             options: OPCIONES_SIGLAS,                group: 'Efector' },
  // ── Baja ─────────────────────────────────────────────────────────────────────
  { key: 'ee_baja',                 label: 'EE baja',                   type: 'text',                            group: 'Baja' },
  { key: 'fecha_baja',              label: 'Fecha de baja',             type: 'date',                            group: 'Baja' },
  { key: 'escalafon_baja',          label: 'Escalafón (baja)',          options: OPCIONES_ESCALAFON_BAJAS,       group: 'Baja' },
  { key: 'escalafon_1',             label: 'POU / POF (baja)',          options: OPCIONES_ESCALAFON_SEGUIMIENTO, group: 'Baja' },
  { key: 'unificador_puestos',      label: 'Unificador puestos',        options: OPCIONES_UNIFICADOR_PUESTOS,    group: 'Baja' },
  { key: 'puesto_1',                label: 'Puesto (baja)',             options: ALL_PUESTOS,                    group: 'Baja' },
  { key: 'especialidad_baja',       label: 'Especialidad (baja)',       options: OPCIONES_ESPECIALIDADES,        group: 'Baja' },
  { key: 'motivo_baja',             label: 'Motivo de baja',            options: OPCIONES_MOTIVO_BAJA,           group: 'Baja' },
  // ── Concurso ─────────────────────────────────────────────────────────────────
  { key: 'ee_concurso',             label: 'EE concurso',               type: 'text',                            group: 'Concurso' },
  { key: 'fecha_ee_concurso',       label: 'Fecha EE concurso',         type: 'date',                            group: 'Concurso' },
  { key: 'escalafon_2',             label: 'Escalafón (concurso)',      options: OPCIONES_ESCALAFON_SEGUIMIENTO, group: 'Concurso' },
  { key: 'puesto_2',                label: 'Puesto (concurso)',         options: ALL_PUESTOS,                    group: 'Concurso' },
  { key: 'especialidad_solicitada', label: 'Especialidad solicitada',   options: OPCIONES_ESPECIALIDADES,        group: 'Concurso' },
  { key: 'fecha_autorizacion',      label: 'Fecha autorización',        type: 'date',                            group: 'Concurso' },
  { key: 'sorteo_jurado',           label: 'Sorteo jurado',             type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Concurso' },
  { key: 'disposicion',             label: 'Disposición',               type: 'text',                            group: 'Concurso' },
  { key: 'fecha_insc_desde',        label: 'Fecha insc. desde',         type: 'date',                            group: 'Concurso' },
  { key: 'fecha_insc_hasta',        label: 'Fecha insc. hasta',         type: 'date',                            group: 'Concurso' },
  { key: 'q_inscriptos',            label: 'Cant. inscriptos',          type: 'number',                          group: 'Concurso' },
  { key: 'examen_publicado',        label: 'Examen publicado',          type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Concurso' },
  { key: 'fecha_examen',            label: 'Fecha examen',              type: 'date',                            group: 'Concurso' },
  { key: 'orden_merito',            label: 'Orden de mérito',           type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Concurso' },
  { key: 'fecha_orden_merito',      label: 'F. orden de mérito',        type: 'date',                            group: 'Concurso' },
  { key: 'fecha_ifacs',             label: 'Fecha IFACS',               type: 'date',                            group: 'Concurso' },
  { key: 'insal',                   label: 'INSAL',                     type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Concurso' },
  { key: 'fecha_insal',             label: 'Fecha INSAL',               type: 'date',                            group: 'Concurso' },
  // ── Designación ──────────────────────────────────────────────────────────────
  { key: 'ee_designacion',          label: 'EE designación',            type: 'text',                            group: 'Designación' },
  { key: 'fecha_ee_designacion',    label: 'Fecha EE designación',      type: 'date',                            group: 'Designación' },
  { key: 'carga_documentacion',     label: 'Carga doc.',                type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Designación' },
  { key: 'fecha_apto_medico',       label: 'Fecha apto médico',         type: 'date',                            group: 'Designación' },
  { key: 'fecha_ite',               label: 'Fecha ITE',                 type: 'date',                            group: 'Designación' },
  { key: 'reso_a_la_firma',         label: 'Reso. a la firma',          type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Designación' },
  { key: 'proyecto_resolucion',     label: 'Proyecto resolución',       type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Designación' },
  { key: 'resolucion_designacion',  label: 'Resolución designación',    type: 'text',                            group: 'Designación' },
  { key: 'fecha_resolucion',        label: 'Fecha resolución',          type: 'date',                            group: 'Designación' },
  { key: 'fecha_cargo',             label: 'Fecha cargo',               type: 'date',                            group: 'Designación' },
  { key: 'cargo_sial',              label: 'Cargo SIAL',                type: 'text',                            group: 'Designación' },
  // ── Estado ────────────────────────────────────────────────────────────────────
  { key: 'estado',                  label: 'Estado',                    options: OPCIONES_ESTADO,                group: 'Estado' },
  { key: 'sub_estado_3',            label: 'Sub-estado 3',              options: OPCIONES_SUB_ESTADO_3,          group: 'Estado' },
  { key: 'suspendido',              label: 'Suspendido',                type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Estado' },
  { key: 'cambio_especialidad',     label: 'Solicitud de cambio',       options: ['SI', 'NO'],                   group: 'Estado' },
  { key: 'dispo_desierta',          label: 'Dispo. desierta',           options: OPCIONES_DISPO_DESIERTA,        group: 'Estado' },
  { key: 'fecha_dispo_desierta',    label: 'Fecha dispo. desierta',     type: 'date',                            group: 'Estado' },
  // ── Otros ─────────────────────────────────────────────────────────────────────
  { key: 'usuario',                 label: 'Usuario',                   options: OPCIONES_USUARIOS,              group: 'Otros' },
]

/** Orden de grupos para el modal */
export const GRUPOS_CAMPOS = ['Efector', 'Baja', 'Concurso', 'Designación', 'Estado', 'Otros']

/** Retorna las opciones fijas de un campo, o [] si es de texto/fecha/número */
export function getFieldOptions(fieldKey) {
  return CAMPOS_DISPONIBLES.find(c => c.key === fieldKey)?.options ?? []
}

/** Retorna los labels de opciones de un campo (para booleans, etc.) */
export function getFieldOptionLabels(fieldKey) {
  return CAMPOS_DISPONIBLES.find(c => c.key === fieldKey)?.optionLabels ?? null
}

/** Convierte DD-MM-YYYY a YYYY-MM-DD para comparación lexicográfica correcta */
function dmyToIsoComp(v) {
  const m = String(v).match(/^(\d{2})-(\d{2})-(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v
}

/** Evalúa una condición individual contra el estado del formulario */
function evalCondition(cond, form) {
  let fieldVal = form[cond.field]
  const fieldDef = CAMPOS_DISPONIBLES.find(c => c.key === cond.field)

  // Normalizar booleanos a string
  if (typeof fieldVal === 'boolean') fieldVal = String(fieldVal)
  fieldVal = String(fieldVal ?? '').trim()
  let condVal = String(cond.value ?? '').trim()

  // Comparación numérica
  if (fieldDef?.type === 'number') {
    const a = parseFloat(fieldVal)
    const b = parseFloat(condVal)
    if (!isNaN(a) && !isNaN(b)) {
      if (cond.operator === '=')  return a === b
      if (cond.operator === '!=') return a !== b
      if (cond.operator === '>')  return a > b
      if (cond.operator === '<')  return a < b
      if (cond.operator === '>=') return a >= b
      if (cond.operator === '<=') return a <= b
    }
    // Fallback si no son números
    return cond.operator === '=' ? fieldVal === condVal : fieldVal !== condVal
  }

  // Comparación de fechas: convertir DD-MM-YYYY → YYYY-MM-DD
  if (fieldDef?.type === 'date') {
    fieldVal = dmyToIsoComp(fieldVal)
    condVal  = dmyToIsoComp(condVal)
  }

  switch (cond.operator) {
    case '=':  return fieldVal === condVal
    case '!=': return fieldVal !== condVal
    case '>':  return fieldVal > condVal
    case '<':  return fieldVal < condVal
    case '>=': return fieldVal >= condVal
    case '<=': return fieldVal <= condVal
    default:   return false
  }
}

/** Evalúa una regla completa respetando AND / OR / AND NOT / OR NOT */
export function evaluateRule(rule, form) {
  if (!rule?.conditions?.length) return false

  let result = evalCondition(rule.conditions[0], form)

  for (let i = 1; i < rule.conditions.length; i++) {
    const cond = rule.conditions[i]
    const cr   = evalCondition(cond, form)
    const op   = cond.logicalOp ?? 'AND'

    if      (op === 'AND')     result = result && cr
    else if (op === 'OR')      result = result || cr
    else if (op === 'AND NOT') result = result && !cr
    else if (op === 'OR NOT')  result = result || !cr
    else                       result = result && cr
  }

  return result
}

/**
 * Aplica la lista de reglas al estado del formulario.
 * Retorna el `result` de la primera regla que coincida, o null si ninguna aplica.
 */
export function applyRules(rules, form) {
  if (!Array.isArray(rules)) return null
  for (const rule of rules) {
    if (evaluateRule(rule, form)) return rule.result ?? ''
  }
  return null
}
