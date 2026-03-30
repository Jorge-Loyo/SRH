const rateLimit = require('express-rate-limit');

// ============= OPTIMIZACIÓN: Rate Limiting Diferenciado =============

// Rate limiter para login (más restrictivo)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

// Rate limiter para refresh tokens (moderado)
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 60, // 60 requests por ventana
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para endpoints costosos (exports, DISTINCT, organigrama)
// Incrementado a 50/min para permitir múltiples tablas cargando simultáneamente
// Cada tabla con 10+ campos DISTINCT dispara muchas solicitudes rápidamente
const heavyEndpointsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 50, // 50 requests por minuto (suficiente para 5 tablas x 10 DISTINCT fields)
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Too many heavy requests. Please slow down.', 
    retryAfter: '60 seconds' 
  },
  // Identificar por IP + usuario para mejor control
  keyGenerator: (req) => {
    const user = req?.session?.adminUser?.email || req?.currentAdmin?.email || '';
    return `${req.ip}_${user}`;
  },
  // Incluir Retry-After header
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded for heavy endpoints',
      message: 'Too many expensive requests (DISTINCT queries). Please wait before trying again.',
      retryAfter: 60,
      limit: 50,
      window: '1 minute'
    });
  }
});

module.exports = { 
  loginLimiter, 
  refreshLimiter,
  heavyEndpointsLimiter
};
