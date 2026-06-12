const { z } = require('zod');

// ===== SIGLA SCHEMAS =====
// Schema base SOLO con campos editables (sin PK)
// PK (id_sigla) viene de params, NO de body
const SiglaEditableFieldsSchema = z.object({
  sigla: z.string()
    .min(1, 'Sigla es obligatoria')
    .max(20, 'Sigla muy larga'),
  universo_totalizador: z.string()
    .min(1, 'Universo totalizador es obligatorio')
    .max(100, 'Universo totalizador muy largo'),
  tipo_hospital_sigla: z.string()
    .min(1, 'Tipo hospital sigla es obligatorio')
    .max(50, 'Tipo hospital sigla muy largo'),
  monovalencia: z.string().max(50).nullable().optional(),
});

// Schema para CREATE: campos obligatorios + strict (rechaza campos extra)
const SiglaCreateSchema = SiglaEditableFieldsSchema.strict();

// Schema para UPDATE: todos los campos opcionales + strict (rechaza campos extra)
// NO permite modificar PK (id_sigla)
const SiglaUpdateSchema = SiglaEditableFieldsSchema.partial().strict();

// ===== PERSONA SCHEMAS =====
// Schema base SOLO con campos editables (sin PKs)
// PKs (id_persona, periodo) vienen de params, NO de body
const PersonaEditableFieldsSchema = z.object({
  codigo_persona: z.string().nullable().optional(),
  cuil: z.union([
    z.string().regex(/^\d{11}$/, 'CUIL debe tener 11 dígitos'),
    z.number().int().positive()
  ], { errorMap: () => ({ message: 'CUIL inválido' }) }),
  cuil_rol: z.string().nullable().optional(),
  nombre_apellido: z.string()
    .min(1, 'Nombre y apellido es obligatorio')
    .max(255, 'Nombre y apellido no puede exceder 255 caracteres'),
  fecha_nacimiento: z.string().nullable().optional(),
  edad: z.number()
    .int('Edad debe ser un número entero')
    .min(18, 'Edad mínima es 18 años')
    .max(100, 'Edad máxima es 100 años'),
  sexo: z.enum(['M', 'F', 'X'], { errorMap: () => ({ message: 'Sexo debe ser M, F o X' }) })
    .nullable()
    .optional(),
  tipo_doc: z.enum(['DNI', 'LC', 'LE', 'CI', 'PAS'], { 
    errorMap: () => ({ message: 'Tipo documento inválido' }) 
  }),
  numero_doc: z.union([
    z.string().min(7).max(8),
    z.number().int().positive()
  ], { errorMap: () => ({ message: 'Número documento inválido' }) }),
  especialidad: z.string().max(100).nullable().optional(),
  telefono: z.string()
    .regex(/^[\d\s\-+()]*$/, 'Teléfono contiene caracteres inválidos')
    .max(20)
    .nullable()
    .optional(),
  mail_personal: z.string()
    .email('Email personal inválido')
    .max(255)
    .nullable()
    .optional(),
  mail_laboral: z.string()
    .email('Email laboral inválido')
    .max(255)
    .nullable()
    .optional(),
  domicilio: z.string().max(255).nullable().optional(),
  localidad: z.string().max(100).nullable().optional(),
  antiguedad: z.string().max(50).nullable().optional(),
});

// Schema para CREATE: campos obligatorios + strict (rechaza campos extra)
const PersonaCreateSchema = PersonaEditableFieldsSchema.strict();

// Schema para UPDATE: todos los campos opcionales + strict (rechaza campos extra)
// NO permite modificar PKs (id_persona, periodo)
const PersonaUpdateSchema = PersonaEditableFieldsSchema.partial().strict();

// ===== CARGO SCHEMAS =====
// Schema base SOLO con campos editables (sin PKs)
// PKs (id_cargo, periodo) vienen de params, NO de body
const CargoEditableFieldsSchema = z.object({
  codigo_cargo: z.string().max(100).nullable().optional(),
  estado_cargo: z.string().max(50).nullable().optional(),
});

// Schema para CREATE: todos los campos opcionales + strict (rechaza campos extra)
const CargoCreateSchema = CargoEditableFieldsSchema.strict();

