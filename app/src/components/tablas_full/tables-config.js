// ============================================================================
// CONFIGURACIÓN CENTRALIZADA DE TABLAS FULL
// ============================================================================
// Este archivo define la estructura de todas las tablas del sistema
// IMPORTANTE: NO importamos entidades TypeORM aquí para evitar conflictos
// con Babel al bundlear para AdminJS. Las entidades se manejan en el backend.
// ============================================================================

// Tipos de filtros disponibles
const FILTER_TYPES = {
  TEXT: 'text',           // Input de texto simple
  NUMBER: 'number',       // Input numérico
  NUMBER_RANGE: 'number_range', // Rango de números (min-max)
  DATE: 'date',           // Input de fecha
  DATE_RANGE: 'date_range', // Rango de fechas (desde-hasta)
  MULTI_SELECT: 'multi_select', // Dropdown multi-selección
  BOOLEAN: 'boolean',     // Checkbox o select si/no
  LIKE: 'like'           // Búsqueda con LIKE %value%
}

// ============================================================================
// DEFINICIÓN DE TABLAS
// ============================================================================

const TABLES_CONFIG = {
  // =========== PERSONAS ===========
  personas: {
    key: 'personas',
    entityName: 'Persona',
    alias: 'p',
    label: 'Personas',
    description: 'Vista completa de personas',
    pageName: 'PersonasFull',
    exportRoute: '/admin/export/personas.xlsx',
    defaultSort: { column: 'id_persona', direction: 'ASC' },
    defaultPerPage: 50,
    
    // Columnas excluidas de la visualización
    excludeColumns: [],
    
    // Configuración de filtros
    filters: [
      // Periodo primero
      { field: 'periodo', label: 'Periodo', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // IDs y códigos
      { field: 'id_persona', label: 'ID Persona', type: FILTER_TYPES.TEXT, placeholder: 'Ej: 12345' },
      { field: 'codigo_persona', label: 'Código Persona', type: FILTER_TYPES.LIKE, placeholder: 'Buscar código' },
      { field: 'cuil', label: 'CUIL', type: FILTER_TYPES.LIKE, placeholder: 'Buscar CUIL' },
      { field: 'cuil_rol', label: 'CUIL Rol', type: FILTER_TYPES.LIKE, placeholder: 'Buscar CUIL Rol' },
      
      // Datos personales
      { field: 'nombre', label: 'Nombre', type: FILTER_TYPES.LIKE, placeholder: 'Buscar nombre', dbField: 'nombre_apellido' },
      { field: 'numero_doc', label: 'Número Documento', type: FILTER_TYPES.LIKE, placeholder: 'Buscar documento' },
      { field: 'tipo_doc', label: 'Tipo Documento', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'sexo', label: 'Sexo', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // Contexto laboral
      { field: 'especialidad', label: 'Especialidad', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true },
      { field: 'localidad', label: 'Localidad', type: FILTER_TYPES.LIKE, placeholder: 'Buscar localidad', fullWidth: true },
      
      // Contacto
      { field: 'telefono', label: 'Teléfono', type: FILTER_TYPES.LIKE, placeholder: 'Buscar teléfono', section: 'Contacto' },
      { field: 'mail_personal', label: 'Mail Personal', type: FILTER_TYPES.LIKE, placeholder: 'Buscar mail' },
      { field: 'domicilio', label: 'Domicilio', type: FILTER_TYPES.LIKE, placeholder: 'Buscar domicilio' },
      
      // Rangos numéricos
      { field: 'antiguedad', label: 'Antigüedad', type: FILTER_TYPES.NUMBER_RANGE, section: 'Rangos' },
      { field: 'edad', label: 'Edad', type: FILTER_TYPES.NUMBER_RANGE },
      
      // Rangos de fechas
      { field: 'fecha_nacimiento', label: 'Fecha Nacimiento', type: FILTER_TYPES.DATE_RANGE, section: 'Fechas' }
    ]
  },

  // =========== CARGOS ===========
  cargos: {
    key: 'cargos',
    entityName: 'Cargo',
    alias: 'c',
    label: 'Cargos',
    description: 'Vista completa de cargos',
    pageName: 'CargosFull',
    exportRoute: '/admin/export/cargos.xlsx',
    defaultSort: { column: 'id_cargo', direction: 'ASC' },
    defaultPerPage: 50,
    
    excludeColumns: [],
    
    filters: [
      { field: 'periodo', label: 'Periodo', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'id_cargo', label: 'ID Cargo', type: FILTER_TYPES.TEXT, placeholder: 'Ej: 12345' },
      { field: 'codigo_cargo', label: 'Código Cargo', type: FILTER_TYPES.LIKE, placeholder: 'Buscar código' },
      { field: 'estado_cargo', label: 'Estado Cargo', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true }
    ]
  },

  // =========== ROLES ===========
  roles: {
    key: 'roles',
    entityName: 'Rol',
    alias: 'r',
    label: 'Roles',
    description: 'Vista completa de roles',
    pageName: 'RolesFull',
    exportRoute: '/admin/export/roles.xlsx',
    defaultSort: { column: 'id_rol', direction: 'ASC' },
    defaultPerPage: 50,
    
    excludeColumns: [],
    
    filters: [
      // Periodo primero
      { field: 'periodo', label: 'Periodo', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // IDs básicos
      { field: 'id_rol', label: 'ID Rol', type: FILTER_TYPES.TEXT, placeholder: 'Ej: 12345' },
      { field: 'codigo_rol', label: 'Código Rol', type: FILTER_TYPES.LIKE, placeholder: 'Buscar código' },
      
      // Clasificación
      { field: 'codigo_reparticion', label: 'Código Repartición', type: FILTER_TYPES.LIKE, placeholder: 'Buscar repartición' },
      { field: 'escalafon', label: 'Escalafón', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'codigo_registro', label: 'Código Registro', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'literal_codigo_registro', label: 'Literal Código Registro', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true },
      
      // Puesto
      { field: 'situacion_revista', label: 'Situación Revista', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'literal_puesto', label: 'Literal Puesto', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true },
      { field: 'unificador_puesto', label: 'Unificador Puesto', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true },
      { field: 'agrupador', label: 'Agrupador', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // Jefaturas
      { field: 'j_categoria', label: 'J Categoría', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'jefaturas', label: 'Jefaturas', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // Estado y bloqueo
      { field: 'dia', label: 'Día', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'bloqueo_motivo', label: 'Bloqueo Motivo', type: FILTER_TYPES.LIKE, placeholder: 'Buscar motivo' },
      { field: 'estado', label: 'Estado', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // Agrupamiento
      { field: 'codigo_agrupamiento', label: 'Código Agrupamiento', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'literal_agrupamiento', label: 'Literal Agrupamiento', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true }
    ]
  },

  // =========== SIGLAS ===========
  siglas: {
    key: 'siglas',
    entityName: 'Sigla',
    alias: 's',
    label: 'Siglas',
    description: 'Vista completa de siglas',
    pageName: 'SiglasFull',
    exportRoute: '/admin/export/siglas.xlsx',
    defaultSort: { column: 'id_sigla', direction: 'ASC' },
    defaultPerPage: 50,
    
    excludeColumns: [],
    
    filters: [
      { field: 'id_sigla', label: 'ID Sigla', type: FILTER_TYPES.TEXT, placeholder: 'Ej: 12345' },
      { field: 'sigla', label: 'Sigla', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'universo_totalizador', label: 'Universo Totalizador', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'tipo_hospital_sigla', label: 'Tipo Hospital', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'monovalencia', label: 'Monovalencia', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true }
    ]
  },

  // =========== BAJAS ===========
  bajas: {
    key: 'bajas',
    entityName: 'BajaConcurso',
    alias: 'b',
    label: 'Bajas y Concursos',
    description: 'Vista completa de bajas y concursos',
    pageName: 'BajasFull',
    exportRoute: '/admin/export/bajas.xlsx',
    defaultSort: { column: 'id_baja', direction: 'ASC' },
    defaultPerPage: 50,
    
    excludeColumns: [],
    
    filters: [
      // Periodo primero
      { field: 'periodo', label: 'Periodo', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // IDs y códigos
      { field: 'id_baja', label: 'ID Baja', type: FILTER_TYPES.TEXT, placeholder: 'Ej: 12345' },
      { field: 'sigla', label: 'Sigla', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      { field: 'motivo_baja', label: 'Motivo Baja', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true },
      
      // Campos full-width
      { field: 'puesto_baja', label: 'Puesto Baja', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true },
      { field: 'especialidad_baja', label: 'Especialidad Baja', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true },
      { field: 'unificador_puestos', label: 'Unificador Puestos', type: FILTER_TYPES.MULTI_SELECT, fetchDistinct: true, fullWidth: true },
      { field: 'fecha_baja', label: 'Fecha Baja', type: FILTER_TYPES.DATE_RANGE, fullWidth: true }
    ]
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene la configuración de una tabla por su key
 */
function getTableConfig(tableKey) {
  return TABLES_CONFIG[tableKey]
}

/**
 * Retorna todas las keys de tablas disponibles
 */
function getAllTableKeys() {
  return Object.keys(TABLES_CONFIG)
}

/**
 * Valida si una key de tabla existe
 */
function isValidTableKey(tableKey) {
  return tableKey in TABLES_CONFIG
}

/**
 * Obtiene filtros agrupados por sección
 */
function getFiltersBySection(tableKey) {
  const config = getTableConfig(tableKey)
  if (!config) return {}
  
  const grouped = { 'General': [] }
  
  config.filters.forEach(filter => {
    const section = filter.section || 'General'
    if (!grouped[section]) {
      grouped[section] = []
    }
    grouped[section].push(filter)
  })
  
  return grouped
}

/**
 * Genera formulario inicial vacío basado en filtros
 */
function generateInitialForm(tableKey) {
  const config = getTableConfig(tableKey)
  if (!config) return {}
  
  const form = {}
  
  config.filters.forEach(filter => {
    switch (filter.type) {
      case FILTER_TYPES.MULTI_SELECT:
        form[filter.field] = []
        break
      case FILTER_TYPES.NUMBER_RANGE:
        form[`${filter.field}Min`] = ''
        form[`${filter.field}Max`] = ''
        break
      case FILTER_TYPES.DATE_RANGE:
        form[`${filter.field}Desde`] = ''
        form[`${filter.field}Hasta`] = ''
        break
      default:
        form[filter.field] = ''
    }
  })
  
  return form
}

/**
 * Genera lista de campos que necesitan DISTINCT del backend
 */
function getDistinctFields(tableKey) {
  const config = getTableConfig(tableKey)
  if (!config) return []
  
  return config.filters
    .filter(f => f.fetchDistinct === true)
    .map(f => f.field)
}

module.exports = {
  TABLES_CONFIG,
  FILTER_TYPES,
  getTableConfig,
  getAllTableKeys,
  isValidTableKey,
  getFiltersBySection,
  generateInitialForm,
  getDistinctFields
}
