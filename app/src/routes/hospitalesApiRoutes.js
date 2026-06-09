/**
 * app/src/routes/hospitalesApiRoutes.js
 *
 * Expone los datos de hospitales bajo /api/hospitales/:code
 *
 * Los handlers reales (organizacion-tabla-handler.js) no cambian —
 * esta capa es solo un thin wrapper de routing.
 */
const express = require('express');
const { authenticateJWT } = require('../middlewares/auth');
const { handleOrganizacionTabla } = require('../hospitals/common/organizacion-tabla-handler');
const logger = require('../utils/logger');

const router = express.Router();

// Todas las rutas de hospitales requieren autenticación
router.use(authenticateJWT);

/**
 * GET /api/hospitales/:code/organizacion-tabla
 * Misma lógica que /:code/organizacion-tabla,
 * pero expuesta bajo /api para el nuevo frontend.
 *
 * Query params: periodo, page, perPage, sortBy, sortDir,
 *               procesos_concursales, skipDistinct,
 *               + todos los filtros dinámicos
 */
router.get('/:code/organizacion-tabla', async (req, res) => {
  const code = (req.params.code || '').toUpperCase();

  try {
    const { AppDataSource } = require('../config/data-source');

    // El handler espera el código como query param
    req.query.hospital = code;

    const result = await handleOrganizacionTabla({ AppDataSource, req }, code);
    return res.json(result);
  } catch (e) {
    logger.error(`[HospitalesAPI] /${code}/organizacion-tabla`, { error: e.message });
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
});

/**
 * GET /api/hospitales/:code/export/:tipo
 * Exportación Excel de dotación o bajas/concursos.
 * tipos válidos: dotacion-total | bajas-concursos
 */
router.get('/:code/export/:tipo', async (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const tipo = req.params.tipo;

  const validTipos = ['dotacion-total', 'bajas-concursos'];
  if (!validTipos.includes(tipo)) {
    return res.status(400).json({ error: 'Tipo de exportación inválido' });
  }

  try {
    const { AppDataSource } = require('../config/data-source');
    req.query.hospital = code;
    req.query.export = 'xlsx';
    if (tipo === 'bajas-concursos') req.query.procesos_concursales = 'true';

    const result = await handleOrganizacionTabla({ AppDataSource, req }, code);

    if (!result.xlsxBase64) {
      return res.status(500).json({ error: 'Exportación no disponible' });
    }

    const filename = result.filename || `${tipo}_${code}_${req.query.periodo || 'all'}.xlsx`;
    const buffer = Buffer.from(result.xlsxBase64, 'base64');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (e) {
    logger.error(`[HospitalesAPI] /${code}/export/${tipo}`, { error: e.message });
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
});

module.exports = router;
