const { Minuta } = require('../entities-class/Minuta');
const { User } = require('../entities-class/User');
const MinutaService = require('../services/MinutaService');
const { ServiceFactory } = require('../utils/serviceFactory');
const logger = require('../utils/logger');

/**
 * MinutasController
 * 
 * Controlador HTTP para endpoints de Minutas (hojas de cálculo dinámicas).
 * Responsable de:
 * - Parseo y validación de HTTP requests (validación Zod en middleware)
 * - Delegación de lógica a MinutaService
 * - Formateo de HTTP responses
 * - Manejo de errores HTTP
 * 
 * PERMISOS:
 * - GET, POST, PUT: admin, editor, viewer
 * - DELETE: admin, editor (configurado en rutas)
 * - EXCLUIDO: director (middleware authorizeRoles)
 */

/**
 * GET /api/minutas
 * Lista minutas con filtros opcionales y paginación
 */
async function list(req, res) {
  try {
    const service = ServiceFactory.getService(MinutaService, Minuta, User);

    const { hospital_code } = req.query;
    const { page, limit } = req.pagination || { page: 1, limit: 50 };
    
    const result = await service.list({
      hospital_code: hospital_code || undefined,
      page,
      limit
    });

    return res.json(result);
  } catch (e) {
    logger.error('[MinutasController.list] Error:', { error: e.message, stack: e.stack });
    return res.status(500).json({ error: 'Error listando minutas' });
  }
}

/**
 * GET /api/minutas/:id
 * Obtiene una minuta específica por ID
 */
async function getOne(req, res) {
  try {
    const service = ServiceFactory.getService(MinutaService, Minuta, User);

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const minuta = await service.getOne(id);
    if (!minuta) {
      return res.status(404).json({ error: 'Minuta no encontrada' });
    }

    return res.json(minuta);
  } catch (e) {
    logger.error('[MinutasController.getOne] Error:', { error: e.message, stack: e.stack });
    return res.status(500).json({ error: 'Error obteniendo minuta' });
  }
}

/**
 * POST /api/minutas
 * Crea una nueva minuta
 * Body validado por Zod middleware con MinutaCreateSchema
 */
async function create(req, res) {
  try {
    const service = ServiceFactory.getService(MinutaService, Minuta, User);

    // Obtener userId del usuario autenticado
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const minuta = await service.create(req.body, userId);

    logger.info('[MinutasController.create] Minuta creada', { 
      id: minuta.id, 
      hospital: minuta.hospital_code, 
      user: userId 
    });

    return res.status(201).json(minuta);
  } catch (e) {
    logger.error('[MinutasController.create] Error:', { error: e.message, stack: e.stack });
    
    if (e.message === 'Usuario no encontrado' || e.message.includes('datos_tabla')) {
      return res.status(400).json({ error: e.message });
    }
    
    return res.status(500).json({ error: 'Error creando minuta' });
  }
}

/**
 * PUT /api/minutas/:id
 * Actualiza una minuta existente
 * Body validado por Zod middleware con MinutaUpdateSchema
 */
async function update(req, res) {
  try {
    const service = ServiceFactory.getService(MinutaService, Minuta, User);

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const minuta = await service.update(id, req.body);

    logger.info('[MinutasController.update] Minuta actualizada', { 
      id: minuta.id, 
      user: req.user?.user_id || req.user?.id 
    });

    return res.json(minuta);
  } catch (e) {
    logger.error('[MinutasController.update] Error:', { error: e.message, stack: e.stack });
    
    if (e.message === 'Minuta no encontrada') {
      return res.status(404).json({ error: e.message });
    }
    
    if (e.message.includes('datos_tabla')) {
      return res.status(400).json({ error: e.message });
    }
    
    return res.status(500).json({ error: 'Error actualizando minuta' });
  }
}

/**
 * DELETE /api/minutas/:id
 * Elimina una minuta (solo admin y editor)
 */
async function remove(req, res) {
  try {
    const service = ServiceFactory.getService(MinutaService, Minuta, User);

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await service.remove(id);

    logger.info('[MinutasController.remove] Minuta eliminada', { 
      id, 
      user: req.user?.user_id || req.user?.id 
    });

    return res.status(204).send();
  } catch (e) {
    logger.error('[MinutasController.remove] Error:', { error: e.message, stack: e.stack });
    
    if (e.message === 'Minuta no encontrada') {
      return res.status(404).json({ error: e.message });
    }
    
    return res.status(500).json({ error: 'Error eliminando minuta' });
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove
};