// Schema para UPDATE: todos los campos opcionales + strict (rechaza campos extra)
// NO permite modificar PKs (id_cargo, periodo)
const CargoUpdateSchema = CargoEditableFieldsSchema.partial().strict();

// ===== ROL SCHEMAS =====
// Schema base SOLO con campos editables (sin PKs)
// PKs (id_rol, periodo) vienen de params, NO de body
const RolEditableFieldsSchema = z.object({
  // FKs opcionales (relaciones)
  id_cargo: z.number().int().positive('ID cargo debe ser positivo').nullable().optional(),
  id_persona: z.number().int().positive('ID persona debe ser positivo').nullable().optional(),
  id_sigla: z.number().int().positive('ID sigla debe ser positivo').nullable().optional(),
  
  // Campos obligatorios
  codigo_reparticion: z.number().int('Código repartición debe ser entero'),
  descripcion_reparticion: z.string()
    .min(1, 'Descripción repartición es obligatoria')
    .max(255, 'Descripción repartición muy larga'),
  escalafon: z.string()
    .min(1, 'Escalafón es obligatorio')
    .max(100, 'Escalafón muy largo'),
  literal_codigo_registro: z.string()
    .min(1, 'Literal código registro es obligatorio')
    .max(255, 'Literal código registro muy largo'),
  situacion_revista: z.string()
    .min(1, 'Situación revista es obligatoria')
    .max(100, 'Situación revista muy larga'),
  literal_puesto: z.string()
    .min(1, 'Literal puesto es obligatorio')
    .max(255, 'Literal puesto muy largo'),
  unificador_puesto: z.string()
    .min(1, 'Unificador puesto es obligatorio')
    .max(255, 'Unificador puesto muy largo'),
  agrupador: z.string()
    .min(1, 'Agrupador es obligatorio')
    .max(255, 'Agrupador muy largo'),
  
  // Campos opcionales
  codigo_registro: z.string().max(100).nullable().optional(),
  j_categoria: z.string().max(50).nullable().optional(),
  jefaturas: z.string().max(255).nullable().optional(),
  escritorio: z.string().max(100).nullable().optional(),
  pou_desde: z.string().max(20).nullable().optional(),
  dia: z.string().max(20).nullable().optional(),
  fecha_bloqueo: z.string().max(20).nullable().optional(),
  bloqueo_motivo: z.string().max(255).nullable().optional(),
  bloqueo_comentario: z.string().max(500).nullable().optional(),
  cargo_desde: z.string().max(20).nullable().optional(),
  cargo_hasta: z.string().max(20).nullable().optional(),
  puesto: z.string().max(255).nullable().optional(),
  codigo_agrupamiento: z.string().max(100).nullable().optional(),
  literal_agrupamiento: z.string().max(255).nullable().optional(),
  doc_respaldatoria_j_categoria: z.string().max(500).nullable().optional(),
  j_comentario: z.string().max(500).nullable().optional(),
  comision_repa: z.string().max(100).nullable().optional(),
  descripcion_repa_comision: z.string().max(255).nullable().optional(),
  documentacion_alta: z.string().max(500).nullable().optional(),
  documentacion_baja: z.string().max(500).nullable().optional(),
  estado: z.string().max(50).nullable().optional(),
});

// Schema para CREATE: campos obligatorios + strict (rechaza campos extra)
const RolCreateSchema = RolEditableFieldsSchema.strict();

// Schema para UPDATE: todos los campos opcionales + strict (rechaza campos extra)
// NO permite modificar PKs (id_rol, periodo)
const RolUpdateSchema = RolEditableFieldsSchema.partial().strict();


const LoginSchema = z.object({
  email: z.string()
    .email('Email inválido')
    .trim()
    .toLowerCase(),
  password: z.string().min(1),
});

