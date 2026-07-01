const { z } = require('zod');

/**
 * Schemas de validación Zod — Módulo Bajas Consolidadas
 *
 * Usados por: controller (validación de entrada) + tests
 * Patrón: mismo que concursoSchema.js
 */

// ─── Campos editables ────────────────────────────────────────────────────────
const bajaConsolidadaEditableFields = z.object({
  usuario:               z.string().max(100).optional().nullable(),
  origen:                z.string().max(50).optional().nullable(),
  cuil:                  z.string().max(20).optional().nullable(),
  nombre_apellido:       z.string().max(200).optional().nullable(),
  sigla:                 z.string().max(20).optional().nullable(),
  efector:               z.string().max(200).optional().nullable(),
  tipo_efector:          z.string().max(100).optional().nullable(),
  codigo_cargo:          z.string().max(50).optional().nullable(),
  puesto_baja:           z.string().max(150).optional().nullable(),
  especialidad_baja:     z.string().max(150).optional().nullable(),
  partida_presupuestaria: z.string().max(50).optional().nullable(),
  escalafon:             z.string().max(50).optional().nullable(),
  pou_pof:               z.string().max(10).optional().nullable(),
  unificador_puestos:    z.string().max(100).optional().nullable(),
  codigo_registro:       z.number().int().optional().nullable(),
  ex_baja:               z.string().max(150).optional().nullable(),
  fecha_baja:            z.string().max(15).optional().nullable(),
  carga_horaria:         z.string().max(20).optional().nullable(),
  motivo_baja:           z.string().max(150).optional().nullable(),
  doc_respaldatoria:     z.string().max(150).optional().nullable(),
  fecha_pase_paralelo:   z.string().max(15).optional().nullable(),
  genera_concurso:       z.string().max(5).optional().nullable(),
  cargo_baja:            z.string().max(200).optional().nullable(),
  expediente_concurso:   z.string().max(150).optional().nullable(),
  fecha_caratulacion:    z.string().max(15).optional().nullable(),
});

// ─── Create: requiere al menos cuil o nombre_apellido ─────────────────────────
const bajaConsolidadaCreateSchema = bajaConsolidadaEditableFields;

// ─── Update: todos los campos opcionales ──────────────────────────────────────
const bajaConsolidadaUpdateSchema = bajaConsolidadaEditableFields.partial();

// ─── Paginación y filtros para GET /api/concursales/bajas ────────────────────────
const bajaConsolidadaPaginationSchema = z.object({
  limit:              z.coerce.number().int().min(1).max(9999).default(50),
  offset:             z.coerce.number().int().min(0).default(0),
  sigla:              z.string().optional(),
  cuil:               z.string().optional(),
  nombre_apellido:    z.string().optional(),
  puesto_baja:        z.string().optional(),
  escalafon:          z.string().optional(),
  genera_concurso:    z.string().optional(),
  es_cph:             z.coerce.boolean().optional(),
  motivo_baja:        z.string().optional(),
  origen:             z.string().optional(),
  tipo_efector:       z.string().optional(),
  unificador_puestos: z.string().optional(),
  usuario:            z.string().optional(),
  pou_pof:            z.string().optional(),
  especialidad_baja:  z.string().optional(),
  // Nuevos filtros
  ex_baja:                   z.string().optional(),
  codigo_cargo:              z.string().optional(),
  cargo_baja:                z.string().optional(),
  codigo_registro:           z.coerce.number().int().optional(),
  partida_presupuestaria:    z.string().optional(),
  carga_horaria:             z.string().optional(),
  doc_respaldatoria:         z.string().optional(),
  fecha_baja_desde:          z.string().optional(),
  fecha_baja_hasta:          z.string().optional(),
  fecha_pase_paralelo_desde: z.string().optional(),
  fecha_pase_paralelo_hasta: z.string().optional(),
  search:             z.string().optional(),
  sort:               z.string().default('id'),
  order:              z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = {
  bajaConsolidadaCreateSchema,
  bajaConsolidadaUpdateSchema,
  bajaConsolidadaPaginationSchema,
};
