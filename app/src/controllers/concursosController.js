const { z } = require('zod');
const {
  concursoCreateSchema,
  concursoUpdateSchema,
  paginationSchema,
} = require('../schemas/concursoSchema');
const ConcursoService = require('../services/ConcursoService');
const logger = require('../utils/logger');

const concursoService = new ConcursoService();

/**
 * GET /api/concursos
 * Obtener lista de concursos con paginación y filtros
 */
async function listConcursos(req, res) {
  try {
    // Validar query params
    const queryParams = paginationSchema.parse(req.query);

    const { rows, count } = await concursoService.list(queryParams);

    res.json({
      data: rows,
      meta: {
        count,
        limit: queryParams.limit,
        offset: queryParams.offset,
      },
    });
  } catch (error) {
    logger.error('[concursosController] Error listing concursos', {
      error: error.message,
      query: req.query,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/concursos/:id
 * Obtener un concurso por ID
 */
async function getConcurso(req, res) {
  try {
    const { id } = req.params;
    const id_concurso = parseInt(id, 10);

    if (isNaN(id_concurso)) {
      return res.status(400).json({ error: 'Invalid concurso ID' });
    }

    const concurso = await concursoService.getById(id_concurso);

    if (!concurso) {
      return res.status(404).json({ error: 'Concurso not found' });
    }

    res.json(concurso);
  } catch (error) {
    logger.error('[concursosController] Error getting concurso', {
      error: error.message,
      id: req.params.id,
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/concursos
 * Crear un nuevo concurso
 */
async function createConcurso(req, res) {
  try {
    // Validar body
    const data = concursoCreateSchema.parse(req.body);

    const concurso = await concursoService.create(data);

    res.status(201).json({
      message: 'Concurso created successfully',
      data: concurso,
    });
  } catch (error) {
    logger.warn('[concursosController] Error creating concurso', {
      error: error.message,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes('required')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PUT /api/concursos/:id
 * Actualizar un concurso
 */
async function updateConcurso(req, res) {
  try {
    const { id } = req.params;
    const id_concurso = parseInt(id, 10);

    if (isNaN(id_concurso)) {
      return res.status(400).json({ error: 'Invalid concurso ID' });
    }

    // Validar body
    const data = concursoUpdateSchema.parse(req.body);

    const concurso = await concursoService.update(id_concurso, data);

    res.json({
      message: 'Concurso updated successfully',
      data: concurso,
    });
  } catch (error) {
    logger.warn('[concursosController] Error updating concurso', {
      error: error.message,
      id: req.params.id,
    });

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
    }

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/concursos/:id
 * Eliminar un concurso
 */
async function deleteConcurso(req, res) {
  try {
    const { id } = req.params;
    const id_concurso = parseInt(id, 10);

    if (isNaN(id_concurso)) {
      return res.status(400).json({ error: 'Invalid concurso ID' });
    }

    const deleted = await concursoService.delete(id_concurso);

    if (!deleted) {
      return res.status(404).json({ error: 'Concurso not found' });
    }

    res.json({ message: 'Concurso deleted successfully' });
  } catch (error) {
    logger.error('[concursosController] Error deleting concurso', {
      error: error.message,
      id: req.params.id,
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/concursos/search?query=...
 * Búsqueda textual de concursos
 */
async function searchConcursos(req, res) {
  try {
    const { q, limit = 50, offset = 0 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const { rows, count } = await concursoService.search(q, {
      limit: parseInt(limit, 10) || 50,
      offset: parseInt(offset, 10) || 0,
    });

    res.json({
      data: rows,
      meta: {
        count,
        query: q,
      },
    });
  } catch (error) {
    logger.error('[concursosController] Error searching concursos', {
      error: error.message,
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/concursos/stats/by-hospital
 * Obtener estadísticas de concursos por hospital
 */
async function getStatsByHospital(req, res) {
  try {
    const stats = await concursoService.getStatsByHospital();

    res.json({
      data: stats,
      meta: {
        total_hospitals: [...new Set(stats.map((s) => s.hospital))].length,
      },
    });
  } catch (error) {
    logger.error('[concursosController] Error getting stats', {
      error: error.message,
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/concursos/states/unique
 * Obtener estados únicos de concursos
 */
async function getUniqueStates(req, res) {
  try {
    const states = await concursoService.getUniqueStates();

    res.json({
      data: states,
      meta: {
        count: states.length,
      },
    });
  } catch (error) {
    logger.error('[concursosController] Error getting unique states', {
      error: error.message,
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/concursos/bulk
 * Importar múltiples concursos (útil para carga desde CSV)
 */
async function bulkCreateConcursos(req, res) {
  try {
    const { concursos } = req.body;

    if (!Array.isArray(concursos)) {
      return res
        .status(400)
        .json({ error: 'Body must contain an array of concursos' });
    }

    const result = await concursoService.bulkCreate(concursos);

    res.status(201).json({
      message: 'Bulk import completed',
      data: result,
    });
  } catch (error) {
    logger.error('[concursosController] Error in bulk create', {
      error: error.message,
    });

    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  listConcursos,
  getConcurso,
  createConcurso,
  updateConcurso,
  deleteConcurso,
  searchConcursos,
  getStatsByHospital,
  getUniqueStates,
  bulkCreateConcursos,
};
