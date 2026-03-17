const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middlewares/auth');
const logger = require('../utils/logger');

/**
 * Rutas para páginas dinámicas/handlers
 * Proporciona endpoints para llamadas AJAX desde AdminJS componentes
 */

// Middleware de autenticación para todas las rutas
router.use(authenticateJWT);

/**
 * GET /api/pages/OrganizacionTabla
 * Manejador genérico para la tabla de organización
 */
router.get('/OrganizacionTabla', async (req, res) => {
  try {
    const { handleOrganizacionTabla } = require('../hospitals/pages');
    
    // Llamar al handler con los parámetros de la request
    const result = await handleOrganizacionTabla({
      AppDataSource: req.app.locals.AppDataSource,
      req: {
        query: req.query,
        params: req.query,
        user: req.user,
        hospital: req.query.hospital,
        periodo: req.query.periodo,
      },
    });

    // Retornar resultado del handler
    if (result && typeof result === 'object') {
      return res.json(result);
    }

    // Fallback si el handler no retorna datos válidos
    return res.json({
      columns: [],
      rows: [],
      total: 0,
    });
  } catch (error) {
    logger.error('[PagesRoutes.OrganizacionTabla] Error:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
    });

    res.status(500).json({
      error: 'Error al procesar la solicitud',
      message: error.message,
    });
  }
});

module.exports = router;
