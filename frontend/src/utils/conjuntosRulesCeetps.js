/**
 * Motor de evaluación de reglas para el campo "Conjuntos" de Seguimiento CEETPS.
 * Misma lógica que conjuntosRules.js pero con campos específicos de CEETPS.
 *
 * El campo objetivo es tipificador_obra_servicio (mostrado como "Conjuntos").
 */

import {
  OPCIONES_MOTIVO_BAJA,
  OPCIONES_SIGLAS,
  OPCIONES_USUARIOS_CEETPS,
  OPCIONES_ESPECIALIDADES,
} from './concursalesHelpers'

const BOOL_OPTS   = ['true', 'false']
const BOOL_LABELS = { true: 'Sí', false: 'No' }
const CODIGO_OPTS   = ['87', '85', '83']
const CODIGO_LABELS = { '87': 'Enfermeros (87)', '85': 'Técnicos (85)', '83': 'Administrativos (83)' }

/** Campos disponibles para construir condiciones en reglas CEETPS */
export const CAMPOS_DISPONIBLES_CEETPS = [
  // ── Efector ──────────────────────────────────────────────────────────────────
  { key: 'sigla_efector',      label: 'Sigla efector',       options: OPCIONES_SIGLAS,          group: 'Efector' },
  { key: 'descr_efector',      label: 'Descripción efector', type: 'text',                      group: 'Efector' },
  // ── Baja ─────────────────────────────────────────────────────────────────────
  { key: 'codigo_registro',    label: 'Código registro',     options: CODIGO_OPTS, optionLabels: CODIGO_LABELS, group: 'Baja' },
  { key: 'cuil',               label: 'CUIL (baja)',         type: 'text',                      group: 'Baja' },
  { key: 'nombre_apellido_baja', label: 'Nombre/Apellido (baja)', type: 'text',                 group: 'Baja' },
  { key: 'cargo',              label: 'Cargo (baja)',        type: 'text',                      group: 'Baja' },
  { key: 'puesto_baja',        label: 'Puesto (baja)',       type: 'text',                      group: 'Baja' },
  { key: 'especialidad_baja',  label: 'Especialidad (baja)', options: OPCIONES_ESPECIALIDADES,  group: 'Baja' },
  { key: 'fecha_baja',         label: 'Fecha de baja',       type: 'date',                      group: 'Baja' },
  { key: 'carga_horaria',      label: 'Carga horaria',       type: 'text',                      group: 'Baja' },
  { key: 'motivo_baja',        label: 'Motivo de baja',      options: OPCIONES_MOTIVO_BAJA,     group: 'Baja' },
  { key: 'ex_baja',            label: 'Expediente (baja)',   type: 'text',                      group: 'Baja' },
  { key: 'sigla',              label: 'Sigla (baja)',        type: 'text',                      group: 'Baja' },
  { key: 'efector',            label: 'Efector (baja)',      type: 'text',                      group: 'Baja' },
  { key: 'doc_respaldatoria',  label: 'Doc. respaldatoria',  type: 'text',                      group: 'Baja' },
  // ── Concurso ─────────────────────────────────────────────────────────────────
  { key: 'tipificador_origen',  label: 'Tipificador (Origen)', type: 'text',                    group: 'Concurso' },
  { key: 'expediente_concurso', label: 'Expediente concurso',  type: 'text',                    group: 'Concurso' },
  { key: 'puesto_solicitado',   label: 'Puesto solicitado',    type: 'text',                    group: 'Concurso' },
  { key: 'dispo_llamado',       label: 'Dispo. llamado',       type: 'text',                    group: 'Concurso' },
  { key: 'fecha_caratulacion',  label: 'Fecha caratulación',   type: 'date',                    group: 'Concurso' },
  { key: 'fecha_autorizacion',  label: 'Fecha autorización',   type: 'date',                    group: 'Concurso' },
  { key: 'fecha_ifacs',         label: 'Fecha IFACS',          type: 'date',                    group: 'Concurso' },
  { key: 'fecha_insal',         label: 'Fecha INSAL',          type: 'date',                    group: 'Concurso' },
  { key: 'estado_concurso',     label: 'Estado concurso',      type: 'text',                    group: 'Concurso' },
  // ── Designación ──────────────────────────────────────────────────────────────
  { key: 'expediente_designacion',    label: 'Expediente designación', type: 'text',            group: 'Designación' },
  { key: 'puesto_designado',          label: 'Puesto designado',       type: 'text',            group: 'Designación' },
  { key: 'cuil_designado',            label: 'CUIL designado',         type: 'text',            group: 'Designación' },
  { key: 'nombre_apellido_designado', label: 'Nombre/Apellido desig.', type: 'text',            group: 'Designación' },
  { key: 'estado_apto',               label: 'Estado apto médico',     type: 'text',            group: 'Designación' },
  { key: 'numero_apto_medico',        label: 'Nro. apto médico',       type: 'text',            group: 'Designación' },
  { key: 'fecha_proyecto_dispo',      label: 'F. proyecto dispo',      type: 'date',            group: 'Designación' },
  { key: 'dispo_designacion',         label: 'Dispo. designación',     type: 'text',            group: 'Designación' },
  { key: 'resolucion_designacion',    label: 'Resolución designación', type: 'text',            group: 'Designación' },
  { key: 'alta_sial',                 label: 'Alta SIAL',              type: 'boolean', options: BOOL_OPTS, optionLabels: BOOL_LABELS, group: 'Designación' },
  { key: 'id_cargo',                  label: 'ID cargo',               type: 'text',            group: 'Designación' },
  { key: 'observaciones',             label: 'Observaciones',          type: 'text',            group: 'Designación' },
  // ── Otros ─────────────────────────────────────────────────────────────────────
  { key: 'usuario', label: 'Usuario', options: OPCIONES_USUARIOS_CEETPS, group: 'Otros' },
]

