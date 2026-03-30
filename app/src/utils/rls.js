/**
 * Utilidad para aplicar Row-Level Security (RLS) basado en permisos de usuario
 * Filtra automáticamente queries por hospital_code para roles con restricción
 */

const { permissionCache } = require('./permissionCache');
const logger = require('./logger');

/**
 * Carga permisos de usuario desde caché si no están en memoria
 * @private
 * @param {Object} user - Usuario con role
 * @returns {Promise<Object|null>} Permisos o null si falla
 */
async function loadUserPermissions(user) {
  if (!user || !user.role) return null;
  
  // Ya tiene permisos cargados
  if (user.permissions) return user.permissions;
  
  try {
    // Obtener desde caché (evita query repetida)
    const permissions = await permissionCache.getPermissions(user.role);
    
    // Cachear permisos en objeto user para evitar consultas repetidas en mismo request
    if (permissions) {
      user.permissions = permissions;
    }
    
    return permissions;
  } catch (e) {
    logger.warn('[RLS] No se pudieron cargar permisos:', { error: e.message, role: user.role });
    return null;
  }
}

/**
 * Aplica filtro de hospital a una cláusula WHERE si el usuario tiene restricción
 * @param {Object} req - Request de Express con req.user
 * @param {Object} baseWhere - Objeto WHERE base de TypeORM
 * @returns {Object} WHERE con filtro de hospital aplicado si corresponde
 */
async function applyHospitalFilter(req, baseWhere = {}) {
  const permissions = await loadUserPermissions(req.user);
  
  if (!permissions) {
    return baseWhere;
  }

  // Si el rol requiere filtrado por hospital
  if (permissions.filter_by_hospital && req.user.hospital_code) {
    // Para roles, necesitamos JOIN con siglas
    // El filtro se aplica en la query SQL directamente
    return {
      ...baseWhere,
      _hospitalFilter: req.user.hospital_code // Marcador para el controller
    };
  }

  return baseWhere;
}

/**
 * Construye cláusula SQL WHERE para filtrar por hospital en queries raw
 * @param {Object} req - Request de Express
 * @param {Array} params - Array de parámetros SQL existentes
 * @returns {Object} { clause: string SQL, params: array actualizado }
 */
async function buildHospitalFilterSQL(req, params = []) {
  const permissions = await loadUserPermissions(req.user);
  
  if (!permissions) {
    return { clause: '', params };
  }

  // Si requiere filtrado por hospital
  if (permissions.filter_by_hospital && req.user.hospital_code) {
    // Añadir filtro SQL y parámetro
    params.push(req.user.hospital_code);
    return {
      clause: 'AND s.sigla = ?',
      params
    };
  }

  return { clause: '', params };
}

module.exports = {
  applyHospitalFilter,
  buildHospitalFilterSQL
};
