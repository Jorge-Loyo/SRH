const express = require('express');
const {
  getConjuntosConfig, saveConjuntosConfig,
  getConjuntosCeetpsConfig, saveConjuntosCeetpsConfig,
} = require('./conjuntosConfigController');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { auditMiddleware } = require('../../middlewares/audit');

const router = express.Router();

// CPH
router.get('/conjuntos',        authenticateJWT, authorizeRoles('admin', 'editor', 'gerencia', 'concursales'), getConjuntosConfig);
router.put('/conjuntos',        authenticateJWT, authorizeRoles('admin', 'editor'), auditMiddleware, saveConjuntosConfig);

// CEETPS
router.get('/conjuntos-ceetps', authenticateJWT, authorizeRoles('admin', 'editor', 'gerencia', 'concursales'), getConjuntosCeetpsConfig);
router.put('/conjuntos-ceetps', authenticateJWT, authorizeRoles('admin', 'editor'), auditMiddleware, saveConjuntosCeetpsConfig);

module.exports = router;
