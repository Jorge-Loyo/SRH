const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { sincronizar, getEstado, getLista, sincronizarCargos, getEstadoCargos } = require('./dotacionController');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'editor'));

// GET /api/dotacion/estado — última sincronización + totales (módulo legacy)
router.get('/estado', getEstado);

// GET /api/dotacion/lista — dot_resultado paginado con filtros (módulo legacy)
router.get('/lista', getLista);

// POST /api/dotacion/sincronizar — dot_resultado → dotacion (módulo legacy)
router.post('/sincronizar', sincronizar);

// ── Nuevos endpoints cargo_dotacion ──────────────────────────────────────────
// GET /api/dotacion/cargos/estado
router.get('/cargos/estado', getEstadoCargos);

// POST /api/dotacion/cargos/sincronizar
router.post('/cargos/sincronizar', sincronizarCargos);

module.exports = router;
