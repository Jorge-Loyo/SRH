// Handlers de páginas AdminJS: SOLO GENÉRICOS UNIFICADOS
module.exports.getAdminPageHandlers = function getAdminPageHandlers({ AppDataSource, toCsvBase64 }) {
  // ============================================================================
  // HANDLERS GENÉRICOS - Sistema unificado de tablas
  // ============================================================================
  const { buildGenericTableFull } = require('./pages/genericTableFull')
  const { heavyEndpointsLimiter } = require('../middlewares/rateLimiters')

  // Wrappear handlers de páginas que hacen queries DISTINCT con rate limiting
  const wrapWithHeavyLimiter = (handler) => {
    return async (req, res, ...args) => {
      // Solo aplicar limiter si hay query DISTINCT
      if (req?.query?.distinct) {
        // CRÍTICO: heavyEndpointsLimiter es un middleware Express que llama next()
        // Debe ser envuelto en una Promesa y esperar a que complete ANTES de retornar
        // Sin esto, el handler retorna undefined y el cliente recibe error 500
        return new Promise((resolve) => {
          heavyEndpointsLimiter(req, res, async () => {
            const result = await handler(req, res, ...args);
            resolve(result);
          });
        });
      }
      return await handler(req, res, ...args);
    };
  };

  return {
    // ============================================================================
    // HANDLERS GENÉRICOS UNIFICADOS (sistema actual)
    // ============================================================================
    personasFullGeneric: wrapWithHeavyLimiter(buildGenericTableFull('personas', { AppDataSource, toCsvBase64 })),
    cargosFullGeneric: wrapWithHeavyLimiter(buildGenericTableFull('cargos', { AppDataSource, toCsvBase64 })),
    rolesFullGeneric: wrapWithHeavyLimiter(buildGenericTableFull('roles', { AppDataSource, toCsvBase64 })),
    siglasFullGeneric: wrapWithHeavyLimiter(buildGenericTableFull('siglas', { AppDataSource, toCsvBase64 })),
    bajasFullGeneric: wrapWithHeavyLimiter(buildGenericTableFull('bajas', { AppDataSource, toCsvBase64 }))
  }
}
