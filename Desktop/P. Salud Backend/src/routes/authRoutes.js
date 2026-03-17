const express = require('express');
const { login, me, refresh, logout } = require('../controllers/authController');
const { authenticateJWT } = require('../middlewares/auth');
const { loginLimiter, refreshLimiter } = require('../middlewares/rateLimiters');

const router = express.Router();

router.post('/login', loginLimiter, login);
router.get('/me', authenticateJWT, me);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);

module.exports = router;
