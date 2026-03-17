const express = require('express');
const router = express.Router();
const controller = require('../controllers/minutasController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validateBody');
const { validatePagination } = require('../middlewares/paginationValidator');
const { MinutaCreateSchema, MinutaUpdateSchema } = require('../schemas');

/**
 * Rutas de Minutas (hojas de cálculo dinámicas)
 * 
 * PERMISOS CRÍTICOS:
 * - Acceso: admin, editor, viewer
 * - EXCLUIDO: director (NO incluido en authorizeRoles)
 * 
 * Eliminación restringida solo a admin y editor.
 * 
 * AUTENTICACIÓN: JWT-only (desde header Authorization o cookie accessToken)
 */

// GET /api/minutas - Listar minutas (con filtros opcionales)
router.get('/', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer'),
  validatePagination,
  controller.list
);

// GET /api/minutas/:id - Obtener una minuta específica
router.get('/:id', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer'), 
  controller.getOne
);

// POST /api/minutas - Crear nueva minuta (admin, editor, viewer)
router.post('/', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer'), 
  validateBody(MinutaCreateSchema), 
  controller.create
);

// PUT /api/minutas/:id - Actualizar minuta (admin, editor, viewer)
router.put('/:id', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer'), 
  validateBody(MinutaUpdateSchema), 
  controller.update
);

// DELETE /api/minutas/:id - Eliminar minuta (solo admin y editor)
router.delete('/:id', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor'), // ⚠️ viewer NO puede eliminar
  controller.remove
);

module.exports = router;
