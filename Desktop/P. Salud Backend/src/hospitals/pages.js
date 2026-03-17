// Hospitals dispatcher for AdminJS custom pages

const { buildPageParams } = require('./common/params')
const logger = require('../utils/logger')

// Caché de período por defecto por hospital (TTL 5 minutos)
const periodoCache = new Map();
const PERIODO_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el período más reciente para un hospital (con caché)
 * @param {Object} AppDataSource - TypeORM data source
 * @param {string} hospital - Código del hospital
 * @returns {Promise<string|null>} Período más reciente o null
 */
async function getLatestPeriodo(AppDataSource, hospital) {
  const cacheKey = `periodo_${hospital}`;
  const cached = periodoCache.get(cacheKey);
  
  // Retornar desde caché si es válido
  if (cached && Date.now() - cached.timestamp < PERIODO_CACHE_TTL) {
    return cached.periodo;
  }
  
  // Cache miss - consultar BD
  try {
    const sql = `
      SELECT r.periodo AS periodo
      FROM roles r
      LEFT JOIN siglas s ON r.id_sigla = s.id_sigla
      WHERE s.sigla = ?
      GROUP BY r.periodo
      ORDER BY r.periodo DESC
      LIMIT 1
    `;
    const rows = await AppDataSource.query(sql, [String(hospital).toUpperCase()]);
    const periodo = rows?.[0]?.periodo || null;
    
    // Guardar en caché
    periodoCache.set(cacheKey, {
      periodo,
      timestamp: Date.now()
    });
    
    return periodo;
  } catch (e) {
    logger.warn('[getLatestPeriodo] Error al obtener período:', { hospital, error: e?.message });
    return null;
  }
}

async function handleOrganizacionTabla({ AppDataSource, req }){
  const { hospital } = buildPageParams(req)

  // Si falta el período, obtener el más reciente disponible para el hospital (con caché)
  if (!req.query.periodo || String(req.query.periodo).trim() === '') {
    const latest = await getLatestPeriodo(AppDataSource, hospital);
    if (latest) {
      req.query.periodo = latest;
    }
  }

  // Usar el manejador genérico que funciona para todos los hospitales
  const { handleOrganizacionTabla: handleGeneric } = require('./common/organizacion-tabla-handler')
  let result = await handleGeneric({ AppDataSource, req }, hospital)

  // Export CSV si se solicita
  if (req.query.export === 'csv') {
    try {
      const { toCsvBase64 } = require('../utils/csv')
      result.csvBase64 = toCsvBase64(result.rows || [], result.columns || [])
      const tipo = req.query.procesos_concursales === 'true' ? 'bajas_concursos' : 'dotacion'
      result.filename = `${tipo}_${hospital}_${req.query.periodo}_p${req.query.page || 1}.csv`
    } catch (e) {
      // Fallback minimal en caso de error inesperado
      const csv = [
        (result.columns || []).join(','),
        ...(result.rows || []).map(r => (result.columns || []).map(c => JSON.stringify(r[c] ?? '')).join(','))
      ].join('\n')
      result.csvBase64 = Buffer.from(csv, 'utf8').toString('base64')
      const tipo = req.query.procesos_concursales === 'true' ? 'bajas_concursos' : 'dotacion'
      result.filename = `${tipo}_${hospital}_${req.query.periodo}_p${req.query.page || 1}.csv`
    }
  }

  return result
}

module.exports = { handleOrganizacionTabla }
