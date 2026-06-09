const express = require('express');
const {
  listBajas,
  getBaja,
  createBaja,
  updateBaja,
  deleteBaja,
} = require('./bajaConsolidadaController');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { auditMiddleware }                 = require('../../middlewares/audit');

const router = express.Router();

/**
 * Módulo 2 — Bajas Consolidadas
 * Base: /api/concursales/bajas
 */

// Listado con filtros y paginación
router.get(
  '/',
  authenticateJWT,
  listBajas,
);

// Detalle por ID
router.get(
  '/:id',
  authenticateJWT,
  getBaja,
);

// Crear baja (dispara lógica CPH automáticamente)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'gerencia'),
  auditMiddleware,
  createBaja,
);

// Editar baja
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'gerencia'),
  auditMiddleware,
  updateBaja,
);

// Eliminar baja
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'gerencia'),
  auditMiddleware,
  deleteBaja,
);

module.exports = router;
