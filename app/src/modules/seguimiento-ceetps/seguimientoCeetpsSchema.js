const { z } = require('zod');

const seguimientoCeetpsEditableFields = z.object({
  id_baja:                  z.number().int().optional().nullable(),
  codigo_registro:          z.number().int().optional().nullable(),
  usuario:                  z.string().max(100).optional().nullable(),

  // Efector
  sigla_efector:            z.string().max(20).optional().nullable(),
  descr_efector:            z.string().max(200).optional().nullable(),

  // Concurso
  tipificador_obra_servicio: z.string().max(200).optional().nullable(),
  tipificador_origen:       z.string().max(200).optional().nullable(),
  fecha_caratulacion:       z.string().max(15).optional().nullable(),
  expediente_concurso:      z.string().max(150).optional().nullable(),
  fecha_generacion:         z.string().max(15).optional().nullable(),
  fecha_autorizacion:       z.string().max(15).optional().nullable(),
  puesto_solicitado:        z.string().max(150).optional().nullable(),
  dispo_llamado:            z.string().max(500).optional().nullable(),
  fecha_ifacs:              z.string().max(15).optional().nullable(),
  fecha_insal:              z.string().max(15).optional().nullable(),
  estado_concurso:          z.string().max(100).optional().nullable(),

  // Designación
  expediente_designacion:   z.string().max(150).optional().nullable(),
  puesto_designado:         z.string().max(150).optional().nullable(),
  cuil_designado:           z.string().max(20).optional().nullable(),
  nombre_apellido_designado: z.string().max(200).optional().nullable(),
  estado_apto:              z.string().max(100).optional().nullable(),
  numero_apto_medico:       z.string().max(100).optional().nullable(),
  fecha_proyecto_dispo:     z.string().max(15).optional().nullable(),
  dispo_designacion:        z.string().max(500).optional().nullable(),
  resolucion_designacion:   z.string().max(500).optional().nullable(),
  alta_sial:                z.boolean().optional().nullable(),
  id_cargo:                 z.string().max(100).optional().nullable(),
  observaciones:            z.string().max(1000).optional().nullable(),

  // Baja (copiados)
  ex_baja:                  z.string().max(150).optional().nullable(),
  sigla:                    z.string().max(20).optional().nullable(),
  efector:                  z.string().max(200).optional().nullable(),
  cargo:                    z.string().max(100).optional().nullable(),
  cuil:                     z.string().max(20).optional().nullable(),
  nombre_apellido_baja:     z.string().max(200).optional().nullable(),
  puesto_baja:              z.string().max(150).optional().nullable(),
  especialidad_baja:        z.string().max(150).optional().nullable(),
  fecha_baja:               z.string().max(15).optional().nullable(),
  carga_horaria:            z.string().max(20).optional().nullable(),
  motivo_baja:              z.string().max(150).optional().nullable(),
  doc_respaldatoria:        z.string().max(150).optional().nullable(),

  // Solicitud de cambio
  cambio_especialidad:      z.string().max(3).optional().nullable(),
  doc_cambio_especialidad:  z.string().max(500).optional().nullable(),
});

const seguimientoCeetpsCreateSchema = seguimientoCeetpsEditableFields;
const seguimientoCeetpsUpdateSchema  = seguimientoCeetpsEditableFields.partial();

const seguimientoCeetssPaginationSchema = z.object({
  limit:                    z.coerce.number().int().min(1).max(9999).default(50),
  offset:                   z.coerce.number().int().min(0).default(0),
  codigo_registro:          z.coerce.number().int().optional(),
  // Datos generales
  sigla_efector:            z.string().optional(),
  usuario:                  z.string().optional(),
  // Concurso
  estado_concurso:          z.string().optional(),
  expediente_concurso:      z.string().optional(),
  tipificador_obra_servicio: z.string().optional(),
  tipificador_origen:       z.string().optional(),
  puesto_solicitado:        z.string().optional(),
  dispo_llamado:            z.string().optional(),
  // Designación
  cuil_designado:           z.string().optional(),
  puesto_designado:         z.string().optional(),
  expediente_designacion:   z.string().optional(),
  estado_apto:              z.string().optional(),
  alta_sial:                z.preprocess(v => { if (v === 'true') return true; if (v === 'false') return false; return undefined; }, z.boolean().optional()),
  // Baja
  cuil:                     z.string().optional(),
  sigla_baja:               z.string().optional(),
  ex_baja:                  z.string().optional(),
  puesto_baja:              z.string().optional(),
  especialidad_baja:        z.string().optional(),
  motivo_baja:              z.string().optional(),
  carga_horaria:            z.string().optional(),
  // Búsqueda general
  search:                   z.string().optional(),
  id_baja:                  z.coerce.number().int().optional(),
  sort:                     z.string().default('id'),
  order:                    z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = {
  seguimientoCeetpsCreateSchema,
  seguimientoCeetpsUpdateSchema,
  seguimientoCeetssPaginationSchema,
};
