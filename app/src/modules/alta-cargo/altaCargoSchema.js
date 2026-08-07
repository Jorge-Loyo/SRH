const { z } = require('zod');

const fechasSchema = z.object({
  cargo_desde:        z.string().min(1),
  cargo_hasta:        z.string().nullable().optional(),
  antiguedad:         z.string().min(1),
  expediente:         z.string().min(1).max(100),
  cantidad:           z.coerce.number().int().min(1).max(50).default(1),
  categoria_interna:  z.string().max(50).nullable().optional(),
  norma_referencia:   z.string().max(100).nullable().optional(),
  nro_resolucion:     z.string().max(100).nullable().optional(),
  expediente_origen:  z.string().max(100).nullable().optional(),
})

const altaCargoCreateSchema = z.discriminatedUnion('carrera_seleccionada', [
  z.object({
    carrera_seleccionada: z.literal('cph'),
    sigla:        z.string().min(1).max(20),
    modalidad:    z.string().min(1).max(50),
    puesto:       z.string().min(1).max(150),
    especialidad: z.string().min(1).max(150),
    tipo_cph:     z.enum(['ejecucion', 'jefe', 'director']).default('ejecucion'),
  }).merge(fechasSchema),
  z.object({
    carrera_seleccionada: z.literal('enf'),
    sigla:           z.string().min(1).max(20),
    nivel_formacion: z.string().min(1).max(50),
    jornada:         z.string().max(50).nullable().optional(),
  }).merge(fechasSchema),
  z.object({
    carrera_seleccionada: z.literal('tec'),
    sigla:     z.string().min(1).max(20),
    modalidad: z.string().min(1).max(50),
    puesto:    z.string().min(1).max(150),
  }).merge(fechasSchema),
]);

const altaCargoPaginationSchema = z.object({
  limit:                z.coerce.number().int().min(1).max(500).default(50),
  offset:               z.coerce.number().int().min(0).default(0),
  carrera_seleccionada: z.string().optional(),
  sort:                 z.string().default('id'),
  order:                z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = { altaCargoCreateSchema, altaCargoPaginationSchema };
