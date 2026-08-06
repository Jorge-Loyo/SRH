const { z } = require('zod');

const altaCargoCreateSchema = z.discriminatedUnion('carrera_seleccionada', [
  z.object({
    carrera_seleccionada: z.literal('cph'),
    sigla:       z.string().min(1).max(20),
    modalidad:   z.string().min(1).max(50),
    puesto:      z.string().min(1).max(150),
    especialidad: z.string().min(1).max(150),
    tipo_cph:    z.enum(['comun', 'jefe', 'director']).default('comun'),
  }),
  z.object({
    carrera_seleccionada: z.literal('enf'),
    sigla:           z.string().min(1).max(20),
    nivel_formacion: z.string().min(1).max(50),
  }),
  z.object({
    carrera_seleccionada: z.literal('tec'),
    sigla:     z.string().min(1).max(20),
    modalidad: z.string().min(1).max(50),
    puesto:    z.string().min(1).max(150),
  }),
]);

const altaCargoPaginationSchema = z.object({
  limit:                z.coerce.number().int().min(1).max(500).default(50),
  offset:               z.coerce.number().int().min(0).default(0),
  carrera_seleccionada: z.string().optional(),
  sort:                 z.string().default('id'),
  order:                z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = { altaCargoCreateSchema, altaCargoPaginationSchema };
