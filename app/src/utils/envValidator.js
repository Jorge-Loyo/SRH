const logger = require('./logger');

/**
 * Valida que variables de entorno críticas estén configuradas
 * en producción. Falla fast si hay problemas.
 */
function validateEnvironment() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProd = nodeEnv === 'production';
  
  const errors = [];
  
  // En producción: variables REQUERIDAS
  if (isProd) {
    const required = {
      'JWT_SECRET': 'Clave para firmar JWT (generar: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")',
      'SESSION_SECRET': 'Clave para sesiones (generar: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))")',
      'DB_HOST': 'Host de base de datos',
      'DB_USER': 'Usuario de base de datos',
      'DB_PASSWORD': 'Contraseña de base de datos (no dejar vacío)',
      'DB_NAME': 'Nombre de base de datos'
    };
    
    Object.entries(required).forEach(([key, desc]) => {
      const val = process.env[key];
      
      // Verificar que esté configurado
      if (!val || val.trim() === '') {
        errors.push(`❌ ${key}: NO configurado (${desc})`);
        return;
      }
      
      // Verificar que NO use defaults inseguros
      if (val === 'session-secret' || val === 'admin123') {
        errors.push(`❌ ${key}: usa valor por defecto inseguro (${desc})`);
        return;
      }
    });
    
    // 🔴 BLOQUEANTE: SESSION_SECURE debe ser true en producción
    if (process.env.SESSION_SECURE !== 'true') {
      errors.push('❌ SESSION_SECURE: debe ser "true" en producción (cookies requieren HTTPS)');
    }
    
    // 🔴 BLOQUEANTE: JWT_SECRET debe tener mínimo 32 caracteres
    const jwtSecret = process.env.JWT_SECRET || '';
    if (jwtSecret.length < 32) {
      errors.push(`❌ JWT_SECRET: debe tener al menos 32 caracteres (actual: ${jwtSecret.length})`);
    }
    
    // 🔴 BLOQUEANTE: SESSION_SECRET debe tener mínimo 32 caracteres
    const sessionSecret = process.env.SESSION_SECRET || '';
    if (sessionSecret.length < 32) {
      errors.push(`❌ SESSION_SECRET: debe tener al menos 32 caracteres (actual: ${sessionSecret.length})`);
    }
    
    // ⚠️ WARNING: TRUST_PROXY no configurado (IPs incorrectas en audit)
    if (!process.env.TRUST_PROXY) {
      logger.warn('[Env] TRUST_PROXY no configurado - audit logs tendrán IPs de proxy en lugar de cliente real');
    }
    
    if (process.env.ADMIN_PASSWORD === 'admin123') {
      errors.push('❌ ADMIN_PASSWORD: usa default "admin123"');
    }
  }
  
  // En desarrollo: solo warnings
  if (!isProd) {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'session-secret') {
      logger.warn('[Env] JWT_SECRET no configurado (dev mode, ok)');
    }
  }
  
  // Si hay errores en producción: fallar inmediatamente
  if (errors.length > 0 && isProd) {
    logger.error('[Env] Validación fallida - startup bloqueado', { errors });
    console.error('\n🚨 ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach(e => console.error('  ' + e));
    console.error('\n📖 Ver .env.production.example para template\n');
    process.exit(1);
  }
  
  logger.info('[Env] Environment validation passed', { nodeEnv });
}

module.exports = { validateEnvironment };
