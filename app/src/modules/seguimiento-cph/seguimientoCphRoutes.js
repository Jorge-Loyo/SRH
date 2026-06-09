const express = require('express');
const {
  listSeguimiento,
  getEstados,
  getStatsByEfector,
  getSeguimiento,
  getSeguimientoByBaja,
  createSeguimiento,
  updateSeguimiento,
  deleteSeguimiento,
} = require('./seguimientoCphController');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { auditMiddleware }                  = require('../../middlewares/audit');

const router = express.Router();

/**
 * Módulo 2 — Seguimiento de Concursos CPH
 * Base: /api/concursales/seguimiento-cph
 */

// Auxiliares (antes de /:id para evitar conflictos de ruta)
router.get('/estados/unique',       authenticateJWT, getEstados);
router.get('/stats/by-efector',     authenticateJWT, getStatsByEfector);
router.get('/by-baja/:idBaja',      authenticateJWT, getSeguimientoByBaja);

// Listado con filtros y paginación
router.get('/',     authenticateJWT, listSeguimiento);

// Detalle por ID
router.get('/:id',  authenticateJWT, getSeguimiento);

// Crear seguimiento manual (normalmente se crea automáticamente desde /bajas)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'gerencia'),
  auditMiddleware,
  createSeguimiento,
);

// Editar seguimiento (estados, fechas, observaciones)
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'gerencia'),
  auditMiddleware,
  updateSeguimiento,
);

// Eliminar seguimiento
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin', 'gerencia'),
  auditMiddleware,
  deleteSeguimiento,
);

module.exports = router;
