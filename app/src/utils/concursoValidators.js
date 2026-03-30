import { z } from 'zod';
import logger from './logger-frontend';

/**
 * Validador frontend para concursos
 * Filtra datos malformados al cargar del servidor
 */

const ConcursoFrontendSchema = z.object({
  // Campos base
  id_concurso: z.number().int().positive(),
  sigla: z.string().min(1),
  estado: z.string().optional().nullable(),
  sub_estado: z.string().optional().nullable(),
  
  // SECCIÓN BAJA
  ee_baja: z.any().optional().nullable(),
  cuil_baja: z.any().optional().nullable(),
  nombre_baja: z.any().optional().nullable(),
  fecha_baja: z.any().optional().nullable(),
  escalafon_baja: z.any().optional().nullable(),
  puesto_baja: z.any().optional().nullable(),
  especialidad_baja: z.any().optional().nullable(),
  
  // SECCIÓN CONCURSO - ETAPA 1
  ee_concurso: z.any().optional().nullable(),
  fecha_ee_concurso: z.any().optional().nullable(),
  escalafon_concurso: z.any().optional().nullable(),
  puesto_alta: z.any().optional().nullable(),
  especialidad_solicitada_de_alta: z.any().optional().nullable(),
  fecha_autorizacion: z.any().optional().nullable(),
  sorteo_de_jurado: z.any().optional().nullable(),
  
  // SECCIÓN CONCURSO - ETAPA 2
  disposicion_concurso: z.any().optional().nullable(),
  fecha_desde: z.any().optional().nullable(),
  fecha_hasta: z.any().optional().nullable(),
  fecha_examen: z.any().optional().nullable(),
  orden_merito: z.any().optional().nullable(),
  fecha_orden_merito: z.any().optional().nullable(),
  
  // SECCIÓN DESIGNACIÓN
  expediente_designacion: z.any().optional().nullable(),
  fecha_expediente_designacion: z.any().optional().nullable(),
  nombre_designacion: z.any().optional().nullable(),
  cuil_designacion: z.any().optional().nullable(),
  fecha_apto_medico: z.any().optional().nullable(),
  resolucion_designacion: z.any().optional().nullable(),
  fecha_resolucion: z.any().optional().nullable(),
  
  // OTROS
  observaciones: z.any().optional().nullable(),
  codigo_cargo: z.any().optional().nullable(),
  recorridas: z.any().optional().nullable(),
  origen: z.any().optional().nullable(),
  
  // Timestamps (opcional, pueden venir de la BD)
  created_at: z.any().optional(),
  updated_at: z.any().optional(),
}).passthrough(); // ✅ Permite campos extra que no estén en el schema

/**
 * Valida array de concursos y filtra registros malformados
 * @param {any} data - Data a validar (esperado: array de concursos)
 * @returns {Array} Array de concursos validados
 */
function validateConcursos(data) {
  if (!Array.isArray(data)) {
    logger.warn('[validateConcursos] Data is not an array', { dataType: typeof data });
    return [];
  }

  const validated = [];
  const errors = [];

  data.forEach((item, idx) => {
    const result = ConcursoFrontendSchema.safeParse(item);
    if (result.success) {
      validated.push(result.data);
    } else {
      errors.push({
        idx,
        id_concurso: item?.id_concurso,
        error: result.error.errors.map(e => e.message).join(', '),
      });
    }
  });

  if (errors.length > 0) {
    logger.warn('[validateConcursos] Found invalid records', {
      total: data.length,
      valid: validated.length,
      invalid: errors.length,
      sampleErrors: errors.slice(0, 3),
    });
  }

  return validated;
}

export {
  validateConcursos,
  ConcursoFrontendSchema,
};
