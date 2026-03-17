/**
 * Utilidades para manipulación de texto
 */

/**
 * Normaliza texto en español removiendo tildes, convirtiendo a minúsculas y trim
 * Útil para comparaciones case-insensitive e insensitive a acentos
 * 
 * @param {string} str - Texto a normalizar
 * @returns {string} Texto normalizado (sin tildes, minúsculas, sin espacios laterales)
 * 
 * @example
 * normalizeSpanishText('Comisión')  // 'comision'
 * normalizeSpanishText('BLOQUEADO') // 'bloqueado'
 * normalizeSpanishText('  Activo  ') // 'activo'
 */
function normalizeSpanishText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD') // Descomponer caracteres con tildes
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos (tildes)
    .trim();
}

module.exports = {
  normalizeSpanishText
};
