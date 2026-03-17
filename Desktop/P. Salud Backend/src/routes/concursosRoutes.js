const express = require('express');
const {
  listConcursos,
  getConcurso,
  createConcurso,
  updateConcurso,
  deleteConcurso,
  searchConcursos,
  getStatsByHospital,
  getUniqueStates,
  bulkCreateConcursos,
} = require('../controllers/concursosController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');
const { auditMiddleware } = require('../middlewares/audit');

const router = express.Router();

/**
 * Estadísticas y estados (GET antes de :id para evitar conflicto de rutas)
 */
router.get('/stats/by-hospital', authenticateJWT, getStatsByHospital);
router.get('/states/unique', authenticateJWT, getUniqueStates);

/**
 * Búsqueda textual
 */
router.get('/search', authenticateJWT, searchConcursos);

/**
 * CRUD Estándar
 */
router.get('/', authenticateJWT, listConcursos);
router.post('/', authenticateJWT, authorizeRoles('admin', 'editor'), auditMiddleware, createConcurso);

/**
 * Importación masiva (bulk)
 */
router.post('/bulk', authenticateJWT, authorizeRoles('admin', 'editor'), auditMiddleware, bulkCreateConcursos);

/**
 * Por ID
 */
router.get('/:id', authenticateJWT, getConcurso);
router.put('/:id', authenticateJWT, authorizeRoles('admin', 'editor'), auditMiddleware, updateConcurso);
router.delete('/:id', authenticateJWT, authorizeRoles('admin'), auditMiddleware, deleteConcurso);

module.exports = router;
