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

  // Confiar en el proxy reverso (Nginx/Docker) para que req.ip sea la IP real del cliente
  // Sin esto, todos los usuarios comparten la misma IP del proxy y se bloquean mutuamente en rate limiting
  if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
    app.set('trust proxy', 1);
  }

  // Compresión HTTP (gzip/brotli) para reducir payload de responses en 70-80%
  app.use(compression({ 
    level: 6, // Balance entre velocidad y ratio de compresión
    threshold: 1024 // Solo comprimir responses mayores a 1KB
  }));

  // Security headers via Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));
  
  // Remover header X-Powered-By (info leak - no exponer que es Express)
  app.disable('x-powered-by');

  // COOKIE PARSER (CRÍTICO para res.cookie() y JWT en cookies)
  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  // Logging estándar de requests HTTP
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // Servir el frontend SPA (React) desde la raíz
  // Assets con hash Vite → caché 1 año; index.html → sin caché
  app.use(express.static(path.resolve(__dirname, '..', 'public', 'spa'), {
    etag: true,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (/[/\\]assets[/\\].+\.[a-f0-9]{8,}\.(js|css)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
    },
  }));

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

  // API routes con body-parser aplicado de forma localizada
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

  // Redirect del viejo panel de administración (ya removido) → SPA, para browsers con caché vieja
  app.use('/admin', (req, res) => {
    res.redirect(301, '/');
  });

  // SPA catch-all: cualquier ruta sin handler Express la resuelve React Router
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '..', 'public', 'spa', 'index.html'));
  });

  // Generic error handler
  // ✅ BLOQUEANTE FIX: Diferencia 4xx vs 5xx, no expone stack
  const { createErrorHandler } = require('./utils/errorHandler');
  app.use(createErrorHandler());

  return app;
}

module.exports = { createApp };
