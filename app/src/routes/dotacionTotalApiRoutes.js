const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { handleDotacionTotalPage } = require('../hospitals/dotacion-pages');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'editor', 'viewer', 'gerencia', 'director', 'concursales'));

/**
 * GET /api/dotacion-total
 * Vista global de dotación (todos los hospitales combinados).
 *
 * Query params: periodo, page, perPage, sortBy, sortDir,
 *               sigla, universo_totalizador,
 *               tipo_hospital_sigla, monovalencia,
 *               + filtros dinámicos (especialidad, escalafon, etc.)
 *               + export=xlsx para exportar
 */
router.get('/', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const result = await handleDotacionTotalPage({ AppDataSource, req });

    if (req.query.export === 'xlsx' && result.xlsxBase64) {
      const buffer = Buffer.from(result.xlsxBase64, 'base64');
      const filename = result.filename || `dotacion_total_${req.query.periodo || 'all'}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    return res.json(result);
  } catch (e) {
    logger.error('[DotacionTotalAPI] GET /api/dotacion-total', { error: e.message });
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
});

module.exports = router;
