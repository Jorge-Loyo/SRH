const express = require('express');
const {
  listSeguimientoCeetps,
  getSeguimientoCeetps,
  getSeguimientoCeetpsByBaja,
  createSeguimientoCeetps,
  updateSeguimientoCeetps,
  deleteSeguimientoCeetps,
} = require('./seguimientoCeetpsController');
const { authenticateJWT, requirePermission } = require('../../middlewares/auth');
const { auditMiddleware }                    = require('../../middlewares/audit');

const router = express.Router();

/**
 * Módulo Seguimiento CEETPS
 * Base: /api/concursales/seguimiento-ceetps
 */

router.get('/by-baja/:idBaja', authenticateJWT, getSeguimientoCeetpsByBaja);
router.get('/',                authenticateJWT, listSeguimientoCeetps);
router.get('/:id',             authenticateJWT, getSeguimientoCeetps);

router.post('/',
  authenticateJWT, requirePermission('can_create'), auditMiddleware,
  createSeguimientoCeetps,
);

router.put('/:id',
  authenticateJWT, requirePermission('can_update'), auditMiddleware,
  updateSeguimientoCeetps,
);

router.delete('/:id',
  authenticateJWT, requirePermission('can_delete'), auditMiddleware,
  deleteSeguimientoCeetps,
);

module.exports = router;
