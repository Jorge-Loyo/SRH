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
 * - Acceso: admin, editor, viewer, gerencia
 * - EXCLUIDO: director (NO incluido en authorizeRoles)
 * 
 * Eliminación restringida solo a admin, editor y gerencia.
 * 
 * AUTENTICACIÓN: JWT-only (desde header Authorization o cookie accessToken)
 */

// GET /api/minutas - Listar minutas (con filtros opcionales)
router.get('/',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia', 'concursales'),
  validatePagination,
  controller.list
);

// GET /api/minutas/:id - Obtener una minuta específica
router.get('/:id',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia', 'concursales'),
  controller.getOne
);

// POST /api/minutas - Crear nueva minuta (admin, editor, viewer)
router.post('/', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia'), 
  validateBody(MinutaCreateSchema), 
  controller.create
);

// PUT /api/minutas/:id - Actualizar minuta (admin, editor, viewer)
router.put('/:id', 
  authenticateJWT, 
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia'), 
  validateBody(MinutaUpdateSchema), 
  controller.update
);

// DELETE /api/minutas/:id - Eliminar minuta (solo admin y editor)
router.delete('/:id',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'gerencia'), // viewer NO puede eliminar
  controller.remove
);

// POST /api/minutas/export - Exportar minuta a Excel
router.post('/export',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'viewer', 'gerencia', 'concursales'),
  async (req, res) => {
    try {
      const { columns, rows, titulo, hospitalCode } = req.body;
      if (!Array.isArray(columns) || !Array.isArray(rows)) {
        return res.status(400).json({ error: 'columns y rows son requeridos' });
      }
      const { toMinutaExcelBuffer } = require('../utils/excel');
      const buffer = await toMinutaExcelBuffer(columns, rows, titulo || 'Minuta');
      const safeName = (titulo || 'minuta').replace(/[^\w\- áéíóúÁÉÍÓÚñÑ]/g, '_').substring(0, 50);
      const safeHospital = (hospitalCode || '').toString().replace(/[^\w]/g, '');
      const filename = `${safeName}${safeHospital ? '_' + safeHospital : ''}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (e) {
      return res.status(500).json({ error: e.message || 'Error al exportar' });
    }
  }
);

module.exports = router;
