const { config } = require('../config/env');
const { AppDataSource } = require('../config/data-source');
const { validateJWTAndLoadUser } = require('../utils/jwtHelpers');
const { permissionCache } = require('../utils/permissionCache');
const { canAccessPage } = require('../config/pagePermissions');
const logger = require('../utils/logger');

// [REMOVED] createSessionMiddleware - AdminJS ahora usa JWT exclusivamente (migración completada)

/**
 * Creates redirect middleware for director role
 * @param {Object} admin - AdminJS instance
 * @returns {Function} Express middleware
 */
function createRedirectMiddleware(admin) {
  return (req, res, next) => {
    try {
      const user = req.user || null;
      if (user?.role === 'director') {
        // ✅ DIRECTOR: Redirigir al root/dashboard hacia su página personalizada
        const root = admin.options.rootPath;
        
        // Rutas que deben redirigir a la página de Director
        const atRoot = 
          req.path === '/' || 
          req.path === '' || 
          req.path === '/dashboard' ||
          req.path === '/pages/Panel' ||  // No debe ver Panel general
          req.path === '/pages/Hospitales';  // No debe ver lista de hospitales
        
        if (atRoot) {
          // ✅ Silenciado: se repite cada vez que director navega
          return res.redirect(`${root}/pages/Director`);
        }
      }
    } catch (e) {
      logger.warn('[Redirect] Error en redirect middleware:', { error: e.message });
    }
    next();
  };
}

/**
 * Creates protection middleware (requires authentication)
 * @param {Object} admin - AdminJS instance
 * @param {boolean} usePublic - Whether admin panel is public
 * @returns {Function|null} Express middleware or null if public
 */
function createProtectionMiddleware(admin, usePublic) {
  if (usePublic) return null;
  
  return (req, res, next) => {
    const open = req.path === '/login' || req.path === '/logout';
    if (open) return next();
    if (!req.user) return res.redirect(admin.options.rootPath + '/login');
    next();
  };
}

/**
 * Creates JWT authentication middleware (JWT-only, no session fallback)
 * Validates JWT from cookie and checks if token is revoked
 * 
 * @param {Object} admin - AdminJS instance
 * @param {boolean} usePublic - Whether admin panel is public
 * @returns {Function|null} Express middleware or null if public
 */
function createJWTAuthMiddleware(admin, usePublic) {
  if (usePublic) return null;
  
  return async (req, res, next) => {
    const rootPath = admin.options.rootPath;
    
    // 1. Public routes
    const isPublicRoute = req.path === '/login' || req.path === '/logout';
    if (isPublicRoute) return next();
    
    // 2. Get JWT from cookie
    const accessToken = req.cookies?.accessToken;
    if (!accessToken) {
      logger.info('[JWT] No access token found, redirecting to login');
      return res.redirect(rootPath + '/login');
    }
    
    // 3. Validate JWT and load user
    const user = await validateJWTAndLoadUser(accessToken);
    if (!user) {
      logger.info('[JWT] Invalid token, clearing cookies and redirecting');
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.redirect(rootPath + '/login');
    }
    
    // 4. Check if this specific token is revoked
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(accessToken);
      
      if (decoded?.jti) {
        const { RefreshToken } = require('../entities-class/RefreshToken');
        const rtRepo = AppDataSource.getRepository(RefreshToken);
        
        // Check if this specific token is revoked
        const token = await rtRepo.findOne({
          where: { jti: decoded.jti }
        });
        
        if (token && token.revoked) {
          logger.info('[JWT] Token is revoked, logging out', { jti: decoded.jti, username: user.username });
          res.clearCookie('accessToken');
          res.clearCookie('refreshToken');
          return res.redirect(rootPath + '/login');
        }
      }
    } catch (e) {
      logger.warn('[JWT] Error checking token revocation:', { error: e.message });
    }
    
    // 5. IDLE TIMEOUT: Auto-refresh JWT con ventana deslizante
    // Renueva el token si ya pasó más de la mitad de la vida útil,
    // lo que garantiza que cualquier actividad reinicia el contador completo.
    try {
      const jwt = require('jsonwebtoken');
      const { generateJWT } = require('../utils/jwtHelpers');
      const decoded = jwt.decode(accessToken);
      
      if (decoded?.exp) {
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        const halfLifeSeconds = Math.floor(config.auth.idleMinutes * 60 * 0.5);
        
        if (timeUntilExpiry < halfLifeSeconds && timeUntilExpiry > 0) {
          // Token is expiring soon but not yet expired - generate new one
          const newAccessToken = generateJWT(user);
          res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.SESSION_SECURE === 'true',
            sameSite: 'lax',
            path: '/',
            maxAge: config.auth.idleMinutes * 60 * 1000
          });
          // ✅ Silenciado: verbose, se repite cuando token está por expirar
        }
      }
    } catch (e) {
      logger.warn('[JWT] Error during auto-refresh:', { error: e.message });
    }
    
    req.user = user;
    
    // 7. IMPORTANT: Also set req.currentAdmin for AdminJS context
    // AdminJS expects currentAdmin in ctx, which is populated from req.currentAdmin by the framework
    // Override email field to show username in UI
    req.currentAdmin = {
      ...user,
      email: user.username  // Show username instead of email in AdminJS UI
    };
    
    // ✅ Silenciado: se repite cada request, no agrega valor
    return next();
  };
}

