const express = require('express');
const controller = require('../controllers/schemaController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// 🔴 SEGURIDAD: Schema endpoints SIEMPRE requieren autenticación + rol admin
router.get('/', authenticateJWT, authorizeRoles('admin'), controller.list);
router.get('/:table', authenticateJWT, authorizeRoles('admin'), controller.table);

module.exports = router;
