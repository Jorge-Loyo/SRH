const express = require('express');
const controller = require('../controllers/pouController');
const { authenticateJWT } = require('../middlewares/auth');

const router = express.Router();

router.get('/periodos', authenticateJWT, controller.periodos);
router.get('/hospitales', authenticateJWT, controller.hospitales);
router.get('/comparar', authenticateJWT, controller.comparar);
router.get('/comparar/export', authenticateJWT, controller.compararExport);
router.get('/', authenticateJWT, controller.list);
router.get('/export', authenticateJWT, controller.exportXlsx);
router.get('/:id/:periodo', authenticateJWT, controller.getById);

module.exports = router;
