const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { handleDotacionActiva } = require('../hospitals/common/dotacion-activa-handler');
const logger = require('../utils/logger');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'editor', 'viewer', 'gerencia', 'director', 'concursales'));

/**
 * GET /api/dotacion-activa
 * Dotación actual activa con tablas pivot por: Enfermeros, Administrativos, Técnicos.
 * Query params: periodo (requerido)
 */
router.get('/', async (req, res) => {
  try {
    const { AppDataSource } = require('../config/data-source');
    const result = await handleDotacionActiva({ AppDataSource, req });
    return res.json(result);
  } catch (e) {
    logger.error('[DotacionActivaAPI] GET /api/dotacion-activa', { error: e.message });
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
});

module.exports = router;
