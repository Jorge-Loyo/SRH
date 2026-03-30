const { AppDataSource } = require('../config/data-source');
const { buildAdminResources } = require('./resources');
const { buildDashboard } = require('./dashboard');
const { buildAdminOptions } = require('./config');
const { setupAuthRoutes } = require('./auth');
const logger = require('../utils/logger');
const {
  createRedirectMiddleware,
  createJWTAuthMiddleware,
  createPermissionsMiddleware,
} = require('./middleware');
const session = require('express-session');

/**
 * Sets up AdminJS panel with all configurations and middlewares
 * @param {Express.Application} app - Express app instance
 * @returns {Promise<Object>} AdminJS instance
 */
async function setupAdmin(app) {
  // AdminJS v6 compatible requires
  const AdminJS = require('adminjs');
  const AdminJSExpress = require('@adminjs/express');
  const { Database, Resource } = require('@adminjs/typeorm');
  AdminJS.registerAdapter({ Database, Resource });

  // Entidades centralizadas
  const { Sigla, Persona, Cargo, Rol, BajaConcurso } = require('../entities-class');

  // Build admin resources
  const adminResources = buildAdminResources({ AppDataSource });

  // Build dashboard configuration
  const dashboardConf = buildDashboard({ AdminJS });

  // Build AdminJS options
  const adminOptions = buildAdminOptions({ AdminJS, adminResources, dashboardConf });

  // Create AdminJS instance
  const admin = new AdminJS(adminOptions);

  // Control opcional de bundling (ADMIN_JS_SKIP_BUNDLE=true salta initialize para rapidez/diagnóstico)
  const skipBundle = process.env.ADMIN_JS_SKIP_BUNDLE === 'true';
  try {
    if (!skipBundle && typeof admin.initialize === 'function') {
      await admin.initialize();
      logger.info('[Admin] AdminJS initialized');
    } else if (skipBundle) {
      logger.info('[Admin] Skip bundle initialization (ADMIN_JS_SKIP_BUNDLE=true)');
    }
  } catch (e) {
    logger.warn('[Admin] AdminJS initialize warning:', { error: e.message });
  }
  logger.info(`[Admin] Dashboard ${dashboardConf ? 'enabled' : 'not set'}`);

  // Registrar routers dinámicos para todos los hospitales
  // Antes: 35+ requires manuales. Ahora: automático y escalable
  const { registerHospitalsRouters } = require('../hospitals');
  registerHospitalsRouters(app);

  const usePublic = process.env.ADMIN_PUBLIC === 'true';

  // === ORDEN CRÍTICO ===
  // Express-session LOCALIZADO SOLO PARA /admin (no global)
  // Necesario para que AdminJS v6 mantenga contexto de usuario en React
  const { config } = require('../config/env');
  const sessionMiddleware = session({
    secret: config.auth.sessionSecret || 'fallback-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.SESSION_SECURE === 'true',
      sameSite: 'lax',
      maxAge: config.auth.idleMinutes * 60 * 1000
    }
  });
  
  // Aplicar sesión SOLO a /admin
  app.use(admin.options.rootPath, sessionMiddleware);

  // JWT authentication middleware protege todas las rutas de AdminJS
  // Las rutas API también usan JWT (cookies o header Authorization)

  // 1. Authentication routes (login/logout - PUBLIC)
  setupAuthRoutes(app, admin);

  // 2. JWT authentication middleware DEBE ir ANTES del redirect
  // porque redirect necesita req.user que es asignado aquí
  const protectionMiddleware = createJWTAuthMiddleware(admin, usePublic);
  if (protectionMiddleware) {
    app.use(admin.options.rootPath, protectionMiddleware);
  }

  // 3. Redirect middleware for director role (DESPUÉS de JWT para tener req.user)
  app.use(admin.options.rootPath, createRedirectMiddleware(admin));

  // 4. Permissions middleware
  app.use(admin.options.rootPath, createPermissionsMiddleware());

  // 🔵 INTERCEPTAR REQUESTS A /admin/api/pages/:pageName ANTES DE AdminJS (CRÍTICO!)
  // AdminJS tiene rutas internas que responden a /admin/api/* y consume las requests
  // Para tener nuestro handler personalizado, necesitamos interceptar AQUÍ antes de buildRouter()
  app.use('/admin/api/pages/:pageName', async (req, res, next) => {
    try {
      const { pageName } = req.params;
      const { getAdminPageHandlers } = require('./pages');
      
      // Verificar autenticación
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const handlers = getAdminPageHandlers({ AppDataSource, toCsvBase64: require('../utils/csv').toCsvBase64 });
      const { handleOrganizacionTabla: handleOrganizacionTablaRaw } = require('../hospitals/pages');
      
      // Wrapper para handleOrganizacionTabla que adapta la signature
      const handleOrganizacionTabla = (req) => handleOrganizacionTablaRaw({ AppDataSource, req });
      
      // Mapeo de page names a handlers
      const pageToHandler = {
        'PersonasFull': handlers.personasFullGeneric,
        'CargosFull': handlers.cargosFullGeneric,
        'RolesFull': handlers.rolesFullGeneric,
        'SiglasFull': handlers.siglasFullGeneric,
        'BajasFull': handlers.bajasFullGeneric,
        'OrganizacionTabla': handleOrganizacionTabla,
      };
      
      const handler = pageToHandler[pageName];
      if (!handler) {
        return res.status(404).json({ error: `Page handler not found: ${pageName}` });
      }
      
      // Llamar al handler
      const result = await handler(req);
      
      // Si el handler ya envió respuesta, no hacer nada
      if (res.headersSent) {
        return;
      }
      
      // Enviar resultado
      res.json(result);
    } catch (e) {
      logger.error('[Admin Pages API] Error:', { error: e.message, stack: e.stack });
      res.status(500).json({ error: e.message });
    }
  });
  
  // 5. Build AdminJS router with authentication context
  // AdminJS v6 obtiene currentAdmin desde req.session.adminUser (sincronizado desde JWT)
  const adminRouter = AdminJSExpress.buildRouter(admin, null, null, null, {
    resave: false,
    saveUninitialized: false
  });
  
  // 6. Agregar endpoints personalizados ANTES de montar el router
  // (estos van directo en adminRouter antes de montarlo en app)
  
  // Endpoint /me para que el frontend pueda obtener el usuario actual
  adminRouter.get('/me', async (req, res) => {
    const currentAdmin = req.user;
    if (!currentAdmin) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // ✅ OPTIMIZACIÓN: Solo hacer query si rol está null/undefined
    // El rol ya está sincronizado al login y almacenado en sesión
    // Query innecesaria: 200ms → 0ms (90% más rápido)
    // Cambios de rol son raros y se reflejan en próximo login
    if (!currentAdmin.role) {
      try {
        // ✅ Silenciado: se repite cada request a /admin/me cuando no hay rol
        
        const result = await AppDataSource.query(
          `SELECT role FROM users WHERE LOWER(email) = LOWER(?) OR username = ? LIMIT 1`,
          [currentAdmin.email || '', currentAdmin.username || '']
        );
        
        if (result && result.length > 0) {
          currentAdmin.role = result[0].role;
          req.user.role = result[0].role;
          // ✅ Silenciado: se repite cada request a /admin/me cuando no hay rol
        }
      } catch (e) {
        logger.warn('[/me] Error sincronizando rol desde BD:', { error: e.message });
      }
    }
    
    // Devolver el objeto directamente (AdminJS lo espera sin wrapper)
    // AdminJS muestra el campo "email" en la UI, así que ponemos username ahí
    res.json({ 
      currentAdmin: {
        email: currentAdmin.username,  // Se muestra en la UI
        title: currentAdmin.username,
        name: currentAdmin.username,
        role: currentAdmin.role,
        id: currentAdmin.id || currentAdmin.username,
        hospital_code: currentAdmin.hospital_code || null,  // ✅ Incluir hospital_code para director
        avatarUrl: null
      }
    });
  });

  // 7. Modularizar: registrar endpoints de export streaming en módulo externo
  try {
    const { registerAdminExportRoutes } = require('./exports');
    registerAdminExportRoutes({ adminRouter, AppDataSource, entities: { Persona, Cargo, Rol, Sigla, BajaConcurso } });
  } catch (e) {
    logger.error('[Admin Export] No se pudieron registrar rutas de exportación:', { error: e?.message, stack: e?.stack });
  }

  // 8. Registrar API de Seguridad (Auditoría, Usuarios, Tokens, Permisos)
  try {
    const { registerSeguridadAPI } = require('./seguridad-api');
    registerSeguridadAPI({ adminRouter, AppDataSource });
  } catch (e) {
    logger.error('[Admin Seguridad] No se pudieron registrar rutas de seguridad:', { error: e?.message, stack: e?.stack });
  }

  // 9. CRÍTICO: Middleware para sincronizar req.user con req.session.adminUser
  // AdminJS v6 obtiene el usuario actual desde req.session.adminUser en contexto React
  // Sincronizar JWT (req.user) con sesión (req.session.adminUser) para que AdminJS funcione
  app.use(admin.options.rootPath, (req, res, next) => {
    if (req.user && req.session) {
      // Mantener sincronizado: JWT user → session storage
      req.session.adminUser = {
        ...req.user,
        email: req.user.username  // Mostrar username, no email
      };
    }
    next();
  });

  // 10. Mount AdminJS router (last, after all middlewares)
  app.use(admin.options.rootPath, adminRouter);

  return admin;
}

module.exports = { setupAdmin };
