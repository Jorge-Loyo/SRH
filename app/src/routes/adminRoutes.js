/**
 * src/routes/adminRoutes.js
 * Rutas administrativas (sin datos de negocio, solo mantenimiento)
 * Requiere: authenticateJWT + role admin
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const logger = require('../utils/logger');

/**
 * POST /api/admin/cache/invalidate-permissions
 * Invalida caché de permisos para forzar recarga desde BD
 * Útil después de actualizar permisos
 */
router.post('/cache/invalidate-permissions', authenticateJWT, authorizeRoles('admin'), (req, res) => {
  try {
    const { permissionCache } = require('../utils/permissionCache');
    const { role } = req.body || {};
    
    if (role) {
      // Invalidar caché para un role específico
      permissionCache.invalidate(role);
      logger.info('[AdminAPI] Permission cache invalidated for role', { role, user: req.user?.username });
      return res.json({ message: `Cache invalidated for role: ${role}` });
    } else {
      // Invalidar caché global + stats
      permissionCache.clearAll();
      logger.info('[AdminAPI] All permission caches cleared', { user: req.user?.username });
      return res.json({ message: 'All permission caches cleared' });
    }
  } catch (e) {
    logger.error('[AdminAPI.invalidate-permissions]', { error: e.message });
    return res.status(500).json({ error: 'Error invalidating cache' });
  }
});

/**
 * GET /api/admin/cache/stats
 * Retorna estadísticas del caché de permisos
 */
router.get('/cache/stats', authenticateJWT, authorizeRoles('admin'), (req, res) => {
  try {
    const { permissionCache } = require('../utils/permissionCache');
    const stats = permissionCache.getStats();
    return res.json(stats);
  } catch (e) {
    logger.error('[AdminAPI.cache-stats]', { error: e.message });
    return res.status(500).json({ error: 'Error fetching cache stats' });
  }
});

module.exports = router;
