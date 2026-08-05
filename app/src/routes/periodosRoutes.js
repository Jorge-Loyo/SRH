const express = require('express');
const router = express.Router();
const controller = require('../controllers/periodosController');
const { authenticateJWT } = require('../middlewares/auth');

// GET /api/periodos?hospital=HGACA&limit=12
router.get('/', authenticateJWT, controller.list);

module.exports = router;
