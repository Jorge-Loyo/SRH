const express = require('express');
const router = express.Router();
const controller = require('../controllers/recorridasController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validateBody');
const { validatePagination } = require('../middlewares/paginationValidator');
const { RecorridaCreateSchema, RecorridaUpdateSchema } = require('../schemas');

/**
 * Rutas de Recorridas/Seguimientos
 * 
 * PERMISOS CRÍTICOS:
 * - Acceso: admin, editor, viewer, gerencia
 * - EXCLUIDO: director (NO incluido en authorizeRoles)
 * 
 * Eliminación restringida solo a admin, editor y gerencia.
 * 
 * AUTENTICACIÓN: JWT-only (desde header Authorization o cookie accessToken)
 */

// GET /api/recorridas - Listar recorridas (con filtros opcionales)
router.get('/', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia'),
  validatePagination, // ✅ MEDIO FIX: Validar page/limit
  controller.list
);

// GET /api/recorridas/:id - Obtener una recorrida específica
router.get('/:id', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia'), 
  controller.getOne
);

// POST /api/recorridas - Crear nueva recorrida (admin, editor, viewer)
router.post('/', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia'), 
  validateBody(RecorridaCreateSchema), 
  controller.create
);

// PUT /api/recorridas/:id - Actualizar recorrida (admin, editor, viewer)
router.put('/:id', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia'), 
  validateBody(RecorridaUpdateSchema), 
  controller.update
);

// DELETE /api/recorridas/:id - Eliminar recorrida (solo admin y editor)
router.delete('/:id', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'gerencia'), // viewer NO puede eliminar
  controller.remove
);

module.exports = router;
