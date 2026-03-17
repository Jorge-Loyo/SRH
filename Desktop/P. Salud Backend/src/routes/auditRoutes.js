const express = require('express');
const { list, purge } = require('../controllers/auditController');
const { authenticateJWT, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateJWT, authorizeRoles('admin'), list);
router.post('/purge', authenticateJWT, authorizeRoles('admin'), purge);

module.exports = router;
