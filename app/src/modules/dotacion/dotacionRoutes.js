const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { sincronizar, getEstado, getLista, sincronizarCargos, getEstadoCargos, getKpis } = require('./dotacionController');

const router = express.Router();

router.use(authenticateJWT);

const ALL_GESTION = authorizeRoles('admin', 'editor', 'viewer', 'gerencia', 'concursales', 'autoridades');
const EDIT_ONLY   = authorizeRoles('admin', 'editor');

// GET /api/dotacion/kpis — visible para todos los roles con acceso a dotación
router.get('/kpis', ALL_GESTION, getKpis);

// GET /api/dotacion/estado
router.get('/estado', EDIT_ONLY, getEstado);

// GET /api/dotacion/lista
router.get('/lista', EDIT_ONLY, getLista);

// POST /api/dotacion/sincronizar
router.post('/sincronizar', EDIT_ONLY, sincronizar);

// ── Nuevos endpoints cargo_dotacion ──────────────────────────────────────────
router.get('/cargos/estado', EDIT_ONLY, getEstadoCargos);
router.post('/cargos/sincronizar', EDIT_ONLY, sincronizarCargos);

module.exports = router;
