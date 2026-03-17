const { config } = require('../config/env');
const { AppDataSource } = require('../config/data-source');
const { RefreshToken } = require('../entities-class/RefreshToken');
const { validateJWTAndLoadUser } = require('../utils/jwtHelpers');
const logger = require('../utils/logger');

/**
 * Middleware que valida JWT desde header Authorization o cookie accessToken
 * Usado en todas las rutas de API después de migración JWT-only
 */
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = req.cookies?.accessToken;
  const token = headerToken || cookieToken;
  
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  
  try {
    // Validate JWT and load user from database (extracted to jwtHelpers)
    const user = await validateJWTAndLoadUser(token);
    if (!user) return res.status(401).json({ error: 'Token inválido' });
    
    req.user = user;
    
    // Update last_used for refresh token on activity when using cookies
    if (config.auth.cookies && req.cookies?.refreshToken) {
      const token_hash = require('crypto').createHash('sha256').update(req.cookies.refreshToken).digest('hex');
      const repo = AppDataSource.getRepository(RefreshToken);
      // Fire-and-forget update (no await to avoid blocking request)
      // Using update() instead of find+save for better performance and less race condition risk
      repo.update(
        { token_hash, revoked: false },
        { last_used: new Date() }
      ).catch(() => {}); // Silently ignore errors (audit update is non-critical)
    }
    
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function authorizeRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const ok = allowed.includes(req.user.role);
    if (!ok) return res.status(403).json({ error: 'No autorizado' });
    next();
  };
}

function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    const hasPermission = req.user.permissions?.some((p) => p.permission_key === permissionKey);
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Permiso denegado', 
        required: permissionKey,
        role: req.user.role 
      });
    }
    
    next();
  };
}

module.exports = { authenticateJWT, authorizeRoles, requirePermission };
