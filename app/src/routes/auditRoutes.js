const express = require('express');
const { list, purge } = require('../controllers/auditController');
const { authenticateJWT, requirePermission } = require('../middlewares/auth');

const router = express.Router();

router.get('/', authenticateJWT, requirePermission('can_view_audit'), list);
router.post('/purge', authenticateJWT, requirePermission('can_view_audit'), purge);

module.exports = router;
