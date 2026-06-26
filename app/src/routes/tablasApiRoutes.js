/**
 * app/src/routes/tablasApiRoutes.js
 *
 * Expone las tablas full bajo /api/tablas/:tableKey
 *
 * Soporta: personas | cargos | roles | siglas | bajas
 */
const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { buildGenericTableFull } = require('../services/tablas/genericTableFull');
const logger = require('../utils/logger');

const router = express.Router();

// Solo roles con acceso de lectura a tablas de BD (admin/editor)
router.use(authenticateJWT, authorizeRoles('admin', 'editor'));

const VALID_TABLES = ['personas', 'cargos', 'roles', 'siglas'];

/**
 * GET /api/tablas/:tableKey
 * Parámetros de query: page, perPage, sortBy, sortDir, + filtros dinámicos, distinct
 */
router.get('/:tableKey', async (req, res) => {
  const tableKey = req.params.tableKey;

  if (!VALID_TABLES.includes(tableKey)) {
    return res.status(400).json({ error: `Tabla inválida: ${tableKey}` });
  }

  try {
    const { AppDataSource } = require('../config/data-source');
    const { toCsvBase64 } = require('../utils/csv');

    const handler = buildGenericTableFull(tableKey, { AppDataSource, toCsvBase64 });
    const result = await handler(req);
    return res.json(result);
  } catch (e) {
    logger.error(`[TablasAPI] /${tableKey}`, { error: e.message });
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
});

/**
 * GET /api/tablas/:tableKey/export
 * Exportación Excel de la tabla completa.
 */
router.get('/:tableKey/export', async (req, res) => {
  const tableKey = req.params.tableKey;

  if (!VALID_TABLES.includes(tableKey)) {
    return res.status(400).json({ error: `Tabla inválida: ${tableKey}` });
  }

  try {
    const { AppDataSource } = require('../config/data-source');
    const { toCsvBase64 } = require('../utils/csv');

    req.query.export = 'xlsx';
    const handler = buildGenericTableFull(tableKey, { AppDataSource, toCsvBase64 });
    const result = await handler(req);

    if (!result.xlsxBase64) {
      return res.status(500).json({ error: 'Exportación no disponible' });
    }

    const filename = result.filename || `${tableKey}_${Date.now()}.xlsx`;
    const buffer = Buffer.from(result.xlsxBase64, 'base64');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (e) {
    logger.error(`[TablasAPI] /${tableKey}/export`, { error: e.message });
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
});

module.exports = router;