/**
 * Creates permissions middleware (checks user permissions from DB)
 * @returns {Function} Express middleware
 */
function createPermissionsMiddleware() {
  return async (req, res, next) => {
    const user = req.user;
    if (!user || !user.role) return next();

    try {
      // Obtener permisos desde caché (evita N+1 query)
      const permissions = await permissionCache.getPermissions(user.role);

      if (permissions) {
        // Almacenar permisos en la sesión para acceso rápido (ahora existe: express-session en /admin)
        if (req.session) {
          req.session.permissions = permissions;
        }
        
        // ✅ Agregar permisos al objeto user para que AdminJS los pueda usar
        // AdminJS accede a estos permisos en resources.js via currentAdmin.permissions
        user.permissions = permissions;
        
        // Filtrar acceso a Navigation (recursos en sidebar)
        // Solo ADMIN y EDITOR pueden acceder a recursos CRUD
        if (req.path.startsWith('/resources/')) {
          const canAccessResources = user.role === 'admin' || user.role === 'editor';
          if (!canAccessResources) {
            return res.status(403).send('Acceso denegado: sin permisos para ver recursos CRUD');
          }
        }

        // Filtrar acceso a Pages personalizadas
        // Control por rol sin depender de BD
        if (req.path.startsWith('/pages/')) {
          // 🔍 Extraer nombre de página limpiamente (sin query params)
          const pagePath = req.path.split('?')[0]; // Remove query string
          const pageMatch = pagePath.match(/^\/pages\/([^\/]+)$/);
          
          // ❌ Validar que el nombre de página sea válido (no [object Object] u otro basura)
          if (!pageMatch || !pageMatch[1] || pageMatch[1].includes('[') || pageMatch[1].includes(']')) {
            logger.warn('[Permissions] URL de página inválida detectada', { 
              user: user.username, 
              path: req.path,
              pagePath: pagePath
            });
            return res.status(400).send('URL inválida');
          }
          
          const pageName = pageMatch[1];
          
          // ✅ FIX: Usar configuración centralizada de permisos
          if (!canAccessPage(user.role, pageName)) {
            logger.warn('[Permissions] Acceso denegado a página', { 
              user: user.username, 
              role: user.role, 
              page: pageName 
            });
            return res.status(403).send('Acceso denegado: sin permisos para ver esta página');
          }
        }
      }
    } catch (e) {
      logger.warn('[Permissions] Error cargando permisos:', { error: e.message });
    }

    next();
  };
}

module.exports = {
  // createSessionMiddleware, // ❌ REMOVED: AdminJS migrado a JWT exclusivamente
  createRedirectMiddleware,
  createProtectionMiddleware,
  createJWTAuthMiddleware,
  createPermissionsMiddleware,
};
