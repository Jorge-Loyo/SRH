const express = require('express');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { sincronizar, getEstado, getLista } = require('./dotacionController');

const router = express.Router();

router.use(authenticateJWT);
router.use(authorizeRoles('admin', 'editor'));

// GET /api/dotacion/estado — última sincronización + totales
router.get('/estado', getEstado);

// GET /api/dotacion/lista — dot_resultado paginado con filtros
router.get('/lista', getLista);

// POST /api/dotacion/sincronizar — ejecutar sincronización dot_resultado → dotacion
router.post('/sincronizar', sincronizar);

module.exports = router;
