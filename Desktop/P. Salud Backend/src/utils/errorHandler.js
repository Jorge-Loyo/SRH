const logger = require('./logger');

/**
 * Centralizado error handler para Express
 * Diferencia entre:
 * - 4xx: Error de cliente (bad request, validation, auth)
 * - 5xx: Error de servidor (unhandled exceptions, DB errors)
 */
function createErrorHandler() {
  return (err, req, res, next) => {
    // Determinar status code
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Error interno';
    
    // Errores conocidos: mapear a 4xx
    if (err.name === 'ValidationError') statusCode = 400;
    if (err.name === 'UnauthorizedError') statusCode = 401;
    if (err.name === 'ForbiddenError') statusCode = 403;
    if (err.name === 'NotFoundError') statusCode = 404;
    if (err.name === 'ConflictError') statusCode = 409;
    if (err.name === 'ZodError') statusCode = 400;
    
    // Loguear apropiadamente
    if (statusCode >= 500) {
      // 5xx: Error level (servidor responsable)
      logger.error('[Error 5xx]', {
        statusCode,
        message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        user: req.user?.username || null,
        ip: req.ip
      });
      // NUNCA exponer stack en response
      res.status(statusCode).json({ 
        error: message
      });
    } else {
      // 4xx: Debug level (cliente responsable)
      logger.debug('[Error 4xx]', {
        statusCode,
        message,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      res.status(statusCode).json({ error: message });
    }
  };
}

module.exports = { createErrorHandler };
