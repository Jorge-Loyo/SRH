const { ZodError } = require('zod');

/**
 * Middleware de validación de body usando Zod
 * 
 * @param {ZodSchema} schema - Schema Zod para validar
 * @returns {Function} Middleware Express
 * 
 * @example
 * router.post('/', validateBody(PersonaCreateSchema), controller.create);
 * router.put('/:id', validateBody(PersonaUpdateSchema), controller.update);
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const toValidate = req.body || {};
      
      // Parse y validación estricta
      const data = schema.parse(toValidate);
      
      // Datos validados en req.validated.body
      req.validated = { ...(req.validated || {}), body: data };
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validación de datos falló',
          issues: err.issues.map((i) => ({ 
            path: i.path.join('.'), 
            message: i.message 
          })),
        });
      }
      return next(err);
    }
  };
}

module.exports = { validateBody };
