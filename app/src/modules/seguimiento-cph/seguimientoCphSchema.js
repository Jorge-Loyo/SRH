const { z } = require('zod');

/**
 * Schemas de validación Zod — Módulo Seguimiento CPH
 *
 * Usados por: controller (validación de entrada) + tests
 * Patrón: mismo que concursoSchema.js
 */

// ─── Campos editables ────────────────────────────────────────────────────────
const seguimientoCphEditableFields = z.object({
  id_baja:               z.number().int().optional().nullable(),
  usuario:               z.string().max(100).optional().nullable(),

  // Efector
  descr_efector:         z.string().max(200).optional().nullable(),
  sigla_efector:         z.string().max(20).optional().nullable(),
  tipo_efector:          z.string().max(100).optional().nullable(),
  origen:                z.string().max(200).optional().nullable(),
  conjuntos:             z.string().max(200).optional().nullable(),
  servicio:              z.string().max(100).optional().nullable(),
  fecha_fin_obra:        z.string().max(15).optional().nullable(),

  // Estado
  estado:                z.string().max(50).optional().nullable(),
  sub_estado:            z.string().max(100).optional().nullable(),
  sub_estado_3:          z.string().max(100).optional().nullable(),
  cambio_especialidad:   z.string().max(5).optional().nullable(),
  tipo_baja:             z.string().max(50).optional().nullable(),

  // Datos de la baja
  cargo:                 z.string().max(50).optional().nullable(),
  ee_baja:               z.string().max(150).optional().nullable(),
  cuil_baja:             z.string().max(20).optional().nullable(),
  nombre_baja:           z.string().max(200).optional().nullable(),
  fecha_baja:            z.string().max(15).optional().nullable(),
  escalafon_baja:        z.string().max(50).optional().nullable(),
  escalafon_1:           z.string().max(50).optional().nullable(),
  puesto_1:              z.string().max(150).optional().nullable(),
  especialidad_baja:     z.string().max(150).optional().nullable(),
  carga_horaria:         z.string().max(20).optional().nullable(),
  motivo_baja:           z.string().max(150).optional().nullable(),
  doc_respaldatoria:     z.string().max(150).optional().nullable(),
  fecha_pase_paralelo:   z.string().max(15).optional().nullable(),
  partida_presupuestaria: z.string().max(50).optional().nullable(),
  unificador_puestos:    z.string().max(100).optional().nullable(),

  // Concurso
  ee_concurso:           z.string().max(150).optional().nullable(),
  fecha_ee_concurso:     z.string().max(15).optional().nullable(),
  id_odoo:               z.string().max(100).optional().nullable(),
  escalafon_2:           z.string().max(50).optional().nullable(),
  puesto_2:              z.string().max(150).optional().nullable(),
  especialidad_solicitada: z.string().max(150).optional().nullable(),
  ccoo_especialidad:     z.string().max(150).optional().nullable(),
  if_solicitante:        z.string().max(150).optional().nullable(),
  if_autorizacion:       z.string().max(150).optional().nullable(),
  fecha_autorizacion:    z.string().max(15).optional().nullable(),
  sorteo_jurado:         z.boolean().optional().nullable(),
  disposicion:           z.string().max(100).optional().nullable(),

  // Inscripción
  fecha_insc_desde:      z.string().max(15).optional().nullable(),
  fecha_insc_hasta:      z.string().max(15).optional().nullable(),
  q_inscriptos:          z.number().int().optional().nullable(),

  // Examen
  examen_publicado:      z.boolean().optional().nullable(),
  fecha_examen:          z.string().max(15).optional().nullable(),

  // Orden de mérito
  orden_merito:          z.boolean().optional().nullable(),
  fecha_orden_merito:    z.string().max(15).optional().nullable(),

  // IFACS
  ifacs:                 z.boolean().optional().nullable(),
  fecha_ifacs:           z.string().max(15).optional().nullable(),

  // INSAL
  insal:                 z.boolean().optional().nullable(),
  fecha_insal:           z.string().max(15).optional().nullable(),

  // Designación
  ee_designacion:        z.string().max(150).optional().nullable(),
  fecha_ee_designacion:  z.string().max(15).optional().nullable(),
  nombre_designacion:    z.string().max(200).optional().nullable(),
  cuil_designacion:      z.string().max(20).optional().nullable(),
  carga_documentacion:   z.boolean().optional().nullable(),
  fecha_apto_medico:     z.string().max(15).optional().nullable(),
  fecha_ite:             z.string().max(15).optional().nullable(),
  proyecto_resolucion:   z.boolean().optional().nullable(),
  reso_a_la_firma:       z.boolean().optional().nullable(),
  resolucion_designacion: z.string().max(100).optional().nullable(),
  fecha_resolucion:      z.string().max(15).optional().nullable(),
  fecha_cargo:           z.string().max(15).optional().nullable(),
  cargo_sial:            z.boolean().optional().nullable(),

  // Control
  suspendido:            z.boolean().optional().nullable(),
  dispo_desierta:        z.boolean().optional().nullable(),
  fecha_dispo_desierta:  z.string().max(15).optional().nullable(),
  observaciones:         z.string().max(1000).optional().nullable(),

  // POU
  clave_pou:             z.string().max(100).optional().nullable(),
  cargo_baja:            z.string().max(200).optional().nullable(),
  cph_max:               z.string().max(50).optional().nullable(),
});

const seguimientoCphCreateSchema = seguimientoCphEditableFields;
const seguimientoCphUpdateSchema  = seguimientoCphEditableFields.partial();

const seguimientoCphPaginationSchema = z.object({
  limit:              z.coerce.number().int().min(1).max(9999).default(50),
  offset:             z.coerce.number().int().min(0).default(0),
  sigla_efector:      z.string().optional(),
  estado:             z.string().optional(),
  sub_estado:         z.string().optional(),
  sub_estado_3:       z.string().optional(),
  cuil_baja:          z.string().optional(),
  ee_baja:            z.string().optional(),
  nombre_baja:        z.string().optional(),
  puesto_1:           z.string().optional(),
  escalafon_1:        z.string().optional(),
  usuario:            z.string().optional(),
  origen:                  z.string().optional(),
  tipo_efector:            z.string().optional(),
  motivo_baja:             z.string().optional(),
  unificador_puestos:      z.string().optional(),
  // Campos nuevos
  escalafon_baja:          z.string().optional(),   // Médico / No Médico
  especialidad_baja:       z.string().optional(),
  escalafon_2:             z.string().optional(),
  puesto_2:                z.string().optional(),
  especialidad_solicitada: z.string().optional(),
  conjuntos:               z.string().optional(),
  cambio_especialidad:     z.string().optional(),
  dispo_desierta:          z.string().optional(),
  tipo_baja:               z.string().optional(),
  suspendido:              z.string().optional(),   // 'true' | 'false'
  examen_publicado:        z.string().optional(),   // 'true' | 'false'
  orden_merito:            z.string().optional(),   // 'true' | 'false'
  insal:                   z.string().optional(),   // 'true' | 'false'
  cargo_sial:              z.string().optional(),   // 'true' | 'false'
  search:                  z.string().optional(),
  id_baja:                 z.coerce.number().int().optional(),
  sort:                    z.string().default('id'),
  order:                   z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = {
  seguimientoCphCreateSchema,
  seguimientoCphUpdateSchema,
  seguimientoCphPaginationSchema,
};
