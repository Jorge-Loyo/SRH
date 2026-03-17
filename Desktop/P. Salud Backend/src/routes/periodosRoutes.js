const express = require('express');
const router = express.Router();
const controller = require('../controllers/periodosController');

// GET /api/periodos?hospital=HGACA&limit=12
router.get('/', controller.list);

module.exports = router;
