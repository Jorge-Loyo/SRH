const { z } = require('zod');

/**
 * Schema base para concursos - Validación Zod centralizada
 * Un solo lugar de verdad para validaciones
 * Usado por: controller + tests + frontend
 */

const concursoCreateSchema = z.object({
  id_concurso: z.number().int().positive('ID must be a positive integer'),
  sigla: z.string().min(1, 'Hospital code is required').max(20),
  sub_estado: z.string().max(50).optional().nullable(),
  estado: z.string().max(50).optional().nullable(),
  ee_baja: z.string().max(150).optional().nullable(),
  cuil_baja: z.string().max(20).optional().nullable(),
  nombre_baja: z.string().max(150).optional().nullable(),
  fecha_baja: z.string().max(20).optional().nullable(),
  escalafon_baja: z.string().max(10).optional().nullable(),
  puesto_baja: z.string().max(150).optional().nullable(),
  especialidad_baja: z.string().max(150).optional().nullable(),
  ee_concurso: z.string().max(150).optional().nullable(),
  fecha_ee_concurso: z.string().max(15).optional().nullable(),
  escalafon_concurso: z.string().max(10).optional().nullable(),
  puesto_alta: z.string().max(150).optional().nullable(),
  especialidad_solicitada_de_alta: z.string().max(150).optional().nullable(),
  fecha_autorizacion: z.string().max(20).optional().nullable(),
  sorteo_de_jurado: z.string().max(20).optional().nullable(),
  disposicion_concurso: z.string().max(100).optional().nullable(),
  fecha_desde: z.string().max(15).optional().nullable(),
  fecha_hasta: z.string().max(15).optional().nullable(),
  fecha_examen: z.string().max(15).optional().nullable(),
  orden_merito: z.string().max(100).optional().nullable(),
  fecha_orden_merito: z.string().max(15).optional().nullable(),
  expediente_designacion: z.string().max(100).optional().nullable(),
  fecha_expediente_designacion: z.string().max(15).optional().nullable(),
  nombre_designacion: z.string().max(150).optional().nullable(),
  cuil_designacion: z.string().max(15).optional().nullable(),
  fecha_apto_medico: z.string().max(15).optional().nullable(),
  resolucion_designacion: z.string().max(100).optional().nullable(),
  fecha_resolucion: z.string().max(15).optional().nullable(),
  observaciones: z.string().max(450).optional().nullable(),
  codigo_cargo: z.string().max(20).optional().nullable(),
  recorridas: z.string().max(50).optional().nullable(),
  origen: z.string().max(200).optional().nullable(),
});

/**
 * Schema para actualización - omite id_concurso y todos los campos opcionales
 */
const concursoUpdateSchema = concursoCreateSchema
  .omit({ id_concurso: true })
  .partial();

/**
 * Schema para paginación en GET /api/concursos
 */
const paginationSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sigla: z.string().optional(),
  estado: z.string().optional(),
  sort: z.string().default('id_concurso'),
  order: z.enum(['ASC', 'DESC']).default('ASC'),
});

module.exports = {
  concursoCreateSchema,
  concursoUpdateSchema,
  paginationSchema,
};
