/**
 * Middleware que valida y sanitiza query parameters de paginación
 * Previene DoS por valores extremos en page/limit
 */
function validatePagination(req, res, next) {
  try {
    // Extraer valores
    const pageParam = req.query.page;
    const limitParam = req.query.limit;
    
    // Parse y validar page
    let page = pageParam ? parseInt(pageParam, 10) : 1;
    if (Number.isNaN(page) || page < 1) {
      page = 1;
    }
    // Máximo 100,000 páginas (con limit 50 = 5M registros)
    if (page > 100000) {
      page = 100000;
    }
    
    // Parse y validar limit
    let limit = limitParam ? parseInt(limitParam, 10) : 50;
    if (Number.isNaN(limit) || limit < 1) {
      limit = 50;
    }
    // Mínimo 1, máximo 1000
    if (limit < 1) limit = 1;
    if (limit > 1000) limit = 1000;
    
    // Guardar valores sanitizados
    req.pagination = { page, limit, offset: (page - 1) * limit };
    
    next();
  } catch (e) {
    // Si algo falla, valores por defecto
    req.pagination = { page: 1, limit: 50, offset: 0 };
    next();
  }
}

module.exports = { validatePagination };
