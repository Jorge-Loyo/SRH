/**
 * Utilidades para manejo de URL y parámetros de búsqueda
 * Centraliza lógica común de lectura de query params
 */

/**
 * Obtiene URLSearchParams de forma segura (con manejo de errores)
 * @returns {URLSearchParams} Objeto URLSearchParams, vacío si error
 */
export function getSearchParams() {
  try {
    return new URLSearchParams(window.location.search)
  } catch {
    return new URLSearchParams()
  }
}

/**
 * Obtiene un parámetro de la query string de la URL actual
 * @param {string} name - Nombre del parámetro
 * @returns {string} Valor del parámetro o string vacío si no existe
 */
export function getParam(name) {
  try {
    const usp = getSearchParams()
    return usp.get(name) || ''
  } catch {
    return ''
  }
}

/**
 * Actualiza parámetros de la URL sin recargar la página
 * @param {Object} params - Objeto con pares clave-valor a actualizar
 */
export function updateUrlParams(params) {
  try {
    const usp = getSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === '') {
        usp.delete(key)
      } else {
        usp.set(key, value)
      }
    })
    const newUrl = window.location.pathname + (usp.toString() ? '?' + usp.toString() : '')
    window.history.replaceState({}, '', newUrl)
  } catch (e) {
    console.warn('[updateUrlParams] Error actualizando URL:', e)
  }
}

/**
 * Obtiene todos los parámetros de la URL como objeto
 * @returns {Object} Objeto con todos los parámetros
 */
export function getAllParams() {
  try {
    const usp = getSearchParams()
    const params = {}
    for (const [key, value] of usp.entries()) {
      params[key] = value
    }
    return params
  } catch {
    return {}
  }
}
