const express = require('express');
const { getKpis, getKpisCeetps } = require('./tableroKpisController');
const { authenticateJWT } = require('../../middlewares/auth');

const router = express.Router();

/**
 * Módulo Tablero — KPIs de Procesos Concursales
 * Base: /api/concursales/tablero
 */
router.get('/kpis',        authenticateJWT, getKpis);
router.get('/kpis-ceetps', authenticateJWT, getKpisCeetps);

module.exports = router;
