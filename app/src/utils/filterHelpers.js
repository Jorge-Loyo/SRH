const { ILike, Between, MoreThanOrEqual, LessThanOrEqual } = require('typeorm');

/**
 * Helpers para armar el objeto `where` de TypeORM en los list() de
 * BajaConsolidadaService, SeguimientoCphService y SeguimientoCeetpsService.
 *
 * Extrae solo los patrones que se repetían IDÉNTICOS en los tres servicios
 * (texto libre por columna y rangos de fecha). Los filtros con alguna
 * particularidad propia de un módulo (comparaciones exactas, casts,
 * booleanos sueltos, etc.) se dejan inline en cada service — unificarlos
 * también cambiaría comportamiento, no solo estructura.
 *
 * Todas mutan `where` in place y no devuelven nada.
 */

/** where[column] = ILike(`%value%`) si value es truthy. */
function applyLike(where, column, value) {
  if (value) where[column] = ILike(`%${value}%`);
}

/** Rango de fechas: Between si vienen los dos extremos, si no MoreThanOrEqual/LessThanOrEqual. */
function applyDateRange(where, column, desde, hasta) {
  if (desde && hasta) where[column] = Between(desde, hasta);
  else if (desde) where[column] = MoreThanOrEqual(desde);
  else if (hasta) where[column] = LessThanOrEqual(hasta);
}

/** Filtro booleano que llega como string 'true'/'false' desde query params. */
function applyBoolString(where, column, value) {
  if (value === 'true') where[column] = true;
  else if (value === 'false') where[column] = false;
}

module.exports = { applyLike, applyDateRange, applyBoolString };