export const GRUPOS_CAMPOS_CEETPS = ['Efector', 'Baja', 'Concurso', 'Designación', 'Otros']

export function getFieldOptionsCeetps(fieldKey) {
  return CAMPOS_DISPONIBLES_CEETPS.find(c => c.key === fieldKey)?.options ?? []
}

export function getFieldOptionLabelsCeetps(fieldKey) {
  return CAMPOS_DISPONIBLES_CEETPS.find(c => c.key === fieldKey)?.optionLabels ?? null
}

// ─── Motor de evaluación ──────────────────────────────────────────────────────

function dmyToIsoComp(v) {
  const m = String(v).match(/^(\d{2})-(\d{2})-(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v
}

function evalConditionCeetps(cond, form) {
  let fieldVal = form[cond.field]
  const fieldDef = CAMPOS_DISPONIBLES_CEETPS.find(c => c.key === cond.field)

  if (typeof fieldVal === 'boolean') fieldVal = String(fieldVal)
  fieldVal = String(fieldVal ?? '').trim()
  let condVal = String(cond.value ?? '').trim()

  if (fieldDef?.type === 'number') {
    const a = parseFloat(fieldVal), b = parseFloat(condVal)
    if (!isNaN(a) && !isNaN(b)) {
      if (cond.operator === '=')  return a === b
      if (cond.operator === '!=') return a !== b
      if (cond.operator === '>')  return a > b
      if (cond.operator === '<')  return a < b
      if (cond.operator === '>=') return a >= b
      if (cond.operator === '<=') return a <= b
    }
    return cond.operator === '=' ? fieldVal === condVal : fieldVal !== condVal
  }

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

export function evaluateRuleCeetps(rule, form) {
  if (!rule?.conditions?.length) return false
  let result = evalConditionCeetps(rule.conditions[0], form)
  for (let i = 1; i < rule.conditions.length; i++) {
    const cond = rule.conditions[i]
    const cr   = evalConditionCeetps(cond, form)
    const op   = cond.logicalOp ?? 'AND'
    if      (op === 'AND')     result = result && cr
    else if (op === 'OR')      result = result || cr
    else if (op === 'AND NOT') result = result && !cr
    else if (op === 'OR NOT')  result = result || !cr
    else                       result = result && cr
  }
  return result
}

export function applyRulesCeetps(rules, form) {
  if (!Array.isArray(rules)) return null
  for (const rule of rules) {
    if (evaluateRuleCeetps(rule, form)) return rule.result ?? ''
  }
  return null
}
