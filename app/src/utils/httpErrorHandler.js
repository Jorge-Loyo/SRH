/**
 * Utilidades para manejo de errores HTTP
 * Un solo lugar de verdad para mensajes de error consistentes
 */

function getErrorMessage(status, context = '') {
  const messages = {
    401: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
    403: 'No tiene permisos para realizar esta acción.',
    404: context ? `${context} no encontrado.` : 'Recurso no encontrado.',
    409: 'Este elemento ya existe.',
    422: 'Datos inválidos. Revise su entrada.',
    500: 'Error del servidor. Intente nuevamente.',
    503: 'Servicio no disponible. Intente más tarde.',
  };

  return messages[status] || `Error desconocido (${status})`;
}

/**
 * Parsea respuesta HTTP y retorna error descriptivo si no es ok
 * @param {Response} response - Response de fetch
 * @param {string} context - Contexto para mensaje (ej: "Concurso", "Hospital")
 * @returns {Promise<void>} Lanza error si response no es ok
 */
async function handleHttpResponse(response, context = '') {
  if (response.ok) {
    return;
  }

  const message = getErrorMessage(response.status, context);
  
  try {
    const body = await response.json();
    if (body.error || body.message) {
      throw new Error(body.error || body.message);
    }
  } catch (e) {
    // Si no puede parsear JSON o no hay campo error, usa el mensaje genérico
  }
  
  throw new Error(message);
}

export {
  getErrorMessage,
  handleHttpResponse,
};
