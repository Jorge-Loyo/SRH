const { Recorrida } = require('../entities-class/Recorrida');
const { User } = require('../entities-class/User');
const RecorridaService = require('../services/RecorridaService');
const { ServiceFactory } = require('../utils/serviceFactory');
const logger = require('../utils/logger');

/**
 * RecorridasController
 * 
 * Controlador HTTP para endpoints de Recorridas/Seguimientos.
 * Responsable de:
 * - Parseo y validación de HTTP requests (validación Zod en middleware)
 * - Delegación de lógica a RecorridaService
 * - Formateo de HTTP responses
 * - Manejo de errores HTTP
 * 
 * PERMISOS:
 * - GET, POST, PUT: admin, editor, viewer
 * - DELETE: admin, editor (configurado en rutas)
 * - EXCLUIDO: director (middleware authorizeRoles)
 */

/**
 * GET /api/recorridas
 * Lista recorridas con filtros opcionales y paginación
 */
async function list(req, res) {
  try {
    const service = ServiceFactory.getService(RecorridaService, Recorrida, User);

    const { hospital_code } = req.query;
    // ✅ MEDIO FIX: Usar pagination validada del middleware
    const { page, limit } = req.pagination || { page: 1, limit: 50 };
    
    const result = await service.list({
      hospital_code: hospital_code || undefined,
      page,
      limit
    });

    return res.json(result);
  } catch (e) {
    logger.error('[RecorridasController.list] Error:', { error: e.message, stack: e.stack });
    return res.status(500).json({ error: 'Error listando recorridas' });
  }
}

/**
 * GET /api/recorridas/:id
 * Obtiene una recorrida específica por ID
 */
async function getOne(req, res) {
  try {
    const service = ServiceFactory.getService(RecorridaService, Recorrida, User);

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const recorrida = await service.getOne(id);
    if (!recorrida) {
      return res.status(404).json({ error: 'Recorrida no encontrada' });
    }

    return res.json(recorrida);
  } catch (e) {
    logger.error('[RecorridasController.getOne] Error:', { error: e.message, stack: e.stack });
    return res.status(500).json({ error: 'Error obteniendo recorrida' });
  }
}

/**
 * POST /api/recorridas
 * Crea una nueva recorrida
 * Body validado por Zod middleware con RecorridaCreateSchema
 */
async function create(req, res) {
  try {
    const service = ServiceFactory.getService(RecorridaService, Recorrida, User);

    // Obtener userId del usuario autenticado
    const userId = req.user?.user_id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const recorrida = await service.create(req.body, userId);

    logger.info('[RecorridasController.create] Recorrida creada', { 
      id: recorrida.id, 
      hospital: recorrida.hospital_code, 
      user: userId 
    });

    return res.status(201).json(recorrida);
  } catch (e) {
    logger.error('[RecorridasController.create] Error:', { error: e.message, stack: e.stack });
    
    if (e.message === 'Usuario no encontrado') {
      return res.status(400).json({ error: e.message });
    }
    
    return res.status(500).json({ error: 'Error creando recorrida' });
  }
}

/**
 * PUT /api/recorridas/:id
 * Actualiza una recorrida existente
 * Body validado por Zod middleware con RecorridaUpdateSchema
 */
async function update(req, res) {
  try {
    const service = ServiceFactory.getService(RecorridaService, Recorrida, User);

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const recorrida = await service.update(id, req.body);

    logger.info('[RecorridasController.update] Recorrida actualizada', { 
      id: recorrida.id, 
      user: req.user?.user_id || req.user?.id 
    });

    return res.json(recorrida);
  } catch (e) {
    logger.error('[RecorridasController.update] Error:', { error: e.message, stack: e.stack });
    
    if (e.message === 'Recorrida no encontrada') {
      return res.status(404).json({ error: e.message });
    }
    
    return res.status(500).json({ error: 'Error actualizando recorrida' });
  }
}

/**
 * DELETE /api/recorridas/:id
 * Elimina una recorrida (solo admin y editor)
 */
async function remove(req, res) {
  try {
    const service = ServiceFactory.getService(RecorridaService, Recorrida, User);

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    await service.remove(id);

    logger.info('[RecorridasController.remove] Recorrida eliminada', { 
      id, 
      user: req.user?.user_id || req.user?.id 
    });

    return res.status(204).send();
  } catch (e) {
    logger.error('[RecorridasController.remove] Error:', { error: e.message, stack: e.stack });
    
    if (e.message === 'Recorrida no encontrada') {
      return res.status(404).json({ error: e.message });
    }
    
    return res.status(500).json({ error: 'Error eliminando recorrida' });
  }
}

module.exports = { list, getOne, create, update, remove };
