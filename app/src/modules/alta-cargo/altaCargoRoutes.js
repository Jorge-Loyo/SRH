const express = require('express');
const { listAltas, getAlta, createAlta } = require('./altaCargoController');
const { listCarreras, listSiglas, searchBajas, listEspecialidades, listModalidades, listNewCargo, exportNewCargo, getNewCargoInfo, updateNewCargo, listEtiquetas, createEtiqueta, listPuestos } = require('./carrerasController');
const { uploadDotacion } = require('./uploadController');
const { authenticateJWT, authorizeRoles } = require('../../middlewares/auth');
const { auditMiddleware }                 = require('../../middlewares/audit');

const router = express.Router();

/**
 * Módulo Alta de Cargo
 * Base: /api/cargos/alta
 */

// Catálogos
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/etiquetas',    authenticateJWT, listEtiquetas);
router.post('/etiquetas',   authenticateJWT, authorizeRoles('admin', 'editor'), createEtiqueta);
router.get('/puestos',        authenticateJWT, listPuestos);
router.get('/carreras',       authenticateJWT, listCarreras);
router.get('/siglas',         authenticateJWT, listSiglas);
router.get('/modalidades',    authenticateJWT, listModalidades);
router.get('/new-cargo',        authenticateJWT, listNewCargo);
router.get('/new-cargo/export', authenticateJWT, exportNewCargo);
router.get('/new-cargo/:id',    authenticateJWT, getNewCargoInfo);
router.patch('/new-cargo/:id',  authenticateJWT, authorizeRoles('admin', 'editor'), updateNewCargo);
router.get('/bajas/search',   authenticateJWT, searchBajas);
router.get('/especialidades', authenticateJWT, listEspecialidades);
router.post('/upload-dotacion', authenticateJWT, authorizeRoles('admin', 'editor'), upload.single('file'), uploadDotacion);

router.get('/',    authenticateJWT, listAltas);
router.get('/:id', authenticateJWT, getAlta);
router.post(
  '/',
  authenticateJWT,
  authorizeRoles('admin', 'editor', 'concursales'),
  auditMiddleware,
  createAlta,
);

module.exports = router;
