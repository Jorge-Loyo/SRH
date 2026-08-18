const express = require('express');
const {
  getConjuntosConfig, saveConjuntosConfig,
  getConjuntosCeetpsConfig, saveConjuntosCeetpsConfig,
} = require('./conjuntosConfigController');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { auditMiddleware } = require('../../middlewares/audit');

const router = express.Router();

// CPH — gerencia edita CPH (no ve CEETPS)
router.get('/conjuntos',        authenticateJWT, authorizeRoles('admin', 'editor', 'gerencia', 'concursales'), getConjuntosConfig);
router.put('/conjuntos',        authenticateJWT, authorizeRoles('admin', 'editor', 'gerencia'), auditMiddleware, saveConjuntosConfig);

// CEETPS — concursales edita CEETPS (no ve CPH)
router.get('/conjuntos-ceetps', authenticateJWT, authorizeRoles('admin', 'editor', 'gerencia', 'concursales'), getConjuntosCeetpsConfig);
router.put('/conjuntos-ceetps', authenticateJWT, authorizeRoles('admin', 'editor', 'concursales'), auditMiddleware, saveConjuntosCeetpsConfig);

module.exports = router;
