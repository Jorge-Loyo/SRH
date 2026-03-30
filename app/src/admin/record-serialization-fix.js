/**
 * src/admin/record-serialization-fix.js
 * 
 * FIX PARA AdminJS [object Object] BUG
 * 
 * PROBLEMA:
 * - AdminJS v6 intenta pasar objetos record complejos como parámetros de URL
 * - Esto causa serialización automática: /admin/resources/personas/records/[object Object]
 * - El middleware de AdminJS no valida que los recordId sean primitivos
 * 
 * SOLUCIÓN:
 * - Interceptar before/after hooks de AdminJS
 * - Transformar objects record en IDs primitivos
 * - Registrar logs si se detecta serialización
 */

const logger = require('../utils/logger');

/**
 * Transforma un record o valor en su ID primitivo
 * Maneja:
 * - Objetos con propiedad .id
 * - Valores primitivos (números, strings)
 * - null/undefined
 */
function extractRecordId(record) {
  if (!record) return null;
  
  // Si es primitivo, devolver tal cual
  if (typeof record === 'string' || typeof record === 'number') {
    return record.toString();
  }
  
  // Si es objeto, buscar .id
  if (typeof record === 'object') {
    // Manejar .id() como función (algunos ORMs)
    if (typeof record.id === 'function') {
      try {
        return record.id().toString();
      } catch (e) {
        logger.warn('[RecordSerializationFix] id() func error', { error: e.message });
        return null;
      }
    }
    
    // Manejar .id como propiedad
    if ('id' in record) {
      return record.id?.toString() || null;
    }
    
    // Último recurso: buscar propiedad que termine en _id
    const idProp = Object.keys(record).find(k => k.endsWith('_id') || k === 'id');
    if (idProp) {
      return record[idProp]?.toString() || null;
    }
  }
  
  return null;
}

/**
 * Crea un wrapper para funciones before/after
 * que garantiza que record IDs sean primitivos
 */
function wrapRecordIdHandler(originalHandler, actionName) {
  return async (response, request, context) => {
    try {
      // ✅ Transformar ctx.record.id si es complejo
      if (context?.record) {
        const recordId = extractRecordId(context.record);
        
        // Detectar si se estaba intentando serializar un objeto completo
        if (context.record && typeof context.record === 'object' && recordId === null) {
          logger.critical('[AdminJS] Object serialization attempt detected', {
            action: actionName,
            recordKeys: Object.keys(context.record).slice(0, 5),
            recordType: context.record.constructor?.name
          });
        }
        
        // ✅ Reemplazar context.record con solo el ID
        // Esto previene que AdminJS intente serializar el objeto completo
        context.record = {
          id: recordId,
          // Preservar algunos campos que AdminJS pueda necesitar
          title: context.record?.title || context.record?.name || recordId,
          _raw: context.record // Backup para debugging
        };
      }
      
      // Llamar al handler original
      if (originalHandler && typeof originalHandler === 'function') {
        return await originalHandler(response, request, context);
      }
      return response;
    } catch (e) {
      logger.error('[RecordSerializationFix] Wrapper error', {
        action: actionName,
        error: e.message,
        stack: e.stack?.split('\n').slice(0, 3).join('; ')
      });
      return response;
    }
  };
}

/**
 * Procesa recursos de AdminJS
 * Envuelve todos los before/after handlers con validación de IDs
 * 
 * Uso:
 * ```javascript
 * const resources = [{ resource: Persona, options: {...} }, ...];
 * const fixedResources = fixAdminJSRecordSerialization(resources);
 * ```
 */
function fixAdminJSRecordSerialization(resources) {
  return resources.map(resourceConfig => {
    const { resource, options } = resourceConfig;
    
    if (!options?.actions) {
      return resourceConfig;
    }
    
    const fixedOptions = { ...options };
    const fixedActions = {};
    
    // Procesar cada acción
    Object.entries(options.actions).forEach(([actionName, actionConfig]) => {
      if (!actionConfig) {
        fixedActions[actionName] = actionConfig;
        return;
      }
      
      // Envolver before/after handlers
      const fixedAction = { ...actionConfig };
      
      if (typeof actionConfig.before === 'function') {
        fixedAction.before = wrapRecordIdHandler(actionConfig.before, `${resource?.name}.${actionName}.before`);
      }
      
      if (typeof actionConfig.after === 'function') {
        fixedAction.after = wrapRecordIdHandler(actionConfig.after, `${resource?.name}.${actionName}.after`);
      }
      
      fixedActions[actionName] = fixedAction;
    });
    
    fixedOptions.actions = fixedActions;
    
    return {
      ...resourceConfig,
      options: fixedOptions
    };
  });
}

module.exports = {
  extractRecordId,
  wrapRecordIdHandler,
  fixAdminJSRecordSerialization
};
