const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { config, getDbTestQuery } = require('./config/env');
const { AppDataSource } = require('./config/data-source');
const apiRoutes = require('./routes');
const { auditMiddleware } = require('./middlewares/audit');
const logger = require('./utils/logger');

/**
 * Creates and configures Express application
 * @param {Object} options - { AppDataSource, toCsvBase64 }
 * @returns {Express.Application} Configured Express app
 */
function createApp(options = {}) {
  const { AppDataSource, toCsvBase64 } = options
  const app = express();

  // Compresión HTTP (gzip/brotli) para reducir payload de responses en 70-80%
  app.use(compression({ 
    level: 6, // Balance entre velocidad y ratio de compresión
    threshold: 1024 // Solo comprimir responses mayores a 1KB
  }));

  // Security headers via Helmet (deshabilitado contentSecurityPolicy para AdminJS bundle)
  // Agregar headers de seguridad adicionales
  app.use(helmet({ 
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  
  // Remover header X-Powered-By (info leak - no exponer que es Express)
  app.disable('x-powered-by');

  // COOKIE PARSER (CRÍTICO para res.cookie() y JWT en cookies)
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // ============= OPTIMIZACIÓN: Request Logging con Morgan =============
  // Logging estándar de requests HTTP (dev format en desarrollo, combined en producción)
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // ✅ [DEBUG] Middleware to detect [object Object] serialization issues
  // ROOT CAUSE: AdminJS v6 serializes complex objects as [object Object] when:
  // - Permissions object passed to can() functions
  // - Custom data structures in filters/dropdowns
  // FIX: Use permissionsCache instead, avoid complex objects in AdminJS configuration
  app.use((req, res, next) => {
    if (req.path.includes('[object%20Object]') || req.path.includes('[object Object]')) {
      // ✅ Silenciado: No loguear estos errores de AdminJS (conocido y sin impacto)
      // 🔴 BLOQUEANTE: Rechazar requests con [object Object] para evitar ruido en BD
      // y fallos de routing impredecibles
      return res.status(400).json({ error: 'Invalid request format detected' });
    }
    next();
  });

  // Servir assets estáticos del panel y login personalizado
  // OPTIMIZACIÓN: Cache agresivo (7 días) con immutable flag para mejor performance
  app.use('/admin-static', express.static(path.resolve(__dirname, '..', 'public', 'admin'), {
    fallthrough: true,
    etag: true,
    maxAge: '7d', // 7 días en caché del navegador
    immutable: true, // Assets no cambian, navegador no debe revalidar
    setHeaders: (res, filePath) => {
      // Cache agresivo para JS y CSS (con versionado en nombres de archivo)
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      }
      // Cache moderado para imágenes
      if (filePath.match(/\.(png|jpg|jpeg|gif|svg|ico)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
      }
    }
  }));

  // Caché de Bundles AdminJS
  // PROBLEMA ORIGINAL (Enero 2026): 
  // - Bundle de AdminJS (components.bundle.js) = 3-5 MB comprimido
  // - Cada navegación entre pantallas descargaba el bundle completo
  // - Navegador NO lo guardaba en caché (sin headers apropriados)
  // - Resultado: 10-11 segundos por cambio de pantalla
  //
  // SOLUCIÓN: Middleware que intercepta requests a /admin/frontend/assets/ y agrega:
  // - Cache-Control: public, max-age=86400 (24 horas en navegador)
  // - immutable: Navegador nunca revalida, usa caché directamente
  // - ETag: Para validación sin re-descargar (🔴 VERSIONADO con package.json)
  //
  // IMPACTO: Primera navegación = 10s (descarga), subsecuentes = <200ms (caché local)
  
  // 🔴 Versionar ETag con package.json (evita cache stale post-deploy)
  const packageJson = require('../package.json');
  const bundleVersion = packageJson.version || '1.0.0';
  
  app.use((req, res, next) => {
    // Detectar bundles AdminJS que deben ser cacheados agresivamente
    const isBundleRequest = 
      req.path.includes('/admin/frontend/assets/') && 
      req.path.endsWith('.bundle.js');
    
    if (isBundleRequest) {
      // Headers de caché agresivo - le dice al navegador:
      // 1. "Guarda esto por 24 horas"
      // 2. "Nunca me lo revalides (immutable)"
      // 3. "Es público y puede ser cacheado"
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('ETag', `W/"adminjs-bundle-v${bundleVersion}"`);
      
    // ✅ Bundle assets cached (silenciado: spam innecesario)
    }
    
    next();
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const testQuery = getDbTestQuery(config.db.dialect);
      await AppDataSource.query(testQuery);
      res.json({ status: 'ok', db: config.db.dialect });
    } catch (e) {
      res.status(500).json({ status: 'fail', db: config.db.dialect, error: e.message });
    }
  });

  // Rate limiting global en /api
  // Aumentado de 100 a 250 req/min para permitir paralelismo en frontend (35 requests simultáneos)
  // Keygen: IP + usuario autenticado (mejor granularidad cuando múltiples usuarios comparten IP)
  const rateLimit = require('express-rate-limit');
  const apiRateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 250, // Aumentado de 100 (resuelve 429s para viewers en Recorridas)
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const user = req.user?.email || req.user?.username || '';
      return user ? `${ip}_${user}` : ip;  // Granular por usuario cuando autenticado
    },
    message: { 
      error: 'Rate limit exceeded',
      message: 'Too many requests (250 per minute). Please wait before trying again.',
      retryAfter: 60
    }
  });

  // API routes con body-parser aplicado de forma localizada (evita conflicto con AdminJS)
  app.use(
    '/api',
    apiRateLimiter, // ← Rate limiter global
    bodyParser.json({ limit: '2mb' }),
    bodyParser.urlencoded({ extended: true }),
    auditMiddleware,
    apiRoutes
  );

  // 404 handler for API
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Recurso no encontrado' });
  });

  // Generic error handler
  // ✅ BLOQUEANTE FIX: Diferencia 4xx vs 5xx, no expone stack
  const { createErrorHandler } = require('./utils/errorHandler');
  app.use(createErrorHandler());

  return app;
}

module.exports = { createApp };
