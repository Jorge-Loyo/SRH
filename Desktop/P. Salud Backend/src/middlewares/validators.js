function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

function validateId(req, res, next) {
  const { id } = req.params;
  if (Number.isNaN(Number(id))) return badRequest(res, 'Parámetro id debe ser numérico');
  return next();
}

function validateIdPeriodo(req, res, next) {
  const { id, periodo } = req.params;
  if (Number.isNaN(Number(id))) return badRequest(res, 'Parámetro id debe ser numérico');
  if (!periodo || typeof periodo !== 'string' || periodo.length > 10) {
    return badRequest(res, 'Parámetro periodo inválido');
  }
  return next();
}

module.exports = { validateId, validateIdPeriodo };
