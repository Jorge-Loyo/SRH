const { z } = require('zod');

const fechasSchema = z.object({
  cargo_desde:        z.string().min(1),
  cargo_hasta:        z.string().nullable().optional(),
  antiguedad:         z.string().min(1),
  documento:          z.string().min(1).max(100),
  tipo_alta:          z.enum(['ejecucion', 'estructura']).default('ejecucion'),
  cantidad:           z.coerce.number().int().min(1).max(50).default(1),
  categoria_interna:  z.string().max(50).nullable().optional(),
  norma_referencia:   z.string().max(100).nullable().optional(),
  nro_resolucion:     z.string().max(100).nullable().optional(),
  documento_origen:   z.string().max(100).nullable().optional(),
})

const altaCargoCreateSchema = z.discriminatedUnion('carrera_seleccionada', [
  z.object({
    carrera_seleccionada: z.literal('cph'),
    sigla:        z.string().min(1).max(20),
    modalidad:    z.string().max(50).nullable().optional(),
    puesto:       z.string().min(1).max(150),
    especialidad: z.string().max(150).nullable().optional(),
    tipo_cph:     z.enum(['ejecucion', 'jefe', 'director', 'subdirector']).default('ejecucion'),
  }).merge(fechasSchema),
  z.object({
    carrera_seleccionada: z.literal('enf'),
    sigla:    z.string().min(1).max(20),
    jornada:  z.string().max(50).nullable().optional(),
  }).merge(fechasSchema),
  z.object({
    carrera_seleccionada: z.literal('tec'),
    sigla:     z.string().min(1).max(20),
    modalidad: z.string().min(1).max(50),
    puesto:    z.string().min(1).max(150),
    tipo_tec:  z.enum(['pou', 'pof']).default('pof'),
  }).merge(fechasSchema),
  z.object({
    carrera_seleccionada: z.literal('eg'),
    sigla:    z.string().min(1).max(20),
    puesto:   z.string().min(1).max(150),
    tipo_eg:  z.enum(['ejecucion', 'jefe']).default('ejecucion'),
  }).merge(fechasSchema),
  z.object({
    carrera_seleccionada: z.literal('as'),
    sigla:    z.string().min(1).max(20),
    puesto:   z.string().max(150).nullable().optional(),
  }).merge(fechasSchema),
  z.object({
    carrera_seleccionada: z.literal('rg'),
    sigla:    z.string().min(1).max(20),
    puesto:   z.string().max(150).nullable().optional(),
  }).merge(fechasSchema),
]);

const altaCargoPaginationSchema = z.object({
  limit:  z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort:   z.string().default('id'),
  order:  z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = { altaCargoCreateSchema, altaCargoPaginationSchema };
