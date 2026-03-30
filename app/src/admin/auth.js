const path = require('path');
const bodyParser = require('body-parser');
const { config } = require('../config/env');
const { AppDataSource } = require('../config/data-source');
const { permissionCache } = require('../utils/permissionCache');
const logger = require('../utils/logger');

/**
 * Authenticates admin user credentials
 * @param {string} email - User email or username
 * @param {string} password - User password
 * @returns {Promise<Object|null>} User object if authenticated, null otherwise
 */
async function adminAuthenticate(email, password) {
  try {
    const { User } = require('../entities-class/User');
    const { AuditLog } = require('../entities-class/AuditLog');
    const { comparePassword } = require('../utils/passwordHelpers');
    
    const repo = AppDataSource.getRepository(User);
    const u = await repo.findOne({ where: [{ email: email.toLowerCase() }, { username: email }] });
    
    if (!u || !u.is_active) {
      // Usuario no encontrado o inactivo
      await logFailedLogin(email);
      return null;
    }
    
    if (!comparePassword(password, u.password_hash)) {
      // Contraseña incorrecta
      await logFailedLogin(email);
      return null;
    }
    
    // ✅ Usuario válido - cargar permisos desde caché (evita query repetida)
    let permissions = null;
    try {
      permissions = await permissionCache.getPermissions(u.role);
    } catch (e) {
      // Silenciado: permisos de caché no son críticos para login
    }
    
    // Audit login success
    try {
      const auditRepo = AppDataSource.getRepository(AuditLog);
      await auditRepo.save({
        user_username: u.username,
        user_role: u.role,
        source: 'auth',
        action: 'login_success',
        resource: 'auth',
        method: 'POST',
        path: '/admin/login',
        status: 200,
      });
    } catch {}
    
    return { 
      id: u.id,
      email: u.email, 
      role: u.role, 
      username: u.username, 
      hospital_code: u.hospital_code || null,  // Usar nombre correcto del campo (no 'hospital')
      // ❌ DO NOT include permissions object - AdminJS v6 will serialize it as [object Object]
      // permissions are handled separately in middleware/permissions cache
    };
  } catch (e) {
    logger.error('[Auth] Error en autenticación:', { error: e.message, stack: e.stack });
    await logFailedLogin(email);
    return null;
  }
}

/**
 * Helper para registrar intentos fallidos de login
 */
async function logFailedLogin(email) {
  try {
    const { User } = require('../entities-class/User');
    const { AuditLog } = require('../entities-class/AuditLog');
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: [{ email: email.toLowerCase() }, { username: email }] });
    const auditRepo = AppDataSource.getRepository(AuditLog);
    await auditRepo.save({
      user_username: user?.username || email,
      user_role: null,
      source: 'auth',
      action: 'login_fail',
      resource: 'auth',
      method: 'POST',
      path: '/admin/login',
      status: 401,
    });
  } catch {}
}

/**
 * Sets up authentication routes for AdminJS panel
 * @param {Express.Application} app - Express app instance
 * @param {Object} admin - AdminJS instance
 */
function setupAuthRoutes(app, admin) {
  // Página de login personalizada (GET)
  app.get(admin.options.rootPath + '/login', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', '..', 'public', 'admin', 'login.html'));
  });

  // POST /admin/login propio (reemplaza render nativo con redirect a nuestra página con ?error)
  const urlencoded = bodyParser.urlencoded({ extended: true });
  let loginLimiter = null;
  try { ({ loginLimiter } = require('../middlewares/rateLimiters')); } catch {}
  const loginChain = [urlencoded];
  if (loginLimiter) loginChain.unshift(loginLimiter);

  // Contador de intentos fallidos por IP (usando req.rateLimit)
  app.post(admin.options.rootPath + '/login', loginChain, async (req, res) => {
    // Sanitización básica del email (rechazar caracteres peligrosos)
    const email = String((req.body && req.body.email) || '').replace(/[^\w@.\-]/g, '').trim();
    // Password: NO sanitizar para no debilitar passwords fuertes
    // La validación se hace con bcrypt.compareSync que es seguro contra inyección
    const password = String((req.body && req.body.password) || '').trim();
    
    const user = await adminAuthenticate(email, password);
    // Intentos restantes (si rate limiter está activo)
    let left = null;
    if (req.rateLimit) {
      left = Math.max(0, req.rateLimit.remaining);
    }
    if (!user) {
      let url = admin.options.rootPath + '/login?error=1';
      if (left !== null) url += `&left=${left}`;
      return res.redirect(url);
    }
    
    // ===== JWT MIGRATION: Generar JWT en lugar de usar session =====
    const { generateJWT } = require('../utils/jwtHelpers');
    const crypto = require('crypto');
    
    // Generar family_id para vincular access token con refresh token
    const family_id = crypto.randomBytes(6).toString('hex');
    
    // Generar JTI PRIMERO (antes de crear el JWT)
    const jti = crypto.randomBytes(8).toString('hex');
    
    // Crear access token JWT con jti incluido en el payload
    const accessToken = generateJWT(user, null, jti);
    
    // Guardar access token en cookie HttpOnly
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.SESSION_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: config.auth.idleMinutes * 60 * 1000  // Usa AUTH_IDLE_MINUTES de config
    });
    
    // Crear un RefreshToken para trackear esta sesión de AdminJS
    try {
      const { RefreshToken } = require('../entities-class/RefreshToken');
      const { AppDataSource } = require('../config/data-source');
      const repo = AppDataSource.getRepository(RefreshToken);
      
      // Generar token único
      const raw = crypto.randomBytes(64).toString('hex');
      const token_hash = crypto
        .createHash('sha256')
        .update(raw)
        .digest('hex');
      
      // jti ya fue generado arriba
      const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días
      
      await repo.save({
        token_hash,
        jti,
        family_id,
        user: { id: user.id },  // Pasar referencia de usuario por ID
        expires_at,
        revoked: false,
        last_used: new Date(),
        replaced_by_jti: null,
        revoked_reason: null
      });
    } catch (e) {
      // Si falla la creación del token, no bloqueamos el login
    }
    
    return res.redirect(admin.options.rootPath);
  });

  // Logout explícito (POST y GET para compatibilidad con enlaces)
  const destroySession = (req, res) => {
    // Limpiar cookies JWT
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    // También destruir sesión express (por si queda algo)
    if (req.session) {
      req.session.destroy(() => res.redirect(303, admin.options.rootPath + '/login'));
    } else {
      res.redirect(303, admin.options.rootPath + '/login');
    }
  };
  app.post(admin.options.rootPath + '/logout', destroySession);
  app.get(admin.options.rootPath + '/logout', (req, res) => {
    // Limpiar cookies JWT
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    if (req.session) {
      req.session.destroy(() => res.redirect(303, admin.options.rootPath + '/login'));
    } else {
      res.redirect(303, admin.options.rootPath + '/login');
    }
  });
}

module.exports = { adminAuthenticate, setupAuthRoutes };