// ===== USER SCHEMAS =====
// Schema base SOLO con campos editables (sin PK)
// PK (id) viene de params, NO de body (auto-increment)
const UserEditableFieldsSchema = z.object({
  username: z.string()
    .min(3, 'Username debe tener al menos 3 caracteres')
    .max(50, 'Username muy largo')
    .trim(),
  email: z.string()
    .email('Email inválido')
    .max(255)
    .trim()
    .toLowerCase()
    .nullable()
    .optional(),
  password: z.string()
    .min(4, 'Password debe tener al menos 4 caracteres')
    .max(255),
  role: z.enum(['admin', 'editor', 'viewer', 'director', 'gerencia', 'concursales'], {
    errorMap: () => ({ message: 'Role inválido' })
  }).optional(),
  is_active: z.boolean().optional(),
  hospital_code: z.string().max(20).nullable().optional(),
  role_alias: z.string().max(50).nullable().optional(),
});

// Schema para CREATE: username, password obligatorios + strict (rechaza campos extra)
const UserCreateSchema = UserEditableFieldsSchema.strict();

// Schema para UPDATE: todos los campos opcionales + strict (rechaza campos extra)
// NO permite modificar PK (id)
const UserUpdateSchema = UserEditableFieldsSchema.partial().strict();

// ===== RECORRIDA SCHEMAS =====
// Schema base SOLO con campos editables (sin PK ni timestamps)
// PK (id) y timestamps (created_at, updated_at) se generan automáticamente
const RecorridaEditableFieldsSchema = z.object({
  hospital_code: z.string()
    .min(1, 'Código de hospital es obligatorio')
    .max(20, 'Código de hospital muy largo'),
  titulo: z.string()
    .min(1, 'Título es obligatorio')
    .max(500, 'Título muy largo'),
  contenido_html: z.string()
    .min(1, 'Contenido es obligatorio')
    .max(100000, 'Contenido excede límite de 100KB') // Límite de seguridad
});

// Schema para CREATE: campos obligatorios + strict (rechaza campos extra)
const RecorridaCreateSchema = RecorridaEditableFieldsSchema.strict();

// Schema para UPDATE: todos los campos opcionales + strict (rechaza campos extra)
// NO permite modificar PK (id) ni user_id (solo el creador queda registrado)
const RecorridaUpdateSchema = RecorridaEditableFieldsSchema.partial().strict();

// ===== MINUTA SCHEMAS =====
// Schema para validar estructura de columnas
const MinutaColumnSchema = z.object({
  id: z.string()
    .min(1, 'ID de columna es obligatorio'),
  name: z.string()
    .min(1, 'Nombre de columna es obligatorio')
    .max(500, 'Nombre de columna muy largo'),
  type: z.enum(['text', 'number', 'date', 'select'], {
    errorMap: () => ({ message: 'Tipo de columna inválido' })
  }),
  options: z.array(z.string())
    .optional()
});

// Schema para validar datos_tabla completo
const MinutaDatosTablaSchema = z.object({
  columns: z.array(MinutaColumnSchema)
    .min(1, 'Debe haber al menos una columna'),
  rows: z.array(z.record(z.any()))
    .default([])
});

// Schema base SOLO con campos editables (sin PK ni timestamps)
// PK (id) y timestamps (created_at, updated_at) se generan automáticamente
const MinutaEditableFieldsSchema = z.object({
  hospital_code: z.string()
    .min(1, 'Código de hospital es obligatorio')
    .max(20, 'Código de hospital muy largo'),
  titulo: z.string()
    .min(1, 'Título es obligatorio')
    .max(200, 'Título muy largo'),
  datos_tabla: MinutaDatosTablaSchema
});

// Schema para CREATE: campos obligatorios + strict (rechaza campos extra)
const MinutaCreateSchema = MinutaEditableFieldsSchema.strict();

// Schema para UPDATE: todos los campos opcionales + strict (rechaza campos extra)
// NO permite modificar PK (id) ni user_id (solo el creador queda registrado)
const MinutaUpdateSchema = MinutaEditableFieldsSchema.partial().strict();

// ===== EXPORTS CONSOLIDADOS =====
module.exports = { 
  SiglaCreateSchema,
  SiglaUpdateSchema,
  PersonaCreateSchema,
  PersonaUpdateSchema,
  CargoCreateSchema,
  CargoUpdateSchema,
  RolCreateSchema,
  RolUpdateSchema,
  LoginSchema,
  UserCreateSchema,
  UserUpdateSchema,
  RecorridaCreateSchema,
  RecorridaUpdateSchema,
  MinutaCreateSchema,
  MinutaUpdateSchema
};
