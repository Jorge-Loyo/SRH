const express = require('express');
const controller = require('../controllers/pouController');
const { authenticateJWT } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateJWT, controller.list);
router.get('/:id/:periodo', authenticateJWT, controller.getById);

module.exports = router;
