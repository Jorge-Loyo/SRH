const { z } = require('zod');
const logger = require('../utils/logger');
const { config } = require('../config/env');
const {
  authenticateUser,
  getCurrentUser,
  refreshAccessToken,
  revokeUserSession,
} = require('../services/AuthService');
const { PAGE_PERMISSIONS } = require('../config/pagePermissions');
const mpService = require('../services/modulePermissionsService');

async function getAllowedModules(role) {
  return mpService.getForRole(role);
}

const LoginSchema = z.union([
  z.object({ email: z.string().email(), password: z.string().min(1) }),
  z.object({ username: z.string().min(1), password: z.string().min(1) }),
]);

/**
 * POST /api/auth/login - Autentica usuario
 */
async function login(req, res) {
  try {
    const { password, email, username } = LoginSchema.parse(req.body || {});
    const result = await authenticateUser(email, username, password);

    // Setear req.user para que el middleware de auditoría capture el usuario
    req.user = result.user;

    if (config.auth.cookies && result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });
    }

    return res.json({
      token: result.accessToken,
      accessToken: result.accessToken,
      refreshToken: config.auth.cookies ? undefined : result.refreshToken,
      user: result.user,
      allowedModules: await getAllowedModules(result.user?.role),
    });
  } catch (e) {
    if (e?.issues) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    logger.error('[AuthController.login]', { error: e.message });
    return res.status(500).json({ error: 'Error en login' });
  }
}

/**
 * GET /api/auth/me - Obtiene datos del usuario autenticado
 */
async function me(req, res) {
  try {
    const user = await getCurrentUser(req.user);
    return res.json({ user });
  } catch (e) {
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    logger.error('[AuthController.me]', { error: e.message });
    return res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

/**
 * POST /api/auth/refresh - Refresca el token de acceso
 */
async function refresh(req, res) {
  try {
    const { refreshToken: bodyToken } = req.body || {};
    const refreshToken = bodyToken || (config.auth.cookies ? req.cookies?.refreshToken : undefined);
    const result = await refreshAccessToken(refreshToken);

    if (config.auth.cookies) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });
      return res.json({ accessToken: result.accessToken, user: result.user ?? null, allowedModules: await getAllowedModules(result.user?.role) });
    }
    return res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken, user: result.user ?? null, allowedModules: await getAllowedModules(result.user?.role) });
  } catch (e) {
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    logger.error('[AuthController.refresh]', { error: e.message });
    return res.status(500).json({ error: 'Error al refrescar token' });
  }
}

/**
 * POST /api/auth/logout - Cierra la sesión del usuario
 */
async function logout(req, res) {
  try {
    const { refreshToken: bodyToken } = req.body || {};
    const refreshToken = bodyToken || (config.auth.cookies ? req.cookies?.refreshToken : undefined);
    await revokeUserSession(refreshToken);
    if (config.auth.cookies) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
    }
    return res.status(204).send();
  } catch (e) {
    if (e?.statusCode) {
      return res.status(e.statusCode).json({ error: e.message });
    }
    logger.error('[AuthController.logout]', { error: e.message });
    return res.status(500).json({ error: 'Error en logout' });
  }
}

module.exports = { login, me, refresh, logout };
