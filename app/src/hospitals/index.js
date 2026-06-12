/**
 * hospitals/index.js
 * 
 * Router dinámico unificado para todos los hospitales
 * Genera rutas automáticamente basadas en la lista de hospitales
 * 
 * Todos los hospitales usan el mismo handler genérico:
 * - src/hospitals/common/organizacion-tabla-handler.js
 * 
 * Ventajas:
 * ✅ Un único código para 35+ hospitales
 * ✅ Cambios en lógica se aplican a todos automáticamente
 * ✅ Mantenimiento centralizado
 * ✅ Escalable para nuevos hospitales
 */

const express = require('express');
const logger = require('../utils/logger');
const { handleOrganizacionTabla } = require('./common/organizacion-tabla-handler');

// Lista centralizada de códigos de hospital
// Mantener en sincronía con src/components/datos-comunes/hospitals-data.js
const HOSPITAL_CODES = [
  'HGARM', 'HGAPP', 'HBR', 'HGACD', 'HGAP', 'HGADS', 'HGACA', 'HGATA', 
  'HGAJAF', 'HGAIP', 'HGNPE', 'HGNRG', 'HIFJM', 'HGAVS', 'HGAT', 'HGAZ', 
  'HGACG', 'HNJTB', 'HNBM', 'HMOMC', 'HMIRS', 'HBU', 'HQ', 'HIJCTG', 
  'HEPTA', 'HRRMF', 'HSL', 'IZLP', 'HMO', 'HRR', 'IRPS', 'IREP', 
  'HOI', 'HOPL', 'HO'
];

/**
 * Crea un router para un hospital específico
 * @param {string} hospitalCode - Código del hospital (ej: 'HGACA')
 * @returns {Router} Express router con rutas del hospital
 */
function createHospitalRouter(hospitalCode) {
  const router = express.Router();

  /**
   * GET /:hospitalCode/organizacion-tabla
   * Query params: periodo, page, perPage, sortBy, sortDir, filters...
   *
   * Retorna tabla de organización de dotación
   * con soporte para:
   * - Filtros multi-select encadenados
   * - Paginación
   * - Ordenamiento
   * - Exportación CSV
   */
  router.get('/organizacion-tabla', async (req, res) => {
    try {
      const { AppDataSource } = require('../config/data-source');
      
      // Forzar código del hospital en los query params
      req.query.hospital = hospitalCode;
      
      // Usar handler genérico unificado
      const result = await handleOrganizacionTabla({ AppDataSource, req }, hospitalCode);
      
      return res.json(result);
    } catch (error) {
      logger.error(`[Hospital ${hospitalCode}] Error en organizacion-tabla:`, {
        error: error.message,
        stack: error.stack
      });
      
      return res.status(500).json({
        error: error?.message || 'Error en handler',
        hospital: hospitalCode
      });
    }
  });

  return router;
}

/**
 * Función para registrar dinámicamente todos los routers de hospitales
 * Debe llamarse desde app.js o server.js
 * 
 * @param {Express.Application} app - Aplicación Express
 * @example
 * const { registerHospitalsRouters } = require('./src/hospitals');
 * registerHospitalsRouters(app);
 */
function registerHospitalsRouters(app) {
  logger.info('[Hospitals] Registrando routers dinámicos para todos los hospitales', {
    service: 'salud-api',
    totalHospitals: HOSPITAL_CODES.length
  });

  HOSPITAL_CODES.forEach(hospitalCode => {
    const router = createHospitalRouter(hospitalCode);
    const routePath = `/${hospitalCode.toLowerCase()}`;
    
    app.use(routePath, router);
    
    logger.debug(`[Hospitals] Router registrado: ${routePath}`, {
      service: 'salud-api',
      hospital: hospitalCode
    });
  });

  logger.info('[Hospitals] Todos los routers dinámicos registrados exitosamente', {
    service: 'salud-api'
  });
}

module.exports = {
  createHospitalRouter,
  registerHospitalsRouters,
  HOSPITAL_CODES
};
