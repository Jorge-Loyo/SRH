// ============================================================================
// MAPEO DE ENTIDADES PARA BACKEND
// ============================================================================
// Este archivo contiene las importaciones de entidades TypeORM
// Se usa solo en el backend (genericTableFull.js)
// Separado de tables-config.js para evitar conflictos con Babel en AdminJS
// ============================================================================

const { Persona } = require('../../entities-class/Persona')
const { Cargo } = require('../../entities-class/Cargo')
const { Rol } = require('../../entities-class/Rol')
const { Sigla } = require('../../entities-class/Sigla')
const { BajaConcurso } = require('../../entities-class/BajaConcurso')

// Mapeo de nombres de entidades a clases TypeORM
const ENTITY_MAP = {
  'Persona': Persona,
  'Cargo': Cargo,
  'Rol': Rol,
  'Sigla': Sigla,
  'BajaConcurso': BajaConcurso
}

/**
 * Obtiene la clase de entidad basada en el nombre
 */
function getEntityClass(entityName) {
  const Entity = ENTITY_MAP[entityName]
  if (!Entity) {
    throw new Error(`Entidad no encontrada: ${entityName}`)
  }
  return Entity
}

module.exports = { ENTITY_MAP, getEntityClass }
