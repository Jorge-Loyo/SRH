/**
 * Utilidades compartidas para el módulo de Concursos
 * 
 * Centraliza la lógica de normalización de estados y estilos
 * para mantener consistencia entre componentes
 */

/**
 * Mapeo de nombres abreviados a nombres completos de estados
 */
export const MAPEO_ESTADO = {
  'RESOLUCION': 'RESOLUCIÓN',
  'RESOLUCI': 'RESOLUCIÓN',
  'AUTORIZADO': 'AUTORIZADO',
  'AUTORIZ': 'AUTORIZADO',
  'PROX. A DESIG': 'PRÓX. A DESIGNAR',
  'PROX. A DESIG.': 'PRÓX. A DESIGNAR',
  'PROX A DESIG': 'PRÓX. A DESIGNAR',
  'DESIG. EFECTIVA': 'DESIGNACIÓN EFECTIVA',
  'DESIG EFECTIVA': 'DESIGNACIÓN EFECTIVA',
  'EN TRÁMITE': 'EN TRÁMITE',
  'DESIERTO': 'DESIERTO',
  'ADJUDI': 'ADJUDICADO',
  'ADJUDICADO': 'ADJUDICADO',
  'ADJUD': 'ADJUDICADO',
  'INSCRIPCION': 'INSCRIPCIÓN',
  'INSCRIPCI': 'INSCRIPCIÓN',
  'VALID. VCTE': 'VALIDACIÓN VACANTE',
  'VALIDACION VCTE': 'VALIDACIÓN VACANTE',
  'VALID VCTE': 'VALIDACIÓN VACANTE',
  'ETAPA EVAL': 'ETAPA DE EVALUACIÓN',
  'ETAPA EVAL.': 'ETAPA DE EVALUACIÓN',
  'ETAPA EVALUACION': 'ETAPA DE EVALUACIÓN',
}

/**
 * Paleta de colores y estilos para cada estado de concurso
 */
export const COLORES_ESTADO = {
  'RESOLUCIÓN': { bg: '#E3F2FD', border: '#1976d2', text: '#1565c0', label: 'Resolución' },
  'AUTORIZADO': { bg: '#E8F5E9', border: '#388e3c', text: '#2e7d32', label: 'Autorizado' },
  'PRÓX. A DESIGNAR': { bg: '#FFF3E0', border: '#f57c00', text: '#e65100', label: 'Próx. a Designar' },
  'DESIGNACIÓN EFECTIVA': { bg: '#F3E5F5', border: '#7b1fa2', text: '#6a1b9a', label: 'Designación Efectiva' },
  'EN TRÁMITE': { bg: '#FCE4EC', border: '#c2185b', text: '#ad1457', label: 'En Trámite' },
  'DESIERTO': { bg: '#ECEFF1', border: '#455a64', text: '#263238', label: 'Desierto' },
  'ADJUDICADO': { bg: '#E0F2F1', border: '#00897b', text: '#00695c', label: 'Adjudicado' },
  'INSCRIPCIÓN': { bg: '#F1F8E9', border: '#558b2f', text: '#33691e', label: 'Inscripción' },
  'VALIDACIÓN VACANTE': { bg: '#FFE0B2', border: '#e65100', text: '#bf360c', label: 'Validación Vacante' },
  'ETAPA DE EVALUACIÓN': { bg: '#F0F4C3', border: '#9ccc65', text: '#558b2f', label: 'Etapa de Evaluación' },
}

/**
 * Normaliza el nombre del estado a su versión estándar
 * @param {string} estado - Estado a normalizar
 * @returns {string} Estado normalizado
 */
export const normalizarEstado = (estado) => {
  if (!estado) return estado
  const upperEstado = estado.toUpperCase().trim()
  return MAPEO_ESTADO[upperEstado] || estado
}

/**
 * Obtiene los colores asociados a un estado
 * @param {string} estado - Estado del concurso
 * @returns {Object} Objeto con propiedades bg, border, text, label
 */
export const getColorEstado = (estado) => {
  const estadoNormalizado = normalizarEstado(estado)
  return COLORES_ESTADO[estadoNormalizado] || { 
    bg: '#F5F5F5', 
    border: '#999', 
    text: '#666', 
    label: estadoNormalizado 
  }
}
